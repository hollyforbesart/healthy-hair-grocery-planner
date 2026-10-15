import { PATH_OPTIONS } from '../data/paths';
import { usePlanner } from '../state/PlannerContext';
import { Icon } from './Icon';
import { StepHeader } from './StepHeader';

/** Shown when someone opens /planner directly before choosing how to start. */
export function PathChooser() {
  const { dispatch } = usePlanner();
  return (
    <section aria-labelledby="step-title">
      <StepHeader title="How would you like to start?">
        <p>You can switch any time, and both end with one grocery list.</p>
      </StepHeader>
      <div className="home-paths">
        {PATH_OPTIONS.map((option, index) => (
          <div key={option.value} className="home-paths__item">
            {index > 0 && (
              <span className="home-paths__or" aria-hidden="true">
                or
              </span>
            )}
            <button type="button" className="path-option" onClick={() => dispatch({ type: 'choosePath', path: option.value })}>
              <Icon name={option.icon} size={32} className="path-option__icon" />
              <span className="path-option__title">{option.title}</span>
              <span className="path-option__text">{option.text}</span>
              <span className="path-option__best">{option.bestFor}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
