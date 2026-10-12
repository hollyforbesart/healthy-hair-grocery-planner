import { useEffect, useRef, type ReactNode } from 'react';
import { useStepNav } from '../hooks/useStepNav';

interface StepHeaderProps {
  title: string;
  children?: ReactNode;
}

/** Step title that receives focus when the step changes, for keyboard and screen-reader users. */
export function StepHeader({ title, children }: StepHeaderProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { number } = useStepNav();
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="step-header">
      <p className="step-header__eyebrow">Step {number}</p>
      <h2 id="step-title" ref={ref} tabIndex={-1}>
        {title}
      </h2>
      {children && <div className="step-header__intro">{children}</div>}
    </header>
  );
}
