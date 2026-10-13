import { useEffect, useRef } from 'react';
import { NUTRIENTS, NUTRIENTS_INTRO, SUPPLEMENT_NOTE } from '../data/nutrients';

const iconUrl = (id: string) => `/nutrients/${id}.webp`;

/** "Food for Your Follicles": the ten nutrients guide, as a readable page. */
export function NutrientsPage({ onOpenPlanner }: { onOpenPlanner: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const jumpTo = (id: string) => {
    const target = document.getElementById(`nutrient-${id}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target?.querySelector('h3')?.focus({ preventScroll: true });
  };

  return (
    <article className="prose-page nutrients-page" aria-labelledby="nutrients-title">
      <p className="nutrients-page__eyebrow">Holly Forbes, RDN · The Hair Loss Nutritionist</p>
      <h2 id="nutrients-title" ref={headingRef} tabIndex={-1}>
        Food for Your Follicles
      </h2>
      <p className="nutrients-page__sub">10 nutrients that support healthy hair + where to find them</p>
      {NUTRIENTS_INTRO.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <nav aria-label="Jump to a nutrient">
        <ul className="nutrient-index">
          {NUTRIENTS.map((n, i) => (
            <li key={n.id}>
              <a
                href={`#nutrient-${n.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(n.id);
                }}
              >
                <img src={iconUrl(n.id)} alt="" width={56} height={56} loading="lazy" />
                <span>
                  <span className="nutrient-index__num">{String(i + 1).padStart(2, '0')}</span> {n.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {NUTRIENTS.map((n, i) => (
        <section key={n.id} id={`nutrient-${n.id}`} className="card nutrient" aria-labelledby={`nutrient-title-${n.id}`}>
          <header className="nutrient__header">
            <img src={iconUrl(n.id)} alt="" width={64} height={64} loading="lazy" />
            <div>
              <span className="nutrient__num">{String(i + 1).padStart(2, '0')}</span>
              <h3 id={`nutrient-title-${n.id}`} tabIndex={-1}>
                {n.name}
              </h3>
            </div>
          </header>
          {n.sections.map((s) => (
            <div key={s.label} className={`nutrient__section${s.highlight ? ' nutrient__section--find' : ''}`}>
              <h4>{s.label}</h4>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          ))}
        </section>
      ))}

      <section className="card nutrient-note" aria-labelledby="supplement-note-title">
        <p className="nutrients-page__eyebrow">Before you buy</p>
        <h3 id="supplement-note-title">{SUPPLEMENT_NOTE.title}</h3>
        {SUPPLEMENT_NOTE.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <div className="home-cta">
        <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
          Plan meals with these foods →
        </button>
      </div>
    </article>
  );
}
