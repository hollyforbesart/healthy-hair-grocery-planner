import { useEffect, useRef } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { NEW_WEEK_CONFIRM } from '../lib/confirmations';
import { STEPS, hasPlannerProgress } from '../state/plannerReducer';
import { usePlanner } from '../state/PlannerContext';

interface HomePageProps {
  onOpenPlanner: () => void;
}

const HOW_IT_WORKS = [
  { title: 'Start with your week', text: 'Tell us which meals you need ideas for and any foods to leave out.' },
  { title: 'Check your kitchen', text: 'Mark what you already have and what you need to buy. Star the staples you always keep on hand.' },
  { title: 'Pick meal ideas', text: 'Meals that use what you already have come first. Add the ones you’d like to make.' },
  { title: 'Shop with one list', text: 'Get one tidy list, grouped and ready to share to your phone, copy or print.' },
];

/**
 * Landing page before the planner: what it is, how to use it, and how to
 * install it. Image slots can be added to the hero once brand graphics exist.
 */
export function HomePage({ onOpenPlanner }: HomePageProps) {
  const { state, dispatch } = usePlanner();
  const { canInstall, installed, install } = useInstallPrompt();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returning = hasPlannerProgress(state);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const startNewWeek = () => {
    if (window.confirm(NEW_WEEK_CONFIRM)) {
      dispatch({ type: 'startNewWeek' });
      onOpenPlanner();
    }
  };

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <h2 id="home-title" ref={headingRef} tabIndex={-1}>
          Plan your groceries around what’s already in your kitchen.
        </h2>
        <p className="home-hero__lead">
          Pick meal ideas that use the food you have, then get one simple shopping list for the week.
        </p>
        <div className="button-row">
          <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
            {returning ? `Continue your plan (${STEPS[state.currentStep].label})` : 'Start planning'} →
          </button>
          {returning && (
            <button type="button" className="btn btn--secondary" onClick={startNewWeek}>
              Start a new week
            </button>
          )}
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="how-steps">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="card">
              <span className="how-steps__num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="card home-tip">
          <h3>Each week</h3>
          <p>
            Come back and tap <strong>Start a new week</strong>. Your preferences and staples are kept, your meals and
            list are cleared, and you’ll check your pantry first — so anything you’ve used up goes back on the list.
          </p>
        </div>
      </section>

      <section className="home-section" aria-labelledby="install-title">
        <h2 id="install-title">Keep it on your phone</h2>
        {installed ? (
          <p>You’re using the installed app. It works offline, so your list is there even with no signal in the store.</p>
        ) : (
          <>
            <p>
              Add the planner to your home screen and it opens like an app. After your first visit it works offline,
              so your list is there even with no signal in the store.
            </p>
            {canInstall && (
              <div className="button-row">
                <button type="button" className="btn btn--secondary" onClick={() => void install()}>
                  Install the app
                </button>
              </div>
            )}
            <div className="install-grid">
              <div className="card">
                <h3>iPhone or iPad</h3>
                <ol>
                  <li>Open this page in <strong>Safari</strong>.</li>
                  <li>
                    Tap the <strong>Share</strong> button (the square with an arrow).
                  </li>
                  <li>
                    Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
                  </li>
                </ol>
              </div>
              <div className="card">
                <h3>Android</h3>
                <ol>
                  <li>Open this page in <strong>Chrome</strong>.</li>
                  <li>
                    Tap the <strong>⋮</strong> menu.
                  </li>
                  <li>
                    Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                </ol>
              </div>
              <div className="card">
                <h3>Computer</h3>
                <ol>
                  <li>
                    In <strong>Chrome</strong> or <strong>Edge</strong>, click the install icon at the right of the
                    address bar.
                  </li>
                  <li>Or simply bookmark this page.</li>
                </ol>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="home-section" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Your plan stays on your device</h2>
        <p>
          There’s no account to create. Your plan is saved in this browser on this device, so it won’t appear on your
          other devices, and clearing your browser data erases it. Use <strong>Share list</strong> to send your list to
          your phone or someone you shop with.
        </p>
      </section>

      <div className="home-cta">
        <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
          {returning ? 'Continue your plan' : 'Start planning'} →
        </button>
      </div>
    </div>
  );
}
