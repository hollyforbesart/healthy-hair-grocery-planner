import { useEffect } from 'react';
import { StepNav } from './components/StepNav';
import { usePlanner } from './state/PlannerContext';
import { FeedbackStep } from './steps/FeedbackStep';
import { GroceryListStep } from './steps/GroceryListStep';
import { IngredientsStep } from './steps/IngredientsStep';
import { MealsStep } from './steps/MealsStep';
import { WeekStep } from './steps/WeekStep';

const STEP_COMPONENTS = [WeekStep, IngredientsStep, MealsStep, GroceryListStep, FeedbackStep];

export function App() {
  const { state, dispatch } = usePlanner();
  const Step = STEP_COMPONENTS[state.currentStep] ?? WeekStep;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.currentStep]);

  const goTo = (step: number) => dispatch({ type: 'goToStep', step });

  const startOver = () => {
    if (window.confirm('Start over? This clears your answers, ingredients, meals and grocery list on this device.')) {
      dispatch({ type: 'reset' });
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <div>
            <p className="site-header__brand">The Hair Loss Nutritionist</p>
            <h1>Healthy Hair Grocery Planner</h1>
          </div>
          <button type="button" className="btn btn--ghost btn--small no-print" onClick={startOver}>
            Start over
          </button>
        </div>
      </header>

      <div className="container">
        <StepNav current={state.currentStep} onSelect={goTo} />
        <main id="main" className="main">
          {/* key remounts the step so its heading receives focus */}
          <Step key={state.currentStep} />
        </main>
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
