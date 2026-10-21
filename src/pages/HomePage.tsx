import { useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import { PATH_OPTIONS } from '../data/paths';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { RouteLink } from '../components/RouteLink';
import type { Route } from '../hooks/useRoute';
import { NEW_WEEK_CONFIRM } from '../lib/confirmations';
import { track } from '../lib/analytics';
import { hasPlannerProgress } from '../state/plannerReducer';
import { usePlanner } from '../state/PlannerContext';
import { firstStep } from '../state/steps';
import type { PlannerPath } from '../types';

interface HomePageProps {
  onOpenPlanner: () => void;
  navigate: (route: Route) => void;
}

/**
 * Landing page before the planner: the two ways to start, the weekly
 * routine, the nutrient guide, privacy and how to install it. Image slots can be added to the
 * hero once brand graphics exist.
 */
export function HomePage({ onOpenPlanner, navigate }: HomePageProps) {
  const { state, dispatch } = usePlanner();
  const { canInstall, installed, install } = useInstallPrompt();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returning = hasPlannerProgress(state);
  const mealCount = state.selectedMealIds.length;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const startWith = (path: PlannerPath) => {
    dispatch({ type: 'choosePath', path });
    dispatch({ type: 'goToStep', step: firstStep(path) });
    onOpenPlanner();
  };

  const planNewWeek = () => {
    if (window.confirm(NEW_WEEK_CONFIRM)) {
      dispatch({ type: 'startNewWeek' });
      onOpenPlanner();
    }
  };

  return (
    <div className="home">
      {returning && (
        <section className="welcome-back" aria-labelledby="welcome-title">
          <div>
            <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>
              Welcome back
            </h2>
            <p>
              {mealCount > 0
                ? `You have a plan in progress with ${mealCount} meal${mealCount === 1 ? '' : 's'}.`
                : 'You have a plan in progress.'}
            </p>
          </div>
          <div className="welcome-back__actions">
            <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
              Continue where you left off →
            </button>
            {mealCount > 0 && (
              <button type="button" className="btn btn--secondary" onClick={() => navigate('week')}>
                Meal schedule
              </button>
            )}
            <button type="button" className="btn btn--secondary" onClick={planNewWeek}>
              Start a new week
            </button>
            <p className="small muted">“Start a new week” clears this week’s meals, grocery list and meal schedule, and keeps your staples, favorites and preferences.</p>
          </div>
        </section>
      )}

      <section className="home-hero" aria-labelledby="home-title">
        <h2 id="home-title" ref={returning ? undefined : headingRef} tabIndex={-1}>
          Take the guesswork out of eating for hair health.
        </h2>
        <p className="home-hero__lead">
          Explore 100 dietitian-curated meal and snack ideas designed around balanced nutrition and foods that provide
          key nutrients involved in normal hair health.
        </p>
        <p className="home-hero__choose">Choose how you’d like to start. You can switch any time.</p>
        <div className="home-paths">
          {PATH_OPTIONS.map((option, index) => (
            <div key={option.value} className="home-paths__item">
              {index > 0 && (
                <span className="home-paths__or" aria-hidden="true">
                  or
                </span>
              )}
              <button type="button" className="path-option" onClick={() => startWith(option.value)}>
                <Icon name={option.icon} size={32} className="path-option__icon" />
                <span className="path-option__title">{option.title}</span>
                <span className="path-option__text">{option.text}</span>
                <span className="path-option__best">{option.bestFor}</span>
              </button>
            </div>
          ))}
        </div>
        <RouteLink to="week" navigate={navigate} className="home-schedule">
          <Icon name="calendar" size={30} className="home-schedule__icon" />
          <span>
            <span className="home-schedule__label">Then, if you like</span>
            <span className="home-schedule__title">Schedule your meals</span>
            <span className="home-schedule__text">
              See how your meals fit into your week: put them on days, add leftovers or a night out, and get a reminder the night before
              anything needs prepping.
            </span>
            <span className="home-schedule__link">Open the meal schedule →</span>
          </span>
        </RouteLink>
        <p className="home-hero__included small">
          Meal ideas with ingredient lists, a grocery list and a meal schedule.{' '}
          <RouteLink to="about" navigate={navigate}>
            Why these meals?
          </RouteLink>
        </p>
      </section>

      <section className="card home-tip" aria-labelledby="week-title">
        <h2 id="week-title">Each week</h2>
        <p>
          Come back and tap <strong>Start a new week</strong>. Your staples, favorites and preferences are kept, and
          meals you’ve had recently move down so ideas stay fresh.
        </p>
      </section>

      <section className="card home-learn" aria-labelledby="learn-title">
        <img src="/nutrients/protein.webp" alt="" width={64} height={64} loading="lazy" />
        <div>
          <h2 id="learn-title">Want to understand the nutrients behind the meals?</h2>
          <p>
            Explore <strong>Food for Your Follicles</strong>, your guide to ten nutrients involved in normal hair health
            and the everyday foods that provide them.
          </p>
          <RouteLink to="nutrients" navigate={navigate} className="btn btn--secondary">
            Explore the guide →
          </RouteLink>
        </div>
      </section>

      <section className="home-section" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Your plan stays on your device</h2>
        <p>
          You can sign in on any device, but your plan itself is saved in this browser on this device, so it won’t appear
          on your other devices, and clearing your browser data erases it. Use <strong>Share list</strong> to send your list to your phone or someone you shop
          with.
        </p>
      </section>

      <section className="home-section" aria-labelledby="install-title">
        <h2 id="install-title">Keep it on your phone</h2>
        <ul className="perks">
          <li>
            <Icon name="phone" size={22} /> Opens like an app
          </li>
          <li>
            <Icon name="offline" size={22} /> Works with no signal
          </li>
          <li>
            <Icon name="check" size={22} /> No app store needed
          </li>
        </ul>
        {installed ? (
          <p>You’re using the installed app — you’re all set.</p>
        ) : (
          <>
            {canInstall && (
              <div className="button-row">
                <button type="button" className="btn btn--primary" onClick={() => { track('install_click'); void install(); }}>
                  <Icon name="install" size={20} /> Install the app
                </button>
              </div>
            )}
            <div className="install-grid">
              <div className="card install-card">
                <h3>iPhone or iPad</h3>
                <p className="small muted">In Safari</p>
                <ol>
                  <li>
                    <span className="install-icon">
                      <Icon name="share" size={20} />
                    </span>
                    <span>
                      Tap <strong>Share</strong>
                    </span>
                  </li>
                  <li>
                    <span className="install-icon">
                      <Icon name="plusSquare" size={20} />
                    </span>
                    <span>
                      Tap <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                </ol>
              </div>
              <div className="card install-card">
                <h3>Android</h3>
                <p className="small muted">In Chrome</p>
                <ol>
                  <li>
                    <span className="install-icon">
                      <Icon name="dots" size={20} />
                    </span>
                    <span>
                      Tap the <strong>menu</strong>
                    </span>
                  </li>
                  <li>
                    <span className="install-icon">
                      <Icon name="install" size={20} />
                    </span>
                    <span>
                      Tap <strong>Install app</strong>
                    </span>
                  </li>
                </ol>
              </div>
              <div className="card install-card">
                <h3>Computer</h3>
                <p className="small muted">In Chrome or Edge</p>
                <ol>
                  <li>
                    <span className="install-icon">
                      <Icon name="install" size={20} />
                    </span>
                    <span>
                      Click <strong>Install</strong> in the address bar
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </>
        )}
      </section>

      {returning && (
        <div className="home-cta">
          <button type="button" className="btn btn--primary" onClick={onOpenPlanner}>
            Continue where you left off →
          </button>
        </div>
      )}
    </div>
  );
}
