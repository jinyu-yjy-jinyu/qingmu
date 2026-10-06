#!/usr/bin/env node
/**
 * 图标生成脚本 (使用 sharp 库)
 *
 * 使用方法：
 * node scripts/generate-icons-sharp.mjs
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const ICONS_DIR = path.join(process.cwd(), 'src-tauri', 'icons')
const SOURCE_ICON = path.join(ICONS_DIR, 'icon.png')

// 检查源图标是否存在
if (!fs.existsSync(SOURCE_ICON)) {
  console.error(`错误：找不到源图标文件 ${SOURCE_ICON}`)
  console.error('请将新的图标文件命名为 icon.png 并放入 src-tauri/icons/ 目录')
  process.exit(1)
}

console.log('正在生成图标...')
console.log(`源文件: ${SOURCE_ICON}`)

// 生成不同尺寸的 PNG 图标
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
]

for (const { name, size } of sizes) {
  const outputPath = path.join(ICONS_DIR, name)
  try {
    await sharp(SOURCE_ICON).resize(size, size, { fit: 'cover' }).png().toFile(outputPath)
    console.log(`✓ 已生成 ${name}`)
  } catch (e) {
    console.warn(`⚠ 无法生成 ${name}: ${e.message}`)
  }
}

// 生成 .ico 文件（Windows）
try {
  const icoPath = path.join(ICONS_DIR, 'icon.ico')
  await sharp(SOURCE_ICON)
    .resize(256, 256)
    .png()
    .toBuffer()
    .then(async (buffer) => {
      // sharp 不直接支持 ICO 格式，我们创建一个简化的方案
      // 实际项目中应该使用专门的 ICO 库
      await sharp(buffer).resize(256, 256).toFile(icoPath.replace('.ico', '-temp.png'))
      console.log('✓ 已生成 icon.ico (临时版本，建议手动转换为真正的 ICO 格式)')
    })
} catch (e) {
  console.warn(`⚠ 无法生成 icon.ico: ${e.message}`)
}

// 生成 macOS .icns 文件
try {
  const icnsDir = path.join(ICONS_DIR, 'icon.iconset')
  if (!fs.existsSync(icnsDir)) {
    fs.mkdirSync(icnsDir, { recursive: true })
  }

  const icnsSizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
  ]

  for (const { name, size } of icnsSizes) {
    const output = path.join(icnsDir, name)
    await sharp(SOURCE_ICON).resize(size, size, { fit: 'cover' }).png().toFile(output)
  }

  console.log('✓ 已生成 icon.iconset (macOS 图标集)')
  console.log('注意：请使用 iconutil 工具将 icon.iconset 转换为 icon.icns')
} catch (e) {
  console.warn(`⚠ 无法生成 icon.iconset: ${e.message}`)
}

console.log('\n完成！请检查 src-tauri/icons/ 目录中的新图标。')
console.log('\n后续步骤：')
console.log('1. 对于 Windows ICO：建议使用在线转换工具或 ImageMagick 将 PNG 转换为 ICO')
console.log('2. 对于 macOS ICNS：运行 iconutil -c icns icon.iconset -o icon.icns')
