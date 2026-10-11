import type { ReactNode } from 'react';

interface StepFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  extra?: ReactNode;
}

export function StepFooter({ onBack, onNext, nextLabel = 'Continue', extra }: StepFooterProps) {
  return (
    <div className="step-footer no-print">
      {onBack ? (
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      <div className="step-footer__right">
        {extra}
        {onNext && (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
