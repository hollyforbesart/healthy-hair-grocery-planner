import { useEffect } from 'react';
import { StepNav } from './components/StepNav';
import { useRoute } from './hooks/useRoute';
import { START_OVER_CONFIRM } from './lib/confirmations';
import { HomePage } from './pages/HomePage';
import { usePlanner } from './state/PlannerContext';
import { FeedbackStep } from './steps/FeedbackStep';
import { GroceryListStep } from './steps/GroceryListStep';
import { IngredientsStep } from './steps/IngredientsStep';
import { MealsStep } from './steps/MealsStep';
import { WeekStep } from './steps/WeekStep';

const STEP_COMPONENTS = [WeekStep, IngredientsStep, MealsStep, GroceryListStep, FeedbackStep];

export function App() {
  const { state, dispatch } = usePlanner();
  const [route, navigate] = useRoute();
  const Step = STEP_COMPONENTS[state.currentStep] ?? WeekStep;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.currentStep]);

  const goTo = (step: number) => dispatch({ type: 'goToStep', step });

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
            <span className="site-header__brand">The Hair Loss Nutritionist</span>
            <h1>Healthy Hair Grocery Planner</h1>
          </a>
          {route === 'planner' && (
            <div className="site-header__actions no-print">
              <a
                className="site-header__link"
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('home');
                }}
              >
                How to use
              </a>
              <button type="button" className="btn btn--ghost btn--small" onClick={startOver}>
                Start over
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {route === 'home' ? (
          <main id="main" className="main">
            <HomePage onOpenPlanner={() => navigate('planner')} />
          </main>
        ) : (
          <>
            <StepNav current={state.currentStep} onSelect={goTo} />
            <main id="main" className="main">
              {/* key remounts the step so its heading receives focus */}
              <Step key={state.currentStep} />
            </main>
          </>
        )}
      </div>

      <footer className="site-footer no-print">
        <div className="container">
          <p className="small">
            Meal ideas are general suggestions for planning your groceries and are not medical or nutritional advice.
            Your progress is saved in this browser only.
          </p>
        </div>
      </footer>
    </>
  );
}
