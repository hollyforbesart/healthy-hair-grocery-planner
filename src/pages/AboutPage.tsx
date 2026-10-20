import { useEffect, useRef } from 'react';

/**
 * "About these meals": why the meals were chosen and what the planner does
 * and doesn't include yet. Linked from the footer and under the home page's
 * starting options.
 */
export function AboutPage({ onOpenPlanner }: { onOpenPlanner: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article className="prose-page" aria-labelledby="about-title">
      <h2 id="about-title" ref={headingRef} tabIndex={-1}>
        Why these meals?
      </h2>
      <p>
        When you’re experiencing hair loss, figuring out what to eat can feel overwhelming. There are so many
        recommendations about protein, iron, vitamins, supplements, and so-called hair growth foods.
      </p>
      <p>
        As a registered dietitian, I created this planner to help you put the nutrition fundamentals into practice
        without following a restrictive diet or buying a long list of specialty products.
      </p>
      <p>
        The 100 meal and snack ideas emphasize a variety of protein sources, carbohydrates, fiber-rich foods, fruits,
        vegetables, and ingredients that provide nutrients important for normal hair health.
      </p>
      <p>
        Nutrition is one piece of the hair health puzzle. This planner won’t identify or treat the cause of your hair
        loss, but it can make nourishing yourself consistently a little easier.
      </p>
      <p className="prose-page__signature">
        Holly Forbes, RDN
        <span>The Hair Loss Nutritionist</span>
      </p>

      <section className="included" aria-labelledby="included-title">
        <h3 id="included-title">What’s in the planner</h3>
        <div className="included__grid">
          <div className="card included__card">
            <h4>What’s included</h4>
            <ul>
              <li>Curated meal combinations</li>
              <li>Ingredient lists</li>
              <li>Pantry matching</li>
              <li>Weekly planning</li>
              <li>Grocery-list generation</li>
              <li>A meal schedule with prep reminders</li>
            </ul>
          </div>
          <div className="card included__card included__card--later">
            <h4>Not included yet</h4>
            <ul>
              <li>Ingredient quantities</li>
              <li>Full cooking instructions</li>
              <li>Individualized nutrition targets</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="home-cta">
        <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
          Start planning →
        </button>
      </div>
    </article>
  );
}
