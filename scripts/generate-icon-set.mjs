/**
 * Rebuild the complete icon set from the single source of truth.
 *
 * Source : 最终图标.png  -> copied to icons/app-icon-source.png (ASCII path; see RULE.md §1.1)
 * Output : every icon consumed by Tauri / NSIS / WiX / Windows, plus the in-app sidebar icon.
 *
 * Format rules enforced here (RULE.md §1.4): real BMPs, self-consistent ICO offsets.
 *
 * Usage: node scripts/generate-icon-set.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS = join(ROOT, 'src-tauri/icons')
const SRC = join(ICONS, 'app-icon-source.png')

mkdirSync(ICONS, { recursive: true })

const png = (size) =>
  sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 95 })

const meta = await sharp(SRC).metadata()
console.log(`source: ${meta.width}x${meta.height} alpha=${meta.hasAlpha ? 'yes' : 'no'}`)

// ---- 1. Plain PNG sizes -------------------------------------------------
const PNG_TARGETS = [
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_64x64.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
]
for (const [name, size] of PNG_TARGETS) {
  const buf = await png(size).toBuffer()
  writeFileSync(join(ICONS, name), buf)
  console.log(`  ${name.padEnd(24)} ${size}x${size}`.padEnd(46) + `${(buf.length / 1024).toFixed(1)} KB`)
}

// ---- 2. Tray / titlebar (alpha preserved, RULE.md §1.3) -----------------
for (const name of ['icon.png', 'icon-light.png']) {
  const buf = await png(512).toBuffer()
  writeFileSync(join(ICONS, name), buf)
  console.log(`  ${name.padEnd(24)} 512x512`.padEnd(46) + `${(buf.length / 1024).toFixed(1)} KB`)
}

// ---- 3. In-app sidebar icon (28 CSS px @3x) -----------------------------
mkdirSync(join(ROOT, 'src/assets'), { recursive: true })
const sidebar = await png(84).toBuffer()
writeFileSync(join(ROOT, 'src/assets/app-icon-84.png'), sidebar)
console.log(`  ${'src/assets/app-icon-84.png'.padEnd(24)} 84x84`.padEnd(46) + `${(sidebar.length / 1024).toFixed(1)} KB`)

// ---- 4. Installer art (real BMP — NSIS/WiX parse by extension) ----------
// sharp 0.35 on this libvips build has no BMP *encoder*; reuse bmp-ts (already
// present via icojs). BMP stores rows bottom-up, so the RGBA must be flipped.
const { encode } = await import('bmp-ts')

const BMP_TARGETS = [
  ['installer-banner-blank.bmp', 493, 58], // WiX top banner
  ['installer-dialog.bmp', 493, 312], // WiX dialog side image
  ['installer-sidebar.bmp', 164, 314], // NSIS sidebar
]
for (const [name, w, h] of BMP_TARGETS) {
  const { data, info } = await png(Math.max(w, h))
    .resize(w, h, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (info.width !== w || info.height !== h || info.channels !== 4) {
    throw new Error(`${name}: unexpected buffer ${info.width}x${info.height}x${info.channels}`)
  }

  // bmp-ts consumes RGBA in top-down order and performs the BMP bottom-up flip itself.
  // encode() writes the complete BMP into `.data`; `.buffer` is the input pixel array.
  const buf = encode({ data, width: w, height: h, bitPP: 32 }).data
  writeFileSync(join(ICONS, name), buf)
  const ok = buf[0] === 0x42 && buf[1] === 0x4d
  console.log(`  ${name.padEnd(24)} ${w}x${h} BMP=${ok ? 'OK' : 'BAD'}`.padEnd(46) + `${(buf.length / 1024).toFixed(1)} KB`)
}

// ---- 5. ICO (self-consistent directory, RULE.md §1.4) ------------------
async function buildIco(sizes, outName) {
  const images = []
  // Windows' resource compiler rejects palette (indexed) PNG inside an ICO,
  // so emit true-colour RGBA here regardless of the shared png() preset.
  for (const s of sizes) {
    images.push({ size: s, buf: await png(s).png({ compressionLevel: 9, palette: false }).toBuffer() })
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(images.length, 4)

  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach((img, i) => {
    const o = i * 16
    dir[o] = img.size >= 256 ? 0 : img.size
    dir[o + 1] = img.size >= 256 ? 0 : img.size
    dir[o + 2] = 0 // palette
    dir[o + 3] = 0 // reserved
    dir.writeUInt16LE(1, o + 4) // color planes
    dir.writeUInt16LE(32, o + 6) // bpp
    dir.writeUInt32LE(img.buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += img.buf.length
  })

  const out = Buffer.concat([header, dir, ...images.map((i) => i.buf)])
  writeFileSync(join(ICONS, outName), out)
  console.log(`  ${outName.padEnd(24)} ${sizes.join('/')} ICO=OK`.padEnd(46) + `${(out.length / 1024).toFixed(1)} KB`)
}

await buildIco([16, 32, 48, 64, 128, 256], 'icon.ico')
await buildIco([16, 32, 48, 64, 128], 'installer-icon.ico')

// ---- 6. ICNS (macOS) ---------------------------------------------------
const icnsEntries = [
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512],
]
const parts = []
for (const [type, size] of icnsEntries) {
  const data = await png(size).png({ compressionLevel: 9, palette: false }).toBuffer()
  const head = Buffer.alloc(8)
  head.write(type, 0, 4, 'ascii')
  head.writeUInt32BE(data.length + 8, 4)
  parts.push(Buffer.concat([head, data]))
}
const icns = Buffer.concat([Buffer.from('icns', 'ascii'), Buffer.alloc(4), ...parts])
writeFileSync(join(ICONS, 'icon.icns'), icns)
console.log(`  ${'icon.icns'.padEnd(24)} ${icnsEntries.length} types ICNS=OK`.padEnd(46) + `${(icns.length / 1024).toFixed(1)} KB`)

console.log('\nIcon set rebuilt from app-icon-source.png')
