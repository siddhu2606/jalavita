from PIL import Image, ImageDraw
import math

BG = (7, 11, 18, 255)
TEAL = (47, 230, 198, 255)


def draw_mark(draw, cx, cy, ring_r, ring_w, needle_scale):
    draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=TEAL, width=ring_w)
    # needle: same proportions as the SVG path, scaled around (cx, cy)
    pts = [(110, 66), (96, 96), (82, 126), (96, 118), (110, 126), (96, 96)]
    # original path is defined relative to a 192-viewbox centered at (96,96)
    scaled = []
    for (x, y) in [(110, 66), (96, 96), (82, 126), (96, 118), (110, 126)]:
        dx = (x - 96) * needle_scale
        dy = (y - 96) * needle_scale
        scaled.append((cx + dx, cy + dy))
    draw.polygon(scaled, fill=TEAL)


def make_icon(size, rounded, maskable_padding=0.0):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        radius = int(size * 36 / 192)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG)
    else:
        draw.rectangle([0, 0, size, size], fill=BG)
    cx = cy = size / 2
    scale = (size / 192) * (1 - maskable_padding)
    draw_mark(draw, cx, cy, 70 * scale, max(2, round(6 * scale)), scale)
    return img


make_icon(512, rounded=True).save(r'C:\Users\Siddhesh\jalavita\android\icon-512.png')
make_icon(512, rounded=False, maskable_padding=0.22).save(r'C:\Users\Siddhesh\jalavita\android\icon-maskable-512.png')
print('done')
