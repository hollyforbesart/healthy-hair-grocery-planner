import { Fragment, type ReactNode } from 'react';
import type { RecipeBlock, RecipeNutrition, Recipe } from '../data/recipes';

/** **bold** and *italic*, as written in the recipe, without injecting HTML. */
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ block }: { block: RecipeBlock }) {
  switch (block.type) {
    case 'h':
      return <h5 className="recipe__subhead">{inline(block.text)}</h5>;
    case 'p':
      return <p>{inline(block.text)}</p>;
    case 'ul':
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol start={block.start}>
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ol>
      );
  }
}

/** Iron and B12 keep one decimal, as written in the recipes ("3.0 mg"). */
const ONE_DECIMAL = new Set<keyof RecipeNutrition>(['iron_mg', 'b12_mcg']);

const NUTRIENTS: { key: keyof RecipeNutrition; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein_g', label: 'Protein', unit: ' g' },
  { key: 'carbs_g', label: 'Carbs', unit: ' g' },
  { key: 'fat_g', label: 'Fat', unit: ' g' },
  { key: 'fiber_g', label: 'Fiber', unit: ' g' },
  { key: 'iron_mg', label: 'Iron', unit: ' mg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: ' mg' },
  { key: 'b12_mcg', label: 'B12', unit: ' mcg' },
  { key: 'sodium_mg', label: 'Sodium', unit: ' mg' },
];

/** The nutrition box: only the values the recipe has. */
function Nutrition({ nutrition, notes, approximate }: { nutrition: RecipeNutrition; notes: string[]; approximate: boolean }) {
  const shown = NUTRIENTS.filter((n) => typeof nutrition[n.key] === 'number');
  if (shown.length === 0) return null;
  return (
    <section className="recipe__nutrition" aria-labelledby="recipe-nutrition-title">
      <h4 id="recipe-nutrition-title">Nutrition per serving</h4>
      <dl>
        {shown.map((n) => (
          <div key={n.key}>
            <dt>{n.label}</dt>
            <dd>
              {n.key === 'calories' && approximate ? '~' : ''}
              {ONE_DECIMAL.has(n.key) ? nutrition[n.key]!.toFixed(1) : nutrition[n.key]}
              {n.unit}
            </dd>
          </div>
        ))}
      </dl>
      {notes.map((note, i) => (
        <p key={i} className="small muted">
          {inline(note)}
        </p>
      ))}
    </section>
  );
}

/** A full recipe: serves and time, nutrition, then its sections in the order written. */
export function RecipeView({ name, recipe, highIron }: { name: string; recipe: Recipe; highIron?: boolean }) {
  const meta = [
    recipe.serves && `Serves ${recipe.serves}`,
    recipe.time,
    recipe.packable && `Packable: ${recipe.packable}`,
  ].filter(Boolean);
  const isSnackCombo = recipe.sections.length === 1 && !recipe.time;
  return (
    <article className="recipe" aria-labelledby="recipe-title">
      <header className="recipe__head">
        <h3 id="recipe-title">{name}</h3>
        {meta.length > 0 && <p className="recipe__meta">{meta.join(' · ')}</p>}
        {(highIron || recipe.labels.length > 0) && (
          <ul className="recipe__labels">
            {highIron && <li className="iron-tag">High iron</li>}
            {recipe.labels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </header>
      {recipe.nutrition && <Nutrition nutrition={recipe.nutrition} notes={recipe.nutritionNotes} approximate={isSnackCombo} />}
      {recipe.sections.map((section) => (
        <section key={section.title} className="recipe__section">
          <h4>{section.title}</h4>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
      <p className="small muted recipe__source">From {recipe.source}.</p>
    </article>
  );
}
