import { STEP_LABELS, type StepId } from '../state/steps';

interface StepNavProps {
  steps: StepId[];
  current: StepId;
  onSelect: (step: StepId) => void;
}

export function StepNav({ steps, current, onSelect }: StepNavProps) {
  const currentIndex = steps.indexOf(current);
  return (
    <nav className="step-nav no-print" aria-label="Planner steps">
      <ol style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, index) => (
          <li key={step}>
            <button
              type="button"
              className={`step-nav__btn${step === current ? ' is-current' : ''}${index < currentIndex ? ' is-done' : ''}`}
              aria-current={step === current ? 'step' : undefined}
              onClick={() => onSelect(step)}
            >
              <span className="step-nav__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="step-nav__label">
                <span className="visually-hidden">Step {index + 1}: </span>
                {STEP_LABELS[step]}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="step-nav__mobile" aria-hidden="true">
        Step {currentIndex + 1} of {steps.length} · {STEP_LABELS[current]}
      </p>
    </nav>
  );
}
