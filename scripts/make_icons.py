#!/usr/bin/env python3
"""生成 App 图标：柔和绿底 + 一棵圆冠小树（与应用内 SVG 树形呼应）。

产物：
- build/icon.png            1024×1024（Electron / electron-builder 用）
- build/icon-512.png        512×512
- assets/icon-foreground.png 1024×1024（安卓自适应图标前景：树居中留边）
- assets/icon-background.png 1024×1024（安卓自适应图标背景：纯渐变）
- assets/icon-only.png       1024×1024（@capacitor/assets 的单图输入，可选）
"""
import math
import os
from PIL import Image, ImageDraw

S = 1024
OUT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(OUT)


def vgrad(size, top, bottom):
    img = Image.new('RGB', (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img


def draw_tree(d, cx, ground_y, s, leaf=(46, 125, 50), leaf2=(67, 160, 71),
              leaf3=(102, 187, 106), trunk=(93, 64, 55)):
    """s 为尺度系数（1 ≈ 树高 560px）。"""
    # 树干 + 树枝
    tw = 34 * s
    d.rounded_rectangle([cx - tw / 2, ground_y - 190 * s, cx + tw / 2, ground_y + 6 * s],
                        radius=14 * s, fill=trunk)
    d.polygon([(cx - 8 * s, ground_y - 150 * s), (cx - 95 * s, ground_y - 235 * s),
               (cx - 75 * s, ground_y - 248 * s), (cx + 6 * s, ground_y - 175 * s)], fill=trunk)
    d.polygon([(cx + 8 * s, ground_y - 155 * s), (cx + 100 * s, ground_y - 240 * s),
               (cx + 80 * s, ground_y - 252 * s), (cx - 6 * s, ground_y - 180 * s)], fill=trunk)
    # 三层圆冠
    def blob(x, y, r, c):
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    blob(cx - 120 * s, ground_y - 235 * s, 105 * s, leaf)
    blob(cx + 120 * s, ground_y - 235 * s, 105 * s, leaf)
    blob(cx, ground_y - 330 * s, 140 * s, leaf2)
    blob(cx - 55 * s, ground_y - 285 * s, 80 * s, leaf3)
    blob(cx + 70 * s, ground_y - 270 * s, 65 * s, leaf3)
    # 果实点缀
    for dx, dy in [(-60, -320), (45, -360), (10, -255), (-130, -225), (120, -215)]:
        r = 13 * s
        d.ellipse([cx + dx * s - r, ground_y + dy * s - r,
                   cx + dx * s + r, ground_y + dy * s + r], fill=(255, 183, 77))
    # 树下草地
    d.ellipse([cx - 175 * s, ground_y - 14 * s, cx + 175 * s, ground_y + 26 * s],
              fill=(27, 94, 32))


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def main():
    top, bottom = (200, 230, 201), (129, 199, 132)  # 浅绿渐变天空
    base = vgrad(S, top, bottom).convert('RGBA')
    d = ImageDraw.Draw(base)
    # 太阳
    d.ellipse([S * 0.70, S * 0.10, S * 0.70 + 110, S * 0.10 + 110], fill=(255, 213, 79, 255))
    draw_tree(d, S // 2, int(S * 0.80), 1.05)

    full = base.copy()
    full.putalpha(rounded_mask(S, int(S * 0.22)))
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    full.save(os.path.join(ROOT, 'build', 'icon.png'))
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icon-512.png'))

    # 安卓自适应图标：背景（全幅渐变）/ 前景（树缩小居中，四周留安全区）
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    bg = vgrad(S, top, bottom)
    bg.save(os.path.join(ROOT, 'assets', 'icon-background.png'))
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    df = ImageDraw.Draw(fg)
    draw_tree(df, S // 2, int(S * 0.74), 0.78)
    fg.save(os.path.join(ROOT, 'assets', 'icon-foreground.png'))
    base.save(os.path.join(ROOT, 'assets', 'icon-only.png'))
    print('icons written')


if __name__ == '__main__':
    main()
