#!/usr/bin/env python3
"""Generate Chrome Web Store promo tiles.

- Small tile: 440x280, sprout left + 2-line title + 2-line subtitle.
- Marquee tile: 1400x560, sprout left + 1-line title + 1-line subtitle.

Re-run to regenerate. Tiles are saved as 24-bit PNGs (no alpha) — Chrome's
listing UI requires either JPEG or 24-bit PNG.
"""
from PIL import Image, ImageDraw, ImageFont
import os

EMOJI_FONT = '/System/Library/Fonts/Apple Color Emoji.ttc'
EMOJI_SIZE = 160

BG = (45, 90, 61, 255)
LEAF = (245, 247, 240, 255)
TITLE = (245, 247, 240)
SUB = (200, 215, 195)

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


def render_tile(W, H, title_lines, subtitle_lines,
                sprout_h_ratio, title_size_ratio, sub_size_ratio,
                left_margin_ratio, gap_ratio, right_margin_ratio,
                radius_ratio, out_name):
    scale = 2
    s_w, s_h = W * scale, H * scale
    img = Image.new('RGBA', (s_w, s_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s_h * radius_ratio)
    d.rounded_rectangle([(0, 0), (s_w - 1, s_h - 1)], radius=radius, fill=BG)

    sprout = sprout_silhouette()
    target_h = int(s_h * sprout_h_ratio)
    ratio = target_h / sprout.height
    new_w = int(sprout.width * ratio)
    sprout_resized = sprout.resize((new_w, target_h), Image.LANCZOS)
    sx = int(s_w * left_margin_ratio)
    sy = (s_h - target_h) // 2
    img.alpha_composite(sprout_resized, (sx, sy))

    font_path = pick_title_font()
    title_size = int(s_h * title_size_ratio)
    sub_size = int(s_h * sub_size_ratio)
    title_font = ImageFont.truetype(font_path, size=title_size) if font_path else ImageFont.load_default()
    sub_font = ImageFont.truetype(font_path, size=sub_size) if font_path else ImageFont.load_default()

    text_x = sx + new_w + int(s_w * gap_ratio)

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

    final = img.resize((W, H), Image.LANCZOS)
    # Flatten to RGB (24-bit, no alpha) on the moss-green background. Chrome's
    # listing UI rejects PNGs with an alpha channel.
    flat = Image.new('RGB', final.size, BG[:3])
    flat.paste(final, mask=final.split()[3])
    out = os.path.join(HERE, out_name)
    flat.save(out, 'PNG', optimize=True)
    print(f'wrote {out} ({W}x{H})')


def main():
    # Small promo tile.
    render_tile(
        W=440, H=280,
        title_lines=['Holiday', 'from AI'],
        subtitle_lines=['Replace AI-FOMO-Linkedin', 'with garden-themed haikus'],
        sprout_h_ratio=0.46,
        title_size_ratio=0.17,
        sub_size_ratio=0.06,
        left_margin_ratio=0.05,
        gap_ratio=0.04,
        right_margin_ratio=0.10,
        radius_ratio=0.08,
        out_name='promo-440x280.png',
    )
    # Marquee tile (wide). Title fits on one line; subtitle gets a single,
    # comfortable line that reads at distance.
    render_tile(
        W=1400, H=560,
        title_lines=['Holiday from AI'],
        subtitle_lines=['Replace AI-FOMO-Linkedin with garden-themed haikus'],
        sprout_h_ratio=0.55,
        title_size_ratio=0.18,
        sub_size_ratio=0.065,
        left_margin_ratio=0.06,
        gap_ratio=0.04,
        right_margin_ratio=0.06,
        radius_ratio=0.04,
        out_name='promo-1400x560.png',
    )


if __name__ == '__main__':
    main()
