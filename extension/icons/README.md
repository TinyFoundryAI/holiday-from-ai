# Icons — placeholder

Chrome needs `icon-16.png`, `icon-48.png`, and `icon-128.png` before the extension will load without warnings. I couldn't generate PNGs directly, so you need to add them:

## Fastest option — two commands

```bash
# macOS (with ImageMagick installed: `brew install imagemagick`)
cd icons
convert -size 128x128 -background "#2d5a3d" -fill white -gravity center -font "Apple-Color-Emoji" label:"🌱" icon-128.png
convert icon-128.png -resize 48x48 icon-48.png
convert icon-128.png -resize 16x16 icon-16.png
```

## Alternative — any 16/48/128 PNG

Any three PNGs at the right sizes will do. The joke is the extension itself; the icon is placeholder-grade for now.

## Long-term

A proper icon can be commissioned post-v1 (noted in `AI_HOLIDAY_BUILD_SPEC.md` §9.10).
