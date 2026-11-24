import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, errorMessage } from '@/lib/api';
import { plural, timeAgo } from '@/lib/format';

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api()', () => {
  it('sends the login cookie with every call', async () => {
    const fetchMock = vi.fn(async () => reply({ ok: true }, 200));
    vi.stubGlobal('fetch', fetchMock);
    await api('/requests');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/requests'), expect.objectContaining({ credentials: 'include' }));
  });

  it('turns the API error shape into an ApiError with code and details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['title is too short'] } }, 400)));
    const error = await api('/requests', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details: ['title is too short'] });
    expect(errorMessage(error)).toBe('title is too short');
  });

  it('reports an unreachable server in plain words', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const error = await api('/requests').catch((e) => e);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(errorMessage(error)).toMatch(/cannot reach the server/i);
  });

  it('handles an empty 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('never shows raw internals for an unknown error', () => {
    expect(errorMessage(new Error('stack trace with secrets'))).toBe('Something went wrong. Try again.');
  });
});

describe('format helpers', () => {
  it('describes times in plain words', () => {
    const now = new Date('2026-11-23T12:00:00Z').getTime();
    expect(timeAgo('2026-11-23T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-11-23T10:00:00Z', now)).toBe('2 hours ago');
    expect(timeAgo('2026-11-20T12:00:00Z', now)).toBe('3 days ago');
  });

  it('pluralises', () => {
    expect(plural(1, 'vote')).toBe('1 vote');
    expect(plural(0, 'comment')).toBe('0 comments');
  });
});
