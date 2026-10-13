#!/usr/bin/env python3
"""
Prepare meal photos for the planner.

Usage (needs Python 3 with Pillow):
    python3 scripts/process_meal_photos.py photo.jpg=meal-id [photo2.png=other-meal-id ...]

Each photo is centre-cropped to a square, resized to 480x480, saved as
public/meal-photos/<meal-id>.webp (about 30-60 KB), and
src/data/library/meal-photos.json is rebuilt from what's in that folder.
Meal IDs must exist in src/data/library/meals.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'meal-photos'
MANIFEST = ROOT / 'src' / 'data' / 'library' / 'meal-photos.json'
MEALS = ROOT / 'src' / 'data' / 'library' / 'meals.json'
SIZE = 480
QUALITY = 80


def square(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img).convert('RGB')
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)


def main(pairs: list[str]) -> None:
    meal_ids = {m['id'] for m in json.loads(MEALS.read_text())}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for pair in pairs:
        source, _, meal_id = pair.partition('=')
        if meal_id not in meal_ids:
            sys.exit(f'Unknown meal id: {meal_id!r} (for {source})')
        target = OUT_DIR / f'{meal_id}.webp'
        square(Image.open(source)).save(target, 'WEBP', quality=QUALITY, method=6)
        print(f'{meal_id}: {target.stat().st_size // 1024} KB')
    photos = sorted(p.stem for p in OUT_DIR.glob('*.webp') if p.stem in meal_ids)
    MANIFEST.write_text(json.dumps(photos, indent=2) + '\n')
    print(f'{len(photos)} meals have photos')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
