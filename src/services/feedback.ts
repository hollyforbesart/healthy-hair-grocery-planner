export interface FeedbackPayload {
  rating: number | null;
  wish: string;
  submittedAt: string;
  appVersion: string;
}

export type FeedbackResult = { ok: true } | { ok: false; error: string };

export interface FeedbackService {
  /** False until a real collection endpoint is configured. */
  readonly isConfigured: boolean;
  submit(payload: FeedbackPayload): Promise<FeedbackResult>;
}

export const APP_VERSION = '1.0.0';

/**
 * Posts feedback as JSON to `endpoint`. With no endpoint the service reports
 * itself as not configured and refuses to submit — the UI must never claim
 * feedback was sent when it wasn't.
 */
export function createFeedbackService(endpoint: string | undefined, fetchImpl: typeof fetch = (...args) => fetch(...args)): FeedbackService {
  const url = endpoint?.trim();
  if (!url) {
    return {
      isConfigured: false,
      submit: async () => ({ ok: false, error: 'Feedback sending is not connected yet.' }),
    };
  }
  return {
    isConfigured: true,
    submit: async (payload) => {
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return response.ok ? { ok: true } : { ok: false, error: `The server responded with ${response.status}.` };
      } catch {
        return { ok: false, error: 'We couldn’t reach the feedback service. Please try again later.' };
      }
    },
  };
}

export const feedbackService = createFeedbackService(import.meta.env.VITE_FEEDBACK_ENDPOINT);
