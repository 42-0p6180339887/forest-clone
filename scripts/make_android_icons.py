#!/usr/bin/env python3
"""把 build/icon.png 与 assets/icon-foreground.png 生成安卓各密度启动图标。"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

LAUNCHER = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

full = Image.open(os.path.join(ROOT, 'build', 'icon.png')).convert('RGBA')
fg = Image.open(os.path.join(ROOT, 'assets', 'icon-foreground.png')).convert('RGBA')

# 圆形版
size = full.size[0]
mask = Image.new('L', (size, size), 0)
ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
round_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
round_icon.paste(full, (0, 0), mask)

for density, px in LAUNCHER.items():
    folder = os.path.join(RES, f'mipmap-{density}')
    full.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
    round_icon.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_round.png'))
    print('launcher', density, px)
for density, px in FOREGROUND.items():
    folder = os.path.join(RES, f'mipmap-{density}')
    fg.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))
    print('foreground', density, px)
print('android icons done')
