// Tests for safeDestination: `?to=` accepted only for in-app paths (no open redirects).
import { describe, expect, it } from 'vitest';
import { safeDestination, withDestination } from './destination';

describe('safeDestination', () => {
  it.each(['/orders', '/orders?tab=review&status=requested', '/merchants/12', '/finance#top'])(
    'keeps the console path %s',
    (path) => {
      expect(safeDestination(path)).toBe(path);
    },
  );

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an empty string', ''],
    ['another site', 'https://evil.example/steal'],
    ['a protocol-relative address', '//evil.example'],
    ['a relative path', 'orders'],
    ['a backslash trick', '/\\evil.example'],
    ['a tab that browsers drop from URLs', '/\t/evil.example'],
    ['a line break', '/orders\n/evil'],
    ['a javascript URL', 'javascript:alert(1)'],
  ])('rejects %s', (_label, value) => {
    expect(safeDestination(value)).toBeUndefined();
  });

  it.each(['/login', '/login/2fa', '/login/setup-2fa', '/set-password', '/login?reason=ip'])(
    'never returns to the sign-in screen %s',
    (path) => {
      expect(safeDestination(path)).toBeUndefined();
    },
  );
});

describe('withDestination', () => {
  it('adds the destination as an encoded `to` parameter', () => {
    expect(withDestination('/login/2fa', '/orders?tab=review')).toBe(
      '/login/2fa?to=%2Forders%3Ftab%3Dreview',
    );
  });

  it("keeps the path's own query", () => {
    expect(withDestination('/login?reason=ip', '/risk')).toBe('/login?reason=ip&to=%2Frisk');
  });

  it('replaces an earlier destination', () => {
    expect(withDestination('/login?to=%2Fold', '/new')).toBe('/login?to=%2Fnew');
  });

  it('returns the path unchanged without a destination', () => {
    expect(withDestination('/login/2fa', undefined)).toBe('/login/2fa');
  });
});
