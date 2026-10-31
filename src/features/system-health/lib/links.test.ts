// Tests for links.ts: a deep link exists only when its address is set in the env.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deepLinkBase, deepLinkUrl } from './links';

afterEach(() => vi.unstubAllEnvs());

describe('deepLinkBase', () => {
  it('is null when the address is unset, empty or blank', () => {
    vi.stubEnv('VITE_GRAFANA_URL', '');
    expect(deepLinkBase('grafana')).toBeNull();
    vi.stubEnv('VITE_GRAFANA_URL', '   ');
    expect(deepLinkBase('grafana')).toBeNull();
  });

  it('is null for an address that is not http or https', () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'javascript:alert(1)');
    expect(deepLinkBase('grafana')).toBeNull();
  });

  it('reads each tool from its own variable and drops the trailing slash', () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/');
    vi.stubEnv('VITE_SENTRY_URL', ' https://sentry.example.com/org/gsm// ');
    vi.stubEnv('VITE_BULL_BOARD_URL', 'http://localhost:3000/admin/queues');
    expect(deepLinkBase('grafana')).toBe('https://grafana.example.com');
    expect(deepLinkBase('sentry')).toBe('https://sentry.example.com/org/gsm');
    expect(deepLinkBase('bullBoard')).toBe('http://localhost:3000/admin/queues');
  });
});

describe('deepLinkUrl', () => {
  it('is null for every tool while nothing is configured', () => {
    vi.stubEnv('VITE_GRAFANA_URL', '');
    vi.stubEnv('VITE_SENTRY_URL', '');
    vi.stubEnv('VITE_BULL_BOARD_URL', '');
    expect(deepLinkUrl('grafana')).toBeNull();
    expect(deepLinkUrl('sentry', 'https://sentry.example.com/issues/1')).toBeNull();
    expect(deepLinkUrl('bullBoard', 'queue/dispatch')).toBeNull();
  });

  it('is the configured address when there is no path', () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/');
    expect(deepLinkUrl('grafana')).toBe('https://grafana.example.com');
    expect(deepLinkUrl('grafana', '')).toBe('https://grafana.example.com');
    expect(deepLinkUrl('grafana', null)).toBe('https://grafana.example.com');
  });

  it('adds the path to the configured address, once', () => {
    vi.stubEnv('VITE_BULL_BOARD_URL', 'https://api.example.com/admin/queues/');
    expect(deepLinkUrl('bullBoard', 'queue/order-dispatch')).toBe(
      'https://api.example.com/admin/queues/queue/order-dispatch',
    );
    expect(deepLinkUrl('bullBoard', '/queue/order-dispatch')).toBe(
      'https://api.example.com/admin/queues/queue/order-dispatch',
    );
  });

  it('uses a full address from the server as it is, but only while the tool is configured', () => {
    vi.stubEnv('VITE_SENTRY_URL', 'https://sentry.example.com/org/gsm');
    expect(deepLinkUrl('sentry', 'https://sentry.example.com/issues/42/')).toBe(
      'https://sentry.example.com/issues/42/',
    );
    vi.stubEnv('VITE_SENTRY_URL', '');
    expect(deepLinkUrl('sentry', 'https://sentry.example.com/issues/42/')).toBeNull();
  });

  it('treats a script address from the server as a plain path under the configured address', () => {
    vi.stubEnv('VITE_SENTRY_URL', 'https://sentry.example.com');
    expect(deepLinkUrl('sentry', 'javascript:alert(1)')).toBe(
      'https://sentry.example.com/javascript:alert(1)',
    );
  });
});
