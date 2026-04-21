#!/usr/bin/env python3
"""Download + optimize curated garden photos from Unsplash.

Uses the UNSPLASH_ACCESS_KEY env var. We search a handful of curated queries,
pick the top photo from each, dedupe by photo ID, and save as garden-1.jpg …
garden-N.jpg after downsizing to ~900px wide at 78% JPEG quality.

Run from repo root:
    UNSPLASH_ACCESS_KEY=xxx python3 extension/images/_fetch_unsplash.py
or (auto-source from a sibling project's .env.local):
    python3 extension/images/_fetch_unsplash.py --use-pawrora-env
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET_WIDTH = 900
JPEG_QUALITY = 78
UA = "holiday-from-ai/0.2 (https://tinyfoundry.ai)"

# Each query should return 1–2 editorial-quality garden images.
QUERIES = [
    "english cottage garden",
    "potager garden",
    "lush flower garden",
    "rose garden",
    "vegetable garden summer",
    "wildflower meadow garden",
    "garden path stone",
    "greenhouse garden",
    "herb garden",
    "garden hydrangeas",
    "garden allotment",
    "garden pond",
]


def load_key():
    k = os.environ.get("UNSPLASH_ACCESS_KEY")
    if k:
        return k
    if "--use-pawrora-env" in sys.argv:
        env_path = os.path.expanduser(
            "~/Documents/CLAUDE/SideProjects/pawrora-seo/.env.local"
        )
        for line in open(env_path):
            line = line.strip()
            if line.startswith("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit(
        "UNSPLASH_ACCESS_KEY not set. Either export it or pass --use-pawrora-env."
    )


def search(query, key, per_page=2):
    q = urllib.parse.quote(query)
    url = (
        f"https://api.unsplash.com/search/photos?query={q}"
        f"&per_page={per_page}&orientation=landscape&content_filter=high"
    )
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Client-ID {key}",
            "User-Agent": UA,
            "Accept-Version": "v1",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())["results"]


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def optimize(raw_bytes):
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    w, h = img.size
    if w > TARGET_WIDTH:
        img = img.resize((TARGET_WIDTH, int(h * TARGET_WIDTH / w)), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out.getvalue()


def main():
    key = load_key()
    print(f"Unsplash key loaded ({len(key)} chars)")

    chosen = []  # list of (photo_id, url_for_download, attribution_info)
    seen_ids = set()

    for query in QUERIES:
        if len(chosen) >= 15:
            break
        try:
            results = search(query, key)
        except Exception as e:
            print(f"  search '{query}' failed: {e}")
            continue
        for photo in results:
            pid = photo["id"]
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            chosen.append(
                {
                    "id": pid,
                    "raw_url": photo["urls"]["raw"] + "&w=1400&q=80&fm=jpg",
                    "html": photo["links"]["html"],
                    "author": photo["user"]["name"],
                    "author_url": photo["user"]["links"]["html"],
                    "query": query,
                }
            )
            break  # take the top result per query
        time.sleep(0.2)

    if not chosen:
        raise SystemExit("Unsplash returned no usable photos.")
    print(f"Selected {len(chosen)} photos across {len(QUERIES)} queries")

    # Remove any existing garden-*.jpg first so stale images don't linger.
    for fname in os.listdir(HERE):
        if fname.startswith("garden-") and fname.endswith(".jpg"):
            os.remove(os.path.join(HERE, fname))

    attribution_lines = ["# Image attributions", "", "Garden photos bundled with the extension. Sourced via the Unsplash API."]
    attribution_lines += ["Per the Unsplash License they're free to use; credit below as courtesy.", "", "| File | Photo | Author |", "|---|---|---|"]

    for i, p in enumerate(chosen, start=1):
        print(f"[{i}/{len(chosen)}] {p['query']:30s} id={p['id']}")
        try:
            raw = download(p["raw_url"])
            opt = optimize(raw)
            fname = f"garden-{i}.jpg"
            open(os.path.join(HERE, fname), "wb").write(opt)
            print(f"    -> {fname} ({len(opt)//1024} KB)")
            attribution_lines.append(
                f"| {fname} | [view]({p['html']}) | [{p['author']}]({p['author_url']}) |"
            )
        except Exception as e:
            print(f"    FAIL: {e}")

    attribution_lines += ["", "Re-run with `python3 extension/images/_fetch_unsplash.py --use-pawrora-env` to refresh."]
    open(os.path.join(HERE, "ATTRIBUTIONS.md"), "w").write("\n".join(attribution_lines) + "\n")
    print(f"\nSaved {len(chosen)} images + ATTRIBUTIONS.md")


if __name__ == "__main__":
    main()
