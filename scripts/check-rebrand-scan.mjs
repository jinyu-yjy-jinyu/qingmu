#!/usr/bin/env node
/**
 * Check for leftover MarkerOn / markeron references after the AnnotPen rebrand.
 *
 * Usage:
 *   node scripts/check-rebrand-scan.mjs
 *
 * Scans the whole repo for `MarkerOn` / `markeron`, excluding build/generated
 * directories and the migration-archives (promo/, docs/superpowers/). Line-level
 * whitelist patterns cover intentional legacy references:
 *   - GitHub repo / release URLs (github.com/ifer47/markeron)
 *   - Official website (markeron.cn) and sponsor (afdian.com/a/markeron)
 *   - Microsoft Store package metadata (msstore, apps.microsoft.com)
 *   - Legacy storage keys / marker / config paths used for migration & uninstall
 *   - Package-manager channel manifests (winget, scoop, homebrew)
 *   - Legacy-key fixtures inside migration unit tests
 *
 * Exits 0 when clean, 1 (with a file:line list) when unflagged residue remains.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ignoreDirs = new Set(['node_modules', 'target', 'dist', '.git', '.codeartsdoer', 'release-output'])
const ignoreFiles = new Set([
  '.gitignore',
  'package.json',
  'package-lock.json',
  'src-tauri/Cargo.lock',
  '.github/FUNDING.yml',
  'docs/CNAME',
  'docs/robots.txt',
  'docs/sitemap.xml',
  'scripts/check-rebrand-scan.mjs',
])

const whitelistLine = [
  /github\.com\/ifer47\/markeron/,
  /ifer47\/markeron/,
  /markeron\.cn/,
  /afdian\.com\/a\/markeron/,
  /\.evil\.com\/a\/markeron/,
  /msstore|9N6623X973JV|apps\.microsoft|get\.microsoft\.com/,
  /markeron-lang/,
  /markeron-locale/,
  /markeron-toolbar/,
  /markeron\.portable/,
  /com\.markeron\.app/,
  /markeron\.json/,
  /markeron\.rb/,
  /scoop install markeron/,
  /bucket\/markeron/,
  /cask "markeron"/,
  /App name: `markeron`/,
  /⭐ MarkerOn 支持者/,
  /MarkerOn →/,
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (statSync(p).isDirectory()) {
      if (ignoreDirs.has(entry) || ignoreDirs.has(rel)) continue
      out.push(...walk(p))
    } else if (
      !ignoreFiles.has(rel) &&
      !rel.startsWith('promo/') &&
      !rel.startsWith('docs/superpowers/') &&
      !rel.startsWith('packaging/')
    ) {
      out.push(p)
    }
  }
  return out
}

let found = false
let scanned = 0
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (file.endsWith('.exe') || file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.jpg')) continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!/markeron|MarkerOn/i.test(content)) continue
  scanned += 1
  const lines = content.split(/\r?\n/)
  lines.forEach((line, i) => {
    if (!/markeron|MarkerOn/i.test(line)) return
    const ok = whitelistLine.some((re) => re.test(line))
    if (!ok) {
      found = true
      console.log(`${rel}:${i + 1}: ${line.trim().slice(0, 180)}`)
    }
  })
}

if (found) {
  console.error('\nRebrand scan failed: leftover MarkerOn/markeron references (see above).')
  process.exit(1)
}
console.log(`Rebrand scan OK — no unflagged MarkerOn/markeron references (checked ${scanned} files).`)
