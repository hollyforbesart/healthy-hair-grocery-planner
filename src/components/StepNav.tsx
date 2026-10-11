import { STEPS } from '../state/plannerReducer';

interface StepNavProps {
  current: number;
  onSelect: (step: number) => void;
}

export function StepNav({ current, onSelect }: StepNavProps) {
  return (
    <nav className="step-nav no-print" aria-label="Planner steps">
      <ol>
        {STEPS.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className={`step-nav__btn${index === current ? ' is-current' : ''}${index < current ? ' is-done' : ''}`}
              aria-current={index === current ? 'step' : undefined}
              onClick={() => onSelect(index)}
            >
              <span className="step-nav__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="step-nav__label">
                <span className="visually-hidden">Step {index + 1}: </span>
                {step.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="step-nav__mobile" aria-hidden="true">
        Step {current + 1} of {STEPS.length} · {STEPS[current].label}
      </p>
    </nav>
  );
}
