#!/usr/bin/env python3
"""
Import The Iron Refill meals and snack combos into the planner.

Usage:
    python3 scripts/import_iron_refill.py /path/to/meals-and-recipes

Reads, from the meals-and-recipes repo:
- tool-a/data/final-recipes.csv   (nutrition per serving)
- tool-a/TOOL-A-CONTENT.md        (the full recipes)

and writes:
- src/data/library/meals.json     (the 27 meals, from scripts/iron_refill_meals.py,
                                   marked "preview" so they stay hidden until launch)
- src/data/library/recipes.json   (their recipes, word for word, plus nutrition)

Safe to re-run after editing a recipe: it replaces these entries and leaves
everything else alone.
"""
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from iron_refill_meals import MEALS, SNACK_NOTE, SNACKS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MEALS_JSON = ROOT / 'src' / 'data' / 'library' / 'meals.json'
RECIPES_JSON = ROOT / 'src' / 'data' / 'library' / 'recipes.json'
SOURCE = 'The Iron Refill'
SKIP_META = ('**Labels:**', '**Meal:**', '**Adapted from:**', '**Source:**')


def blocks(text: str) -> list[dict]:
    """Markdown body → headings, paragraphs and lists (inline **bold** and *italic* kept as text)."""
    out: list[dict] = []
    para: list[str] = []

    def flush():
        if para:
            out.append({'type': 'p', 'text': ' '.join(para)})
            para.clear()

    for raw in text.split('\n'):
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith('|'):
            flush()
            continue
        if re.fullmatch(r'\*\*[^*]+\*\*', stripped):
            flush()
            out.append({'type': 'h', 'text': stripped.strip('*')})
            continue
        bullet = re.match(r'- (.*)', stripped) if not raw.startswith(' ') else None
        number = re.match(r'(\d+)\. (.*)', stripped) if not raw.startswith(' ') else None
        if bullet or number:
            flush()
            kind = 'ul' if bullet else 'ol'
            item = bullet.group(1) if bullet else number.group(2)
            last = out[-1] if out else None
            if last and last['type'] == kind:
                last['items'].append(item)
            else:
                block = {'type': kind, 'items': [item]}
                if number:
                    block['start'] = int(number.group(1))
                out.append(block)
            continue
        if raw.startswith(' ') and out and out[-1]['type'] in ('ul', 'ol') and not para:
            out[-1]['items'][-1] += ' ' + stripped  # wrapped list item
            continue
        para.append(stripped)
    flush()
    return out


def parse_recipes(content: str) -> dict[str, dict]:
    """Recipe title → {meta, sections, nutrition notes}."""
    body = content[content.index('## 2. Breakfasts'):content.index('## 4. Snack combos')]
    recipes = {}
    for chunk in re.split(r'\n### ', body)[1:]:
        title, rest = chunk.split('\n', 1)
        rest = re.split(r'\n## ', rest)[0]
        meta_line = next((l for l in rest.split('\n') if l.startswith('**Meal:**')), '')
        labels_line = next((l for l in rest.split('\n') if l.startswith('**Labels:**')), '')
        meta = dict(re.findall(r'\*\*(Serves|Time|Packable):\*\* ([^·]+)', meta_line))
        intro, *parts = re.split(r'\n#### ', '\n' + rest)
        sections, notes = [], []
        for part in parts:
            head, _, text = part.partition('\n')
            text = '\n'.join(l for l in text.split('\n') if not l.startswith(SKIP_META))
            if head.startswith('Nutrition per serving'):
                notes = [b['text'] for b in blocks(text) if b['type'] == 'p']
            else:
                sections.append({'title': head.strip(), 'blocks': blocks(text)})
        recipes[title.strip()] = {
            'serves': meta.get('Serves', '').strip(),
            'time': meta.get('Time', '').strip(),
            'packable': meta.get('Packable', '').strip() or None,
            'labels': [l.strip() for l in labels_line.replace('**Labels:**', '').split('·') if l.strip()],
            'sections': sections,
            'nutritionNotes': notes,
        }
    return recipes


def number(value: str):
    value = value.strip().rstrip('%')
    return float(value) if '.' in value else int(value)


def main(repo: Path) -> None:
    rows = {r['recipe_id']: r for r in csv.DictReader(open(repo / 'tool-a' / 'data' / 'final-recipes.csv', encoding='utf-8'))}
    recipes = parse_recipes((repo / 'tool-a' / 'TOOL-A-CONTENT.md').read_text(encoding='utf-8'))

    meals = json.loads(MEALS_JSON.read_text())
    ours = {m[0] for m in MEALS.values()}
    meals = [m for m in meals if m['id'] not in ours]
    out_recipes = json.loads(RECIPES_JSON.read_text()) if RECIPES_JSON.exists() else {}

    for rid, (mid, name, category, time, required, optional, note) in MEALS.items():
        meal = {'id': mid, 'name': name, 'category': category}
        if category == 'lunch':
            meal['extraCategories'] = ['dinner']  # "Lunch or dinner" in the guide
        meal.update({'timeCategory': time, 'requiredIngredients': required, 'optionalIngredients': optional, 'source': SOURCE})
        if note:
            meal['preparationNote'] = note
        meal.update({'highIron': True, 'preview': True})
        meals.append(meal)

        if rid in SNACKS:
            items, nutrition = SNACKS[rid]
            out_recipes[mid] = {
                'source': SOURCE, 'serves': '1', 'time': None, 'packable': None, 'labels': [],
                'sections': [{'title': 'What you need', 'blocks': [{'type': 'ul', 'items': items}]}],
                'nutrition': nutrition, 'nutritionNotes': [SNACK_NOTE],
            }
            continue
        row = rows[rid]
        recipe = recipes[row['recipe_name']]
        out_recipes[mid] = {
            'source': SOURCE,
            **recipe,
            'nutrition': {
                'calories': number(row['calories_kcal']),
                'protein_g': number(row['protein_g']),
                'carbs_g': number(row['carbs_g']),
                'fat_g': number(row['fat_g']),
                'fiber_g': number(row['fiber_g']),
                'iron_mg': number(row['iron_mg']),
                'vitamin_c_mg': number(row['vitamin_c_after_cooking_mg']),
                'b12_mcg': number(row['vitamin_b12_mcg']),
                'sodium_mg': number(row['sodium_mg']),
            },
        }

    MEALS_JSON.write_text(json.dumps(meals, indent=2, ensure_ascii=False) + '\n')
    RECIPES_JSON.write_text(json.dumps(out_recipes, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(MEALS)} Iron Refill meals → meals.json ({len(meals)} meals) and recipes.json ({len(out_recipes)} recipes)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
