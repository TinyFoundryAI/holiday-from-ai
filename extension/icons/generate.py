#!/usr/bin/env python3
"""Generate Holiday from AI icon PNGs at 16/48/128px.

Strategy: render Apple Color Emoji 🌱, extract its alpha silhouette, fill that
silhouette with off-white, and composite onto a deep-moss rounded square. This
gives us the *exact* sprout shape used by the system emoji, in the extension's
color scheme.

Apple Color Emoji is a bitmap font; only a fixed set of sizes renders. We
render at 160 (its largest baked size), then downscale with LANCZOS for the
16/48/128 targets.

Re-run this script to regenerate.
"""
from PIL import Image, ImageDraw, ImageFont
import os

EMOJI_FONT = '/System/Library/Fonts/Apple Color Emoji.ttc'
EMOJI_SIZE = 160
SPROUT = '🌱'

BG = (45, 90, 61, 255)       # deep moss green
LEAF = (245, 247, 240, 255)  # off-white

HERE = os.path.dirname(os.path.abspath(__file__))


def render_sprout_mask():
    """Render 🌱 and return an RGBA image where the sprout silhouette is
    filled with LEAF color and the surround is transparent."""
    font = ImageFont.truetype(EMOJI_FONT, size=EMOJI_SIZE)
    raw = Image.new('RGBA', (EMOJI_SIZE, EMOJI_SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(raw)
    d.text((0, 0), SPROUT, font=font, embedded_color=True)

    # Crop to the non-transparent bbox so the sprout can be re-centered.
    bbox = raw.getbbox()
    cropped = raw.crop(bbox)

    # Use the alpha channel as the silhouette mask.
    alpha = cropped.split()[3]
    filled = Image.new('RGBA', cropped.size, LEAF)
    filled.putalpha(alpha)
    return filled


def compose_icon(size, sprout_fill):
    scale = 4
    s = size * scale
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)

    # Rounded-square background.
    radius = int(s * 0.22)
    d.rounded_rectangle([(0, 0), (s - 1, s - 1)], radius=radius, fill=BG)

    # Scale the sprout silhouette to fill ~76% of the icon, then center it.
    target = int(s * 0.76)
    sw, sh = sprout_fill.size
    ratio = min(target / sw, target / sh)
    new_w, new_h = int(sw * ratio), int(sh * ratio)
    sprout_resized = sprout_fill.resize((new_w, new_h), Image.LANCZOS)

    ox = (s - new_w) // 2
    oy = (s - new_h) // 2
    canvas.alpha_composite(sprout_resized, (ox, oy))

    return canvas.resize((size, size), Image.LANCZOS)


def main():
    sprout_fill = render_sprout_mask()
    for size in (16, 48, 128):
        icon = compose_icon(size, sprout_fill)
        path = os.path.join(HERE, f'icon-{size}.png')
        icon.save(path, 'PNG', optimize=True)
        print(f'wrote {path} ({size}x{size})')


if __name__ == '__main__':
    main()
