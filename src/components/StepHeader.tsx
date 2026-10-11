import { useEffect, useRef, type ReactNode } from 'react';

interface StepHeaderProps {
  step: number;
  title: string;
  children?: ReactNode;
}

/** Step title that receives focus when the step changes, for keyboard and screen-reader users. */
export function StepHeader({ step, title, children }: StepHeaderProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="step-header">
      <p className="step-header__eyebrow">Step {step}</p>
      <h2 id="step-title" ref={ref} tabIndex={-1}>
        {title}
      </h2>
      {children && <div className="step-header__intro">{children}</div>}
    </header>
  );
}
