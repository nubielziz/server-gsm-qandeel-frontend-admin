// Tests for the state of the Add services frame: what is marked, the hand-over to a path and back, and the opening address that starts a
// path at once, only once the list is loaded and only for a supplier that can be chosen.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AddFlowInitial } from './addFlowChoice';
import type { Supplier } from '../../types';
import { useAddFlowChoice } from './useAddFlowChoice';

const supplier = (id: number, name: string, status: Supplier['status'] = 'active') =>
  ({ id, name, status }) as Supplier;

const NORDIC = supplier(1, 'Nordic GSM');
const GULF = supplier(2, 'Gulf Server Hub');
const OFF = supplier(3, 'Rapid IMEI', 'disabled');

type Props = { suppliers: readonly Supplier[]; loaded: boolean };

/** The hook with a list that changes between renders, as the real list does while it loads. */
function setup(initial?: AddFlowInitial, props: Props = { suppliers: [], loaded: false }) {
  return renderHook((current: Props) => useAddFlowChoice(initial, current.suppliers, current.loaded), {
    initialProps: props,
  });
}

describe('marking and choosing', () => {
  it('marks a supplier, hands over to the way picked, and returns with the supplier still marked', () => {
    const { result } = setup(undefined, { suppliers: [NORDIC, GULF], loaded: true });
    expect(result.current.marked).toBeUndefined();

    act(() => result.current.mark(2));
    expect(result.current.marked).toBe(GULF);

    act(() => result.current.pick('services'));
    expect(result.current.chosen).toEqual({ supplier: GULF, from: 'services' });

    act(() => result.current.back());
    expect(result.current.chosen).toBeNull();
    expect(result.current.marked).toBe(GULF);
  });

  it('ignores a way picked while no supplier is marked', () => {
    const { result } = setup(undefined, { suppliers: [NORDIC], loaded: true });
    act(() => result.current.pick('groups'));
    expect(result.current.chosen).toBeNull();
  });

  it('never marks a disabled supplier', () => {
    const { result } = setup(undefined, { suppliers: [OFF], loaded: true });
    act(() => result.current.mark(3));
    expect(result.current.marked).toBeUndefined();
    act(() => result.current.pick('groups'));
    expect(result.current.chosen).toBeNull();
  });
});

describe('the opening address', () => {
  it('waits for the list, then starts the path of the supplier and the way it names', () => {
    const { result, rerender } = setup({ supplierId: 2, from: 'groups' });
    expect(result.current.chosen).toBeNull();

    rerender({ suppliers: [NORDIC, GULF], loaded: true });
    expect(result.current.chosen).toEqual({ supplier: GULF, from: 'groups' });
    expect(result.current.notice).toBeUndefined();
  });

  it('keeps the supplier marked when the path is left with Back, and does not start it again', () => {
    const { result } = setup({ supplierId: 1, from: 'services' }, { suppliers: [NORDIC], loaded: true });
    expect(result.current.chosen).toEqual({ supplier: NORDIC, from: 'services' });

    act(() => result.current.back());
    expect(result.current.chosen).toBeNull();
    expect(result.current.marked).toBe(NORDIC);
  });

  it('marks the supplier and starts nothing when the address names no way', () => {
    const { result } = setup({ supplierId: 2 }, { suppliers: [NORDIC, GULF], loaded: true });
    expect(result.current.chosen).toBeNull();
    expect(result.current.marked).toBe(GULF);
    expect(result.current.notice).toBeUndefined();
  });

  it('gives a line, and no path, for a supplier the list does not have', () => {
    const { result } = setup({ supplierId: 99, from: 'groups' }, { suppliers: [NORDIC], loaded: true });
    expect(result.current.chosen).toBeNull();
    expect(result.current.notice).toBe(
      'That supplier is not among your connected suppliers. Pick one below.',
    );
  });

  it('gives a line, and no path, for a disabled supplier, and does not mark it', () => {
    const { result } = setup({ supplierId: 3, from: 'services' }, { suppliers: [NORDIC, OFF], loaded: true });
    expect(result.current.chosen).toBeNull();
    expect(result.current.marked).toBeUndefined();
    expect(result.current.notice).toMatch(/^Rapid IMEI is disabled/);
  });

  it('does not start the path later if the supplier is switched on after the first look at the list', () => {
    const { result, rerender } = setup(
      { supplierId: 3, from: 'services' },
      { suppliers: [OFF], loaded: true },
    );
    rerender({ suppliers: [supplier(3, 'Rapid IMEI')], loaded: true });
    expect(result.current.chosen).toBeNull();
  });

  it('drops the line once another supplier is marked', () => {
    const { result } = setup({ supplierId: 99, from: 'groups' }, { suppliers: [NORDIC], loaded: true });
    act(() => result.current.mark(1));
    expect(result.current.notice).toBeUndefined();
    expect(result.current.marked).toBe(NORDIC);
  });
});
