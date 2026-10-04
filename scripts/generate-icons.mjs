#!/usr/bin/env node
/**
 * 图标生成脚本 (ES Module 版本)
 *
 * 使用方法：
 * 1. 将新的图标文件放在 src-tauri/icons/ 目录下，命名为 icon.png
 * 2. 运行此脚本生成所有需要的图标尺寸
 *
 * 需要安装：ImageMagick (magick 命令)
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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

// 生成不同尺寸的图标
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
]

for (const { name, size } of sizes) {
  const outputPath = path.join(ICONS_DIR, name)
  try {
    execSync(`magick "${SOURCE_ICON}" -resize ${size}x${size} "${outputPath}"`)
    console.log(`✓ 已生成 ${name}`)
  } catch (e) {
    console.warn(`⚠ 无法生成 ${name}，请手动处理`)
  }
}

// 生成 .ico 文件（Windows）
try {
  const icoPath = path.join(ICONS_DIR, 'icon.ico')
  execSync(`magick "${SOURCE_ICON}" -define icon:auto-resize=256,128,64,48,32,16 "${icoPath}"`)
  console.log('✓ 已生成 icon.ico')
} catch (e) {
  console.warn('⚠ 无法生成 icon.ico，请手动处理')
}

// 生成 .icns 文件（macOS）
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
    execSync(`magick "${SOURCE_ICON}" -resize ${size}x${size} "${output}"`)
  }

  // 使用 iconutil 生成 icns
  const icnsPath = path.join(ICONS_DIR, 'icon.icns')
  execSync(`iconutil -c icns "${icnsDir}" -o "${icnsPath}"`)

  // 清理临时目录
  fs.rmSync(icnsDir, { recursive: true, force: true })

  console.log('✓ 已生成 icon.icns')
} catch (e) {
  console.warn('⚠ 无法生成 icon.icns，请手动处理')
}

console.log('\n完成！请检查 src-tauri/icons/ 目录中的新图标。')
