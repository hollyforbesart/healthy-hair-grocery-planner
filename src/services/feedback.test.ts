import { describe, expect, it, vi } from 'vitest';
import { createFeedbackService } from './feedback';

const payload = { rating: 4, wish: 'Weekly plans', submittedAt: '2026-01-01T00:00:00Z', appVersion: '1.0.0' };

describe('createFeedbackService', () => {
  it('is not configured and never reports success without an endpoint', async () => {
    const service = createFeedbackService(undefined);
    expect(service.isConfigured).toBe(false);
    expect((await service.submit(payload)).ok).toBe(false);
  });

  it('posts JSON to the configured endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const service = createFeedbackService('https://example.com/feedback', fetchImpl);
    expect(await service.submit(payload)).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com/feedback', expect.objectContaining({ method: 'POST' }));
  });

  it('reports server errors honestly', async () => {
    const service = createFeedbackService('https://example.com/feedback', async () => new Response(null, { status: 500 }));
    expect((await service.submit(payload)).ok).toBe(false);
  });
});
