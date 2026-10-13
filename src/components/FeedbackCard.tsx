import { useRef, useState } from 'react';
import { APP_VERSION, feedbackService } from '../services/feedback';
import { usePlanner } from '../state/PlannerContext';

const RATINGS = [
  { value: 1, label: 'Not helpful' },
  { value: 2, label: 'A little helpful' },
  { value: 3, label: 'Somewhat helpful' },
  { value: 4, label: 'Helpful' },
  { value: 5, label: 'Very helpful' },
];

type SendState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** Optional feedback at the bottom of the grocery list, sent through Web3Forms. */
export function FeedbackCard() {
  const { state, dispatch } = usePlanner();
  const { rating, helpful, wish } = state.feedback;
  const [send, setSend] = useState<SendState>({ kind: 'idle' });
  const honeypotRef = useRef<HTMLInputElement>(null);
  const canSend = feedbackService.isConfigured;
  const hasContent = rating !== null || helpful.trim().length > 0 || wish.trim().length > 0;

  const submit = async () => {
    if (!canSend || !hasContent) return;
    setSend({ kind: 'sending' });
    const result = await feedbackService.submit({
      rating,
      helpful: helpful.trim(),
      wish: wish.trim(),
      submittedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      botcheck: honeypotRef.current?.checked ?? false,
    });
    if (result.ok) {
      setSend({ kind: 'sent' });
      dispatch({ type: 'updateFeedback', patch: { rating: null, helpful: '', wish: '' } });
    } else {
      setSend({ kind: 'error', message: result.error });
    }
  };

  return (
    <section className="card feedback-card no-print" aria-labelledby="feedback-title">
      <h3 id="feedback-title">How did the planner work for you?</h3>
      <p className="small muted">Optional. Your answers help shape what comes next.</p>

      {send.kind === 'sent' ? (
        <div className="notice" role="status">
          <p>Thank you — your feedback was sent.</p>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset>
            <legend>How helpful was this planner?</legend>
            <div className="rating">
              {RATINGS.map((r) => (
                <label key={r.value} className="rating__option">
                  <input
                    type="radio"
                    name="rating"
                    value={r.value}
                    checked={rating === r.value}
                    onChange={() => dispatch({ type: 'updateFeedback', patch: { rating: r.value } })}
                  />
                  <span className="rating__num" aria-hidden="true">{r.value}</span>
                  <span className="rating__label">{r.label}</span>
                </label>
              ))}
            </div>
            {rating !== null && (
              <button type="button" className="link-btn small" onClick={() => dispatch({ type: 'updateFeedback', patch: { rating: null } })}>
                Clear rating
              </button>
            )}
          </fieldset>

          <div className="field">
            <label htmlFor="helpful">What made this planner helpful?</label>
            <textarea
              id="helpful"
              rows={4}
              maxLength={2000}
              value={helpful}
              onChange={(e) => dispatch({ type: 'updateFeedback', patch: { helpful: e.target.value } })}
            />
          </div>

          <div className="field">
            <label htmlFor="wish">What do you wish this planner could also do?</label>
            <textarea
              id="wish"
              rows={5}
              maxLength={2000}
              value={wish}
              onChange={(e) => dispatch({ type: 'updateFeedback', patch: { wish: e.target.value } })}
            />
          </div>

          {/* Spam trap: hidden from people, sometimes filled in by bots. */}
          <input ref={honeypotRef} type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />

          {canSend ? (
            <div className="button-row">
              <button type="submit" className="btn btn--primary" disabled={!hasContent || send.kind === 'sending'}>
                {send.kind === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
              {!hasContent && <p className="small muted">Choose a rating or answer a question to send.</p>}
            </div>
          ) : (
            <div className="notice" role="note">
              <p>
                <strong>Feedback sending isn’t connected yet.</strong> Your answers are saved on this device only and
                have not been sent to anyone.
              </p>
            </div>
          )}

          {send.kind === 'error' && (
            <p className="error" role="alert">
              {send.message} Your answers are still saved on this device.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
