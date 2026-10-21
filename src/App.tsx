import { useEffect } from 'react';
import { StepNav } from './components/StepNav';
import { useAccount } from './hooks/useAccount';
import { useRoute } from './hooks/useRoute';
import { track } from './lib/analytics';
import { START_OVER_CONFIRM } from './lib/confirmations';
import { RouteLink } from './components/RouteLink';
import { AboutPage } from './pages/AboutPage';
import { PRIVACY_POLICY_URL, TermsPage } from './pages/TermsPage';
import { HomePage } from './pages/HomePage';
import { NutrientsPage } from './pages/NutrientsPage';
import { startScheduleTrip } from './lib/scheduleTrip';
import { TonightBanner, WeekPage } from './pages/WeekPage';
import { usePlanner } from './state/PlannerContext';
import { firstStep, stepsForPath, type StepId } from './state/steps';
import { GroceryListStep } from './steps/GroceryListStep';
import { KitchenStep } from './steps/KitchenStep';
import { MealsStep } from './steps/MealsStep';
import { ReviewStep } from './steps/ReviewStep';
import { PathChooser } from './components/PathChooser';
import type { MealCategory } from './types';

const STEP_COMPONENTS: Record<StepId, () => JSX.Element> = {
  kitchen: KitchenStep,
  meals: MealsStep,
  review: ReviewStep,
  list: GroceryListStep,
};

export function App() {
  const { state, dispatch } = usePlanner();
  const [route, navigate] = useRoute();
  const account = useAccount();
  const steps = stepsForPath(state.path);
  const currentStep = steps.includes(state.currentStep) ? state.currentStep : firstStep(state.path);
  const Step = STEP_COMPONENTS[currentStep];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.currentStep]);

  useEffect(() => {
    track('page_view', route);
  }, [route]);

  const goTo = (step: StepId) => dispatch({ type: 'goToStep', step });

  /** From the meal schedule: meal ideas (just that meal type), with a way back to the schedule. */
  const findMeals = (category?: MealCategory, day?: number) => {
    startScheduleTrip({ day, category, previousCategories: state.preferences.mealCategories });
    if (category) dispatch({ type: 'updatePreferences', patch: { mealCategories: [category] } });
    if (state.path) dispatch({ type: 'goToStep', step: 'meals' });
    else dispatch({ type: 'choosePath', path: 'ideas' });
    navigate('planner');
  };

  const startOver = () => {
    if (window.confirm(START_OVER_CONFIRM)) dispatch({ type: 'reset' });
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <a
            className="site-header__home"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('home');
            }}
          >
            {/* The Mane Meals logo: mark | wordmark over the tagline (kept as text so it stays legible). */}
            <img className="site-header__mark" src="/brand/mane-meals-mark-light.png" alt="" width={152} height={144} />
            <span className="site-header__divider" aria-hidden="true" />
            <h1 className="site-header__title">
              <img
                className="site-header__wordmark"
                src="/brand/mane-meals-wordmark-light.png"
                alt="Mane Meals"
                width={464}
                height={72}
              />
              <span className="visually-hidden">: </span>
              <span className="site-header__product">Meal &amp; Grocery Planner</span>
            </h1>
          </a>
          {(route === 'planner' || route === 'week') && (
            <div className="site-header__actions no-print">
              <RouteLink to={route === 'week' ? 'planner' : 'week'} navigate={navigate} className="site-header__link">
                {route === 'week' ? 'Planner' : 'Schedule'}
              </RouteLink>
              <a
                className="site-header__link"
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('home');
                }}
              >
                Home
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {(route === 'home' || route === 'planner') && <TonightBanner onOpenWeek={() => navigate('week')} />}
        {route === 'home' ? (
          <main id="main" className="main">
            <HomePage onOpenPlanner={() => navigate('planner')} navigate={navigate} />
          </main>
        ) : route === 'nutrients' ? (
          <main id="main" className="main">
            <NutrientsPage onOpenPlanner={() => navigate('planner')} />
          </main>
        ) : route === 'about' ? (
          <main id="main" className="main">
            <AboutPage onOpenPlanner={() => navigate('planner')} />
          </main>
        ) : route === 'week' ? (
          <main id="main" className="main">
            <WeekPage onOpenPlanner={() => navigate('planner')} onFindMeals={findMeals} />
          </main>
        ) : route === 'terms' ? (
          <main id="main" className="main">
            <TermsPage />
          </main>
        ) : (
          <>
            {state.path && <StepNav steps={steps} current={currentStep} onSelect={goTo} />}
            <main id="main" className="main">
              {/* key remounts the step so its heading receives focus */}
              {state.path ? <Step key={currentStep} /> : <PathChooser />}
            </main>
          </>
        )}
      </div>

      <footer className="site-footer no-print">
        <div className="container">
          <nav className="footer-links" aria-label="More information">
            <RouteLink to="home" navigate={navigate}>
              Home
            </RouteLink>
            <RouteLink to="week" navigate={navigate}>
              Meal schedule
            </RouteLink>
            <RouteLink to="about" navigate={navigate}>
              About these meals
            </RouteLink>
            <RouteLink to="nutrients" navigate={navigate}>
              Food for Your Follicles
            </RouteLink>
            <RouteLink to="terms" navigate={navigate}>
              Terms
            </RouteLink>
            <a href={PRIVACY_POLICY_URL}>Privacy</a>
          </nav>
          <p className="small">
            Meal ideas are general suggestions for planning your groceries and are not medical or nutritional advice.
            Your progress is saved in this browser only.
          </p>
          {route === 'planner' && (
            <p className="small site-footer__start-over">
              <button type="button" className="link-btn" onClick={startOver}>
                Start over
              </button>{' '}
              <span className="muted">— clears your kitchen, meals, list, schedule, staples and favorites, on every device you sign in on.</span>
            </p>
          )}
          {account.email && (
            <p className="small site-footer__account">
              Signed in as {account.email} ·{' '}
              <button type="button" className="link-btn" onClick={() => void account.signOut()}>
                Sign out
              </button>
            </p>
          )}
          <p className="small site-footer__copyright">© 2026 The Hair Loss Nutritionist</p>
        </div>
      </footer>
    </>
  );
}
