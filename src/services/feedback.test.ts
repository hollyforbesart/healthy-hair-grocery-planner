import { describe, expect, it, vi } from 'vitest';
import { WEB3FORMS_URL, createFeedbackService } from './feedback';

const payload = { rating: 4, wish: 'Weekly plans', submittedAt: '2026-01-01T00:00:00Z', appVersion: '1.1.0' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createFeedbackService', () => {
  it('is not configured and never reports success with nothing set', async () => {
    const service = createFeedbackService({});
    expect(service.isConfigured).toBe(false);
    expect((await service.submit(payload)).ok).toBe(false);
  });

  it('sends to Web3Forms with the access key and readable fields', async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ success: true }));
    const service = createFeedbackService({ web3formsAccessKey: 'test-key' }, fetchImpl as typeof fetch);
    expect(service.isConfigured).toBe(true);
    expect(await service.submit(payload)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(WEB3FORMS_URL);
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      access_key: 'test-key',
      'Helpfulness rating': '4/5 (Helpful)',
      'What do you wish this planner could also do?': 'Weekly plans',
      botcheck: false,
    });
  });

  it('reports Web3Forms rejections honestly', async () => {
    const service = createFeedbackService(
      { web3formsAccessKey: 'bad' },
      async () => json({ success: false, message: 'Invalid access key' }, 400),
    );
    expect(await service.submit(payload)).toEqual({ ok: false, error: 'Invalid access key' });
  });

  it('reports network failures honestly', async () => {
    const service = createFeedbackService({ web3formsAccessKey: 'k' }, async () => {
      throw new TypeError('offline');
    });
    expect((await service.submit(payload)).ok).toBe(false);
  });

  it('falls back to a generic JSON endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const service = createFeedbackService({ endpoint: 'https://example.com/feedback' }, fetchImpl);
    expect(await service.submit(payload)).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com/feedback', expect.objectContaining({ method: 'POST' }));
  });
});
