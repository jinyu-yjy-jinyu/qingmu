#!/usr/bin/env node
/**
 * 生成 Windows ICO 图标
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import icojs from 'icojs'

const ICONS_DIR = path.join(process.cwd(), 'src-tauri', 'icons')
const SOURCE_ICON = path.join(ICONS_DIR, 'icon.png')
const ICO_OUTPUT = path.join(ICONS_DIR, 'icon.ico')

console.log('正在生成 Windows ICO 图标...')

try {
  // 读取源图标并生成多个尺寸
  const sizes = [256, 128, 64, 48, 32, 16]
  const buffers = []

  for (const size of sizes) {
    const buffer = await sharp(SOURCE_ICON).resize(size, size, { fit: 'cover' }).png().toBuffer()
    buffers.push(buffer)
    console.log(`✓ 已生成 ${size}x${size} 尺寸`)
  }

  // 使用 icojs 创建 ICO 文件
  const icoBuffer = Buffer.from(await icojs.encodeIco(buffers))

  fs.writeFileSync(ICO_OUTPUT, icoBuffer)
  console.log(`✓ 已生成 ${ICO_OUTPUT}`)
} catch (e) {
  console.error('生成 ICO 失败:', e.message)
  process.exit(1)
}

console.log('\n完成！')
