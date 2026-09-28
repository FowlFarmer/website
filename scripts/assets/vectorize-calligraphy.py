# Trace public/site/calligraphy_logo.png into one vector glyph per character.
# Every coordinate stays in the PNG's own 309x194 pixel space, so a glyph drawn
# at its recorded box lands exactly where the raster character sat.
# Usage: python3 scripts/assets/vectorize-calligraphy.py   (needs potrace, Pillow, scipy)
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/site/calligraphy_logo.png'
SVG_DIR = ROOT / 'public/site/calligraphy'
DATA_OUT = ROOT / 'src/data/calligraphy.js'

# Lanczos upsampling turns the antialiased alpha edge into a sub-pixel contour.
SCALE = 8
PAD = 1  # px of breathing room around each glyph box, in source pixels

GLYPHS = [
    {'id': 'zhu', 'char': '朱', 'pinyin': 'Zhū', 'meaning': ['vermillion', 'prosperity'],
     'syllables': [['vermi', 'llion'], ['prosp', 'erity']]},
    {'id': 'jia', 'char': '加', 'pinyin': 'Jiā', 'meaning': ['plus', 'ultra'], 'syllables': [['plus'], ['ultra']]},
    {'id': 'yu', 'char': '宇', 'pinyin': 'Yǔ', 'meaning': ['universe'], 'syllables': [['uni', 'ver', 'se']]},
]
# Glyphs are separated by clear vertical gutters in the source image.
SPLITS = [109.25, 209]

NUMBER = re.compile(r'[A-Za-z]|-?\d*\.?\d+')


def trace(mask):
    """Run potrace on a boolean mask; return path data in source pixels."""
    h, w = mask.shape
    pbm = b'P4\n%d %d\n' % (w, h) + np.packbits(mask, axis=1).tobytes()
    svg = subprocess.run(
        ['potrace', '-b', 'svg', '-t', '4', '-a', '1.0', '-O', '0.1', '-o', '-'],
        input=pbm, capture_output=True, check=True,
    ).stdout.decode()
    tx, ty, sx, sy = map(float, re.search(
        r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', svg).groups())
    out = []
    for d in re.findall(r' d="([^"]+)"', svg):
        tokens, cmd, i = NUMBER.findall(d), None, 0
        while i < len(tokens):
            if tokens[i].isalpha():
                cmd = tokens[i]
                out.append(cmd)
                i += 1
                continue
            x, y = float(tokens[i]), float(tokens[i + 1])
            if cmd.isupper():
                x, y = tx + sx * x, ty + sy * y
            else:
                x, y = sx * x, sy * y
            out.append(f'{x / SCALE:.2f},{y / SCALE:.2f}'.replace('.00', '').replace('-0,', '0,'))
            i += 2
    return ' '.join(out)


def rasterize(d, w, h, scale):
    """Even-odd fill of absolute/relative M/L/C/Z path data, for verification."""
    img = np.zeros((h * scale, w * scale), bool)
    tokens = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d)
    rings, ring, pos, start, cmd, i = [], [], (0.0, 0.0), (0.0, 0.0), None, 0

    def num():
        nonlocal i
        i += 1
        return float(tokens[i - 1])

    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd in 'zZ':
                rings.append(ring)
                ring, pos = [], start
            continue
        rel = cmd.islower()
        base = pos if rel else (0.0, 0.0)
        if cmd in 'mM':
            if ring:
                rings.append(ring)
            pos = (base[0] + num(), base[1] + num())
            start, ring = pos, [pos]
            cmd = 'l' if rel else 'L'
        elif cmd in 'lL':
            pos = (base[0] + num(), base[1] + num())
            ring.append(pos)
        elif cmd in 'cC':
            p1 = (base[0] + num(), base[1] + num())
            p2 = (base[0] + num(), base[1] + num())
            p3 = (base[0] + num(), base[1] + num())
            p0 = pos
            for t in np.linspace(0, 1, 24)[1:]:
                u = 1 - t
                ring.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                             u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
            pos = p3
    for r in rings:
        layer = Image.new('1', (w * scale, h * scale))
        ImageDraw.Draw(layer).polygon([(x * scale, y * scale) for x, y in r], fill=1)
        img ^= np.array(layer)
    return img


def main():
    alpha = Image.open(SOURCE).getchannel('A')
    w, h = alpha.size
    big = np.array(alpha.resize((w * SCALE, h * SCALE), Image.LANCZOS)) >= 128
    labels, _ = ndimage.label(big, structure=np.ones((3, 3)))

    SVG_DIR.mkdir(parents=True, exist_ok=True)
    glyphs, report = [], []
    for g_index, glyph in enumerate(GLYPHS):
        lo = SPLITS[g_index - 1] if g_index else 0
        hi = SPLITS[g_index] if g_index < len(SPLITS) else w
        parts, mask_all = [], np.zeros_like(big)
        for index, sl in enumerate(ndimage.find_objects(labels), 1):
            cx = (sl[1].start + sl[1].stop) / 2 / SCALE
            if not lo <= cx < hi:
                continue
            mask = labels == index
            mask_all |= mask
            parts.append((sl[0].start, sl[1].start, trace(mask)))
        parts.sort()  # top-to-bottom, roughly stroke order
        ys, xs = np.nonzero(mask_all)
        box = {
            'x': max(0, int(np.floor(xs.min() / SCALE)) - PAD),
            'y': max(0, int(np.floor(ys.min() / SCALE)) - PAD),
        }
        box['width'] = min(w, int(np.ceil((xs.max() + 1) / SCALE)) + PAD) - box['x']
        box['height'] = min(h, int(np.ceil((ys.max() + 1) / SCALE)) + PAD) - box['y']
        paths = [d for *_, d in parts]
        glyphs.append({**glyph, 'box': box, 'paths': paths})

        drawn = np.zeros_like(big)
        for d in paths:
            drawn |= rasterize(d, w, h, SCALE)
        iou = (drawn & mask_all).sum() / (drawn | mask_all).sum()
        report.append(f"{glyph['id']}: {len(paths)} shape(s), box {box}, IoU vs 8x source mask {iou:.4f}")

        view = f"{box['x']} {box['y']} {box['width']} {box['height']}"
        body = ''.join(f'\n  <path d="{d}"/>' for d in paths)
        (SVG_DIR / f"{glyph['id']}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" '
            f'width="{box["width"]}" height="{box["height"]}" fill="#000">'
            f'<title>{glyph["char"]}</title>{body}\n</svg>\n')

    groups = ''.join(
        f'\n  <g id="{g["id"]}">' + ''.join(f'\n    <path d="{d}"/>' for d in g['paths']) + '\n  </g>'
        for g in glyphs)
    (SVG_DIR / 'name.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
        f'fill="#000"><title>朱加宇</title>{groups}\n</svg>\n')

    DATA_OUT.write_text(
        '// Generated by scripts/assets/vectorize-calligraphy.py from public/site/calligraphy_logo.png.\n'
        '// Paths use the PNG\'s pixel space; box is each glyph\'s offset and size within it.\n'
        f'export const calligraphyViewBox = {json.dumps({"width": w, "height": h})};\n\n'
        f'export const calligraphyGlyphs = {json.dumps(glyphs, ensure_ascii=False, indent=2)};\n')
    print('\n'.join(report))


if __name__ == '__main__':
    main()
