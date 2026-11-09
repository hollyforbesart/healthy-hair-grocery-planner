import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Shows a "← {backLabel}" button instead of the × (e.g. "Back to your plan"). */
  backLabel?: string;
}

/** A panel that slides up from the bottom on phones (centered on bigger screens). */
export function Sheet({ title, onClose, children, backLabel }: SheetProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The latest onClose, so the effect below runs once per opening, not on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    // Focus goes back to whatever opened the sheet when it closes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="week-sheet-backdrop" onClick={onClose}>
      <div className="week-sheet" role="dialog" aria-modal="true" aria-labelledby="week-sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="week-sheet__head">
          {backLabel && (
            <button type="button" className="week-sheet__back" onClick={onClose}>
              <span aria-hidden="true">←</span> {backLabel}
            </button>
          )}
          <h3 id="week-sheet-title" tabIndex={-1} ref={headingRef} className={backLabel ? 'visually-hidden' : undefined}>
            {title}
          </h3>
          {!backLabel && (
            <button type="button" className="week-sheet__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div className="week-sheet__body">{children}</div>
      </div>
    </div>
  );
}
