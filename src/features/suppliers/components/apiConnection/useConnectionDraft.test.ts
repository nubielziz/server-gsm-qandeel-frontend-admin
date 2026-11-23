// Tests for the draft of the API Connection part: the chain seen as a primary connection and the secondary ones, and the one move it adds to
// the links draft, changing the primary.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChainStep } from '../../types';
import { useConnectionDraft } from './useConnectionDraft';

const step = (priority: number, supplierId: number, supplierName: string, service: number): ChainStep => ({
  priority,
  supplierId,
  supplierName,
  supplierServiceId: service,
  supplierServiceName: `Service ${service}`,
});

const chain: ChainStep[] = [
  step(1, 3, 'Rapid IMEI', 10),
  step(2, 1, 'Nordic GSM', 20),
  step(3, 4, 'FileForge', 40),
];
const names = (steps: readonly { supplierName: string }[]) => steps.map((item) => item.supplierName);
const gulf = { id: 2, name: 'Gulf Server Hub' };

describe('useConnectionDraft', () => {
  it('splits the chain into the primary connection and the secondary ones, and is not dirty', () => {
    const { result } = renderHook(() => useConnectionDraft(chain));
    expect(result.current.primary?.supplierName).toBe('Rapid IMEI');
    expect(names(result.current.secondary)).toEqual(['Nordic GSM', 'FileForge']);
    expect(result.current.dirty).toBe(false);
  });

  it('has no primary connection for an empty chain', () => {
    const { result } = renderHook(() => useConnectionDraft([]));
    expect(result.current.primary).toBeNull();
    expect(result.current.secondary).toEqual([]);
  });

  it('puts a new supplier in the first place without a service, and keeps the secondary ones in their order', () => {
    const { result } = renderHook(() => useConnectionDraft(chain));
    act(() => result.current.setPrimary(gulf));
    expect(names(result.current.steps)).toEqual(['Gulf Server Hub', 'Nordic GSM', 'FileForge']);
    expect(result.current.primary).toMatchObject({ supplierId: 2, supplierServiceId: null });
    expect(result.current.dirty).toBe(true);
  });

  it('starts the chain of a service that has none: the supplier chosen is the primary connection', () => {
    const { result } = renderHook(() => useConnectionDraft([]));
    act(() => result.current.setPrimary(gulf));
    expect(names(result.current.steps)).toEqual(['Gulf Server Hub']);
    expect(result.current.primary?.supplierServiceId).toBeNull();
  });

  it('takes the primary out only when no secondary connection would be promoted by it', () => {
    const { result } = renderHook(() => useConnectionDraft(chain));
    act(() => result.current.setPrimary(null));
    expect(names(result.current.steps)).toEqual(['Rapid IMEI', 'Nordic GSM', 'FileForge']);
    act(() => result.current.remove(2));
    act(() => result.current.remove(1));
    act(() => result.current.setPrimary(null));
    expect(result.current.steps).toEqual([]);
    expect(result.current.dirty).toBe(true);
  });

  it('adds a secondary connection at the end and moves the first one up into the primary place', () => {
    const { result } = renderHook(() => useConnectionDraft(chain));
    act(() => result.current.add(gulf));
    expect(names(result.current.secondary)).toEqual(['Nordic GSM', 'FileForge', 'Gulf Server Hub']);
    act(() => result.current.move(1, 0));
    expect(result.current.primary?.supplierName).toBe('Nordic GSM');
    expect(names(result.current.secondary)).toEqual(['Rapid IMEI', 'FileForge', 'Gulf Server Hub']);
  });
});
