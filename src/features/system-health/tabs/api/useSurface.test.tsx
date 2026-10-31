// Tests for useSurface: `?surface=` is read as the picked surface, set and cleared, and the other parameters stay.
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { parseSurface, useSurface } from './useSurface';

function openAt(route: string) {
  let search = '';
  function Probe() {
    search = useLocation().search;
    return null;
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <Probe />
        {children}
      </MemoryRouter>
    );
  }
  const view = renderHook(() => useSurface(), { wrapper: Wrapper });
  return { view, search: () => search };
}

describe('parseSurface', () => {
  it('reads blank text and a missing parameter as no surface', () => {
    expect(parseSurface(null)).toBeUndefined();
    expect(parseSurface('')).toBeUndefined();
    expect(parseSurface('   ')).toBeUndefined();
  });

  it('keeps the key as written, trimmed, and leaves unknown keys to the server', () => {
    expect(parseSurface('v1')).toBe('v1');
    expect(parseSurface(' dhru ')).toBe('dhru');
    expect(parseSurface('nope')).toBe('nope');
  });
});

describe('useSurface', () => {
  it('has no surface without the parameter', () => {
    const { view } = openAt('/system-health?tab=api');
    expect(view.result.current[0]).toBeUndefined();
  });

  it('reads the surface from the address', () => {
    const { view } = openAt('/system-health?tab=api&surface=dhru');
    expect(view.result.current[0]).toBe('dhru');
  });

  it('sets the surface and keeps the tab and the range', () => {
    const { view, search } = openAt('/system-health?tab=api&range=7d');
    act(() => view.result.current[1]('v1'));
    expect(view.result.current[0]).toBe('v1');
    const params = new URLSearchParams(search());
    expect(params.get('surface')).toBe('v1');
    expect(params.get('tab')).toBe('api');
    expect(params.get('range')).toBe('7d');
  });

  it('clears the surface with undefined and keeps the rest', () => {
    const { view, search } = openAt('/system-health?tab=api&range=1h&surface=client');
    act(() => view.result.current[1](undefined));
    expect(view.result.current[0]).toBeUndefined();
    expect(search()).toBe('?tab=api&range=1h');
  });
});
