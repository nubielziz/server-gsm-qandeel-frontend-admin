// Tests for the chain draft hook: it starts from the server's chain, tracks edits, and follows a new chain only while untouched.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChainStep, SupplierService } from '../types';
import { useLinksDraft } from './useLinksDraft';

const step = (priority: number, supplierId: number, supplierName: string, service: number): ChainStep => ({
  priority,
  supplierId,
  supplierName,
  supplierServiceId: service,
  supplierServiceName: `Service ${service}`,
});

const chain: ChainStep[] = [step(1, 3, 'Rapid IMEI', 10), step(2, 1, 'Nordic GSM', 20)];
const names = (steps: readonly { supplierName: string }[]) => steps.map((item) => item.supplierName);
const offered = { id: 30, name: 'Octoplus Credits x25' } as SupplierService;

describe('useLinksDraft', () => {
  it('starts from the chain in order and is not dirty', () => {
    const { result } = renderHook(() => useLinksDraft(chain));
    expect(names(result.current.steps)).toEqual(['Rapid IMEI', 'Nordic GSM']);
    expect(result.current.dirty).toBe(false);
  });

  it('moves and removes places, and is clean again when the first order is back', () => {
    const { result } = renderHook(() => useLinksDraft(chain));
    act(() => result.current.move(1, 0));
    expect(names(result.current.steps)).toEqual(['Nordic GSM', 'Rapid IMEI']);
    expect(result.current.dirty).toBe(true);
    act(() => result.current.move(1, 0));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.remove(0));
    expect(names(result.current.steps)).toEqual(['Nordic GSM']);
    expect(result.current.dirty).toBe(true);
  });

  it('adds a supplier without a service (already dirty), then takes the service the person picks', () => {
    const { result } = renderHook(() => useLinksDraft(chain));
    act(() => result.current.add({ id: 2, name: 'Gulf Server Hub' }));
    const added = result.current.steps[2];
    expect(added).toMatchObject({ supplierId: 2, supplierServiceId: null });
    expect(result.current.dirty).toBe(true);
    act(() => result.current.pick(added.key, offered));
    expect(result.current.steps[2]).toMatchObject({
      supplierServiceId: 30,
      supplierServiceName: offered.name,
    });
  });

  it('follows a new chain from the server while the draft is untouched', () => {
    const { result, rerender } = renderHook(({ current }) => useLinksDraft(current), {
      initialProps: { current: chain },
    });
    rerender({ current: [step(1, 1, 'Nordic GSM', 20)] });
    expect(names(result.current.steps)).toEqual(['Nordic GSM']);
    expect(result.current.dirty).toBe(false);
  });

  it('keeps the edits of the person when a new chain arrives, and works out dirty against the new chain', () => {
    const { result, rerender } = renderHook(({ current }) => useLinksDraft(current), {
      initialProps: { current: chain },
    });
    act(() => result.current.move(1, 0));
    // The same order the person made is saved: the draft equals the new chain, so nothing is left to save.
    rerender({ current: [step(1, 1, 'Nordic GSM', 20), step(2, 3, 'Rapid IMEI', 10)] });
    expect(names(result.current.steps)).toEqual(['Nordic GSM', 'Rapid IMEI']);
    expect(result.current.dirty).toBe(false);

    act(() => result.current.remove(1));
    // Someone else changed the chain meanwhile: the edit stays and the draft is still unsaved.
    rerender({ current: [step(1, 4, 'FileForge', 40)] });
    expect(names(result.current.steps)).toEqual(['Nordic GSM']);
    expect(result.current.dirty).toBe(true);
  });
});
