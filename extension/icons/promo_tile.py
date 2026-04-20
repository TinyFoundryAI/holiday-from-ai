#!/usr/bin/env python3
"""Generate the 440x280 Chrome Web Store promo tile.

Layout: large sprout silhouette on the left, text block on the right,
against a moss-green rounded rectangle. Re-run to regenerate.
"""
from PIL import Image, ImageDraw, ImageFont
import os

EMOJI_FONT = '/System/Library/Fonts/Apple Color Emoji.ttc'
EMOJI_SIZE = 160

BG = (45, 90, 61, 255)
LEAF = (245, 247, 240, 255)
TITLE = (245, 247, 240)
SUB = (200, 215, 195)

W, H = 440, 280
HERE = os.path.dirname(os.path.abspath(__file__))


def sprout_silhouette():
    font = ImageFont.truetype(EMOJI_FONT, size=EMOJI_SIZE)
    raw = Image.new('RGBA', (EMOJI_SIZE, EMOJI_SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(raw)
    d.text((0, 0), '🌱', font=font, embedded_color=True)
    bbox = raw.getbbox()
    cropped = raw.crop(bbox)
    alpha = cropped.split()[3]
    filled = Image.new('RGBA', cropped.size, LEAF)
    filled.putalpha(alpha)
    return filled


def pick_title_font():
    # Try a few common macOS system fonts before falling back.
    candidates = [
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/Supplemental/HelveticaNeue.ttc',
        '/Library/Fonts/Arial.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    # Supersample 2x for crisp text.
    scale = 2
    s_w, s_h = W * scale, H * scale
    img = Image.new('RGBA', (s_w, s_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s_h * 0.08)
    d.rounded_rectangle([(0, 0), (s_w - 1, s_h - 1)], radius=radius, fill=BG)

    # Sprout on the left, vertically centered. Kept smaller to leave text room.
    sprout = sprout_silhouette()
    target_h = int(s_h * 0.52)
    ratio = target_h / sprout.height
    new_w = int(sprout.width * ratio)
    sprout_resized = sprout.resize((new_w, target_h), Image.LANCZOS)
    sx = int(s_w * 0.05)
    sy = (s_h - target_h) // 2
    img.alpha_composite(sprout_resized, (sx, sy))

    # Text block. Sized to fit "Holiday from AI" on one line in the remaining width.
    font_path = pick_title_font()
    title_size = int(s_h * 0.17)
    sub_size = int(s_h * 0.085)
    title_font = ImageFont.truetype(font_path, size=title_size) if font_path else ImageFont.load_default()
    sub_font = ImageFont.truetype(font_path, size=sub_size) if font_path else ImageFont.load_default()

    text_x = sx + new_w + int(s_w * 0.03)
    title_lines = ['Holiday', 'from AI']
    subtitle_lines = ['Gardening folklore', 'for LinkedIn.']

    title_line_h = title_size + int(title_size * 0.08)
    sub_line_h = sub_font.size + int(sub_font.size * 0.25)
    block_h = title_line_h * len(title_lines) + int(title_size * 0.35) + sub_line_h * len(subtitle_lines)
    ty = (s_h - block_h) // 2

    sy_cursor = ty
    for line in title_lines:
        d.text((text_x, sy_cursor), line, font=title_font, fill=TITLE)
        sy_cursor += title_line_h
    sy_cursor += int(title_size * 0.20)
    for line in subtitle_lines:
        d.text((text_x, sy_cursor), line, font=sub_font, fill=SUB)
        sy_cursor += sub_line_h

    # Downscale with antialias.
    final = img.resize((W, H), Image.LANCZOS)
    out = os.path.join(HERE, 'promo-440x280.png')
    final.save(out, 'PNG', optimize=True)
    print(f'wrote {out} ({W}x{H})')


if __name__ == '__main__':
    main()
