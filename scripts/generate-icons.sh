#!/bin/bash
# 图标生成脚本 - 用于 Unix/macOS 系统

ICONS_DIR="src-tauri/icons"
SOURCE_ICON="$ICONS_DIR/icon.png"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "错误：找不到源图标文件 $SOURCE_ICON"
    echo "请将新的图标文件命名为 icon.png 并放入 src-tauri/icons/ 目录"
    exit 1
fi

echo "正在生成图标..."
echo "源文件: $SOURCE_ICON"

# 生成不同尺寸的图标
magick "$SOURCE_ICON" -resize 32x32 "$ICONS_DIR/32x32.png"
magick "$SOURCE_ICON" -resize 128x128 "$ICONS_DIR/128x128.png"
magick "$SOURCE_ICON" -resize 256x256 "$ICONS_DIR/128x128@2x.png"

# 生成 .ico 文件
magick "$SOURCE_ICON" -define icon:auto-resize=256,128,64,48,32,16 "$ICONS_DIR/icon.ico"

# 生成 .icns 文件
ICNS_DIR="$ICONS_DIR/icon.iconset"
mkdir -p "$ICNS_DIR"

magick "$SOURCE_ICON" -resize 16x16 "$ICNS_DIR/icon_16x16.png"
magick "$SOURCE_ICON" -resize 32x32 "$ICNS_DIR/icon_16x16@2x.png"
magick "$SOURCE_ICON" -resize 32x32 "$ICNS_DIR/icon_32x32.png"
magick "$SOURCE_ICON" -resize 64x64 "$ICNS_DIR/icon_32x32@2x.png"
magick "$SOURCE_ICON" -resize 128x128 "$ICNS_DIR/icon_128x128.png"
magick "$SOURCE_ICON" -resize 256x256 "$ICNS_DIR/icon_128x128@2x.png"
magick "$SOURCE_ICON" -resize 256x256 "$ICNS_DIR/icon_256x256.png"
magick "$SOURCE_ICON" -resize 512x512 "$ICNS_DIR/icon_256x256@2x.png"

iconutil -c icns "$ICNS_DIR" -o "$ICONS_DIR/icon.icns"
rm -rf "$ICNS_DIR"

echo "完成！图标已生成到 $ICONS_DIR/"