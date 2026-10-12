import { usePlanner } from '../state/PlannerContext';
import { adjacentStep, stepsForPath, type StepId } from '../state/steps';

/** Back / next / jump helpers that follow the user's chosen path. */
export function useStepNav() {
  const { state, dispatch } = usePlanner();
  const steps = stepsForPath(state.path);
  const go = (step: StepId) => dispatch({ type: 'goToStep', step });
  const back = adjacentStep(state.path, state.currentStep, -1);
  const next = adjacentStep(state.path, state.currentStep, 1);
  return {
    steps,
    /** 1-based position of the current step on this path. */
    number: Math.max(steps.indexOf(state.currentStep), 0) + 1,
    go,
    goBack: back ? () => go(back) : undefined,
    goNext: next ? () => go(next) : undefined,
  };
}
