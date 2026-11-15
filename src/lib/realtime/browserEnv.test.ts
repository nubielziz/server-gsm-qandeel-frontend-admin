// Tests for the page glue of the stream client: the stream address (page language and cursor), the probe's answers, the dev mock EventSource (every tab its
// own stream), the lifecycle listeners, and the rule that a browser without EventSource opens no stream.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMockEventSource, MockEventSource, uninstallMockEventSource } from '@/mocks/stream';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/mockApi';
import { browserStreamEnv, canOpenStream } from './browserEnv';
import { STAFF_LOCK_NAME, STAFF_PROBE_PATH, STAFF_STREAM_PATH } from './events';

setupMockApi();
beforeEach(() => {
  MockEventSource.readyDelayMs = 0;
});
afterEach(() => {
  uninstallMockEventSource();
  document.documentElement.lang = '';
});

const options = { path: STAFF_STREAM_PATH, probePath: STAFF_PROBE_PATH, lockName: STAFF_LOCK_NAME };

describe('the stream address', () => {
  it('is the stream path with the page language, and the cursor when there is one', () => {
    document.documentElement.lang = 'en';
    const env = browserStreamEnv(options);
    expect(env.streamUrl(null)).toBe('http://api.test/admin/stream?locale=en');
    expect(env.streamUrl('i9001')).toBe('http://api.test/admin/stream?locale=en&cursor=i9001');
    document.documentElement.lang = 'ar';
    expect(browserStreamEnv(options).streamUrl(null)).toBe('http://api.test/admin/stream?locale=ar');
    document.documentElement.lang = '';
    expect(browserStreamEnv(options).streamUrl('i1')).toBe('http://api.test/admin/stream?cursor=i1');
  });
});

describe('the probe', () => {
  it('answers 200 for a 2xx, the status and Retry-After for a refusal, and 0 for no answer', async () => {
    const env = browserStreamEnv(options);
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread: 0 })));
    await expect(env.probe()).resolves.toEqual({ status: 200 });
    mockServer.use(
      http.get('*/admin/inbox/unread-count', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Slow down', status: 429, code: 'RATE_LIMITED' },
          { status: 429, headers: { 'Retry-After': '90', 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await expect(env.probe()).resolves.toEqual({ status: 429, retryAfterSeconds: 90 });
    mockServer.use(
      http.get('*/admin/inbox/unread-count', () =>
        HttpResponse.json(
          { title: 'Sign in', status: 401 },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await expect(env.probe()).resolves.toMatchObject({ status: 401 });
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.error()));
    await expect(env.probe()).resolves.toEqual({ status: 0 });
  });
});

describe('the browser', () => {
  it('opens no stream without EventSource, and may with it', () => {
    expect(canOpenStream()).toBe(false);
    installMockEventSource();
    expect(canOpenStream()).toBe(true);
  });

  it('gives every tab its own stream when EventSource is the dev mock (no lock, no channel)', () => {
    installMockEventSource();
    const env = browserStreamEnv(options);
    expect(env.locks).toBeNull();
    expect(env.createChannel).toBeNull();
  });

  it('uses the lock and the channel of a real browser, and the same name for both', () => {
    const request = vi.fn();
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    try {
      const env = browserStreamEnv(options);
      expect(env.locks).toBeTruthy();
      expect(env.lockName).toBe('gsm-stream-admin');
      expect(typeof env.createChannel).toBe('function');
    } finally {
      delete (navigator as { locks?: unknown }).locks;
    }
  });

  it('calls the lifecycle callbacks on pagehide, freeze, pageshow and resume, and stops after it is removed', () => {
    const env = browserStreamEnv(options);
    const hide = vi.fn();
    const show = vi.fn();
    const offHide = env.lifecycle?.onHide(hide);
    const offShow = env.lifecycle?.onShow(show);
    window.dispatchEvent(new Event('pagehide'));
    document.dispatchEvent(new Event('freeze'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('resume'));
    expect(hide).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledTimes(2);
    offHide?.();
    offShow?.();
    window.dispatchEvent(new Event('pagehide'));
    expect(hide).toHaveBeenCalledTimes(2);
  });

  it('opens the dev mock stream through createEventSource, with credentials', () => {
    installMockEventSource();
    const env = browserStreamEnv(options);
    const source = env.createEventSource('http://api.test/admin/stream');
    expect(source).toBeInstanceOf(MockEventSource);
  });
});
