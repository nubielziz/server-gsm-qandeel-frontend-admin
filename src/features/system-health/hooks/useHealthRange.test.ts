// Tests for the range hook: it reads `?range=`, falls back to 24 hours for anything unknown, and writes the address
// without losing the other parameters.
import { act, renderHook } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { hookKit } from '../test/testKit';
import { DEFAULT_RANGE, HEALTH_RANGES, parseRange, useHealthRange } from './useHealthRange';

// The hook with the router's location beside it, so a test can read what was written to the address.
function useProbe() {
  const [range, setRange] = useHealthRange();
  return { range, setRange, location: useLocation() };
}

function probeAt(route: string) {
  const { Wrapper } = hookKit({ route });
  return renderHook(() => useProbe(), { wrapper: Wrapper });
}

describe('parseRange', () => {
  it('accepts the four ranges', () => {
    for (const range of HEALTH_RANGES) expect(parseRange(range)).toBe(range);
  });

  it('falls back to 24 hours for a missing or unknown value', () => {
    expect(DEFAULT_RANGE).toBe('24h');
    for (const raw of [null, '', '30d', '24H', 'week']) expect(parseRange(raw)).toBe('24h');
  });
});

describe('useHealthRange', () => {
  it('defaults to 24 hours when the address has no range', () => {
    expect(probeAt('/system-health').result.current.range).toBe('24h');
  });

  it('reads the range from the address', () => {
    expect(probeAt('/system-health?range=7d').result.current.range).toBe('7d');
  });

  it('falls back to 24 hours for a value that is not a choice', () => {
    expect(probeAt('/system-health?range=90d').result.current.range).toBe('24h');
  });

  it('writes the range and keeps the other parameters', () => {
    const { result } = probeAt('/system-health?tab=api');
    act(() => result.current.setRange('1h'));
    expect(result.current.range).toBe('1h');
    expect(new URLSearchParams(result.current.location.search).get('range')).toBe('1h');
    expect(new URLSearchParams(result.current.location.search).get('tab')).toBe('api');
  });

  it('leaves the default out of the address', () => {
    const { result } = probeAt('/system-health?tab=api&range=6h');
    act(() => result.current.setRange('24h'));
    expect(result.current.range).toBe('24h');
    expect(result.current.location.search).toBe('?tab=api');
  });
});
