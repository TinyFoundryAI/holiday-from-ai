#!/usr/bin/env python3
"""Download + optimize curated garden photos from Wikimedia Commons for bundling.

We tried Unsplash but their download endpoints require API auth and the
CDN URLs aren't reachable from this environment. Wikimedia Commons files
are CC-licensed, have stable Special:FilePath URLs, and cover exactly the
kind of lush-garden / potager content we want.

Outputs `garden-1.jpg` through `garden-N.jpg` at ~1000px wide, ~85% JPEG quality.
Each source file + its author/license is recorded in ATTRIBUTIONS.md (generate
with --attribution).
"""
import io
import os
import sys
import urllib.parse
import urllib.request
from PIL import Image

UA = "holiday-from-ai/0.1 (https://tinyfoundry.ai; amelie.m.caudron@gmail.com)"
HERE = os.path.dirname(os.path.abspath(__file__))
TARGET_WIDTH = 800
JPEG_QUALITY = 72

# Curated Wikimedia Commons filenames — mix of potagers and lush flower gardens.
SOURCES = [
    "Vegetable_garden_1.JPG",
    "Raised_vegetable_bed_at_Boreham,_Essex,_England.jpg",
    "Lettuce_garden.jpg",
    "Flower_and_vegetable_garden.jpg",
    "Kale_and_Cabbage_in_Raised_Garden_Beds_(49200262267).jpg",
    "A_Surrey_Garden_(4663990970).jpg",
    "An_Cala_Garden_(geograph_4510494).jpg",
    "Autumn_back_garden_-_Flickr_-_peganum.jpg",
]


def fetch(name):
    enc = urllib.parse.quote(name)
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{enc}?width=1400"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def optimize(raw_bytes):
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    w, h = img.size
    if w > TARGET_WIDTH:
        new_h = int(h * TARGET_WIDTH / w)
        img = img.resize((TARGET_WIDTH, new_h), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out.getvalue()


def main():
    total_bytes = 0
    for i, src in enumerate(SOURCES, start=1):
        print(f"[{i}/{len(SOURCES)}] fetching {src}...")
        raw = fetch(src)
        optimized = optimize(raw)
        out_path = os.path.join(HERE, f"garden-{i}.jpg")
        with open(out_path, "wb") as f:
            f.write(optimized)
        print(f"    -> {out_path} ({len(optimized) // 1024} KB)")
        total_bytes += len(optimized)
    print(f"\nTotal bundle: {total_bytes // 1024} KB across {len(SOURCES)} images.")


if __name__ == "__main__":
    main()
