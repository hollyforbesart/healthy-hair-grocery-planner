export interface FeedbackPayload {
  rating: number | null;
  wish: string;
  submittedAt: string;
  appVersion: string;
  /** Honeypot: true only if a bot filled the hidden field. */
  botcheck?: boolean;
}

export type FeedbackResult = { ok: true } | { ok: false; error: string };

export interface FeedbackService {
  /** False until a real collection service is configured. */
  readonly isConfigured: boolean;
  submit(payload: FeedbackPayload): Promise<FeedbackResult>;
}

export interface FeedbackConfig {
  /** Web3Forms access key (public by design — it can only send to your inbox). */
  web3formsAccessKey?: string;
  /** Any other endpoint that accepts a JSON POST of FeedbackPayload. */
  endpoint?: string;
}

export const APP_VERSION = '1.1.0';
export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';

const RATING_LABELS: Record<number, string> = {
  1: 'Not helpful',
  2: 'A little helpful',
  3: 'Somewhat helpful',
  4: 'Helpful',
  5: 'Very helpful',
};

const NETWORK_ERROR = 'We couldn’t reach the feedback service. Please try again later.';

/** Shape Web3Forms emails nicely: each field becomes a labelled line. */
export function toWeb3FormsBody(accessKey: string, payload: FeedbackPayload) {
  return {
    access_key: accessKey,
    subject: 'New feedback: Healthy Hair Grocery Planner',
    from_name: 'Healthy Hair Grocery Planner',
    'Helpfulness rating': payload.rating ? `${payload.rating}/5 (${RATING_LABELS[payload.rating]})` : 'Not answered',
    'What do you wish this planner could also do?': payload.wish || 'Not answered',
    'Submitted at': payload.submittedAt,
    'App version': payload.appVersion,
    botcheck: payload.botcheck ?? false,
  };
}

/**
 * Picks the configured feedback backend. With nothing configured the service
 * reports itself as not configured and refuses to submit — the UI must never
 * claim feedback was sent when it wasn't.
 */
export function createFeedbackService(
  config: FeedbackConfig,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): FeedbackService {
  const accessKey = config.web3formsAccessKey?.trim();
  const endpoint = config.endpoint?.trim();

  if (accessKey) {
    return {
      isConfigured: true,
      submit: async (payload) => {
        try {
          const response = await fetchImpl(WEB3FORMS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(toWeb3FormsBody(accessKey, payload)),
          });
          const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
          if (response.ok && data?.success) return { ok: true };
          return { ok: false, error: data?.message || `The feedback service responded with ${response.status}.` };
        } catch {
          return { ok: false, error: NETWORK_ERROR };
        }
      },
    };
  }

  if (endpoint) {
    return {
      isConfigured: true,
      submit: async (payload) => {
        try {
          const response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          return response.ok ? { ok: true } : { ok: false, error: `The server responded with ${response.status}.` };
        } catch {
          return { ok: false, error: NETWORK_ERROR };
        }
      },
    };
  }

  return {
    isConfigured: false,
    submit: async () => ({ ok: false, error: 'Feedback sending is not connected yet.' }),
  };
}

export const feedbackService = createFeedbackService({
  web3formsAccessKey: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
  endpoint: import.meta.env.VITE_FEEDBACK_ENDPOINT,
});
