// Tests for the keys of the panel's sections: a section that keeps a snapshot in a form is mounted again from fresh data after a save,
// never while it holds unsaved changes, and never for data that merely arrives for the first time; the other sections keep their key.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PanelSectionId } from '../components/panel/types';
import { useSectionKeys, type PanelSignature } from './useSectionKeys';

type Props = { signature: PanelSignature; dirty: readonly PanelSectionId[] };

// The sections that keep a snapshot of the service in a form (the `remountOnChange` rows of the section list).
const REMOUNT: readonly PanelSectionId[] = ['details', 'prices'];

function setup(
  signature: PanelSignature,
  dirty: readonly PanelSectionId[] = [],
  remountable: readonly PanelSectionId[] = REMOUNT,
) {
  return renderHook((props: Props) => useSectionKeys(7, props.signature, props.dirty, remountable), {
    initialProps: { signature, dirty },
  });
}

describe('useSectionKeys', () => {
  it('gives each section the service and version 0 to start with', () => {
    const { result } = setup(['row', 'detail']);
    expect(result.current('details')).toBe('7-0');
    expect(result.current('activity')).toBe('7-0');
  });

  it('keeps the keys while the data stays the same', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: ['row', 'detail'], dirty: [] });
    expect(result.current('prices')).toBe('7-0');
  });

  it('raises every clean remountable section when the row changed', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: ['row changed', 'detail'], dirty: [] });
    expect(result.current('details')).toBe('7-1');
    expect(result.current('prices')).toBe('7-1');
  });

  it('raises every clean remountable section when the detail changed', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: ['row', 'detail changed'], dirty: [] });
    expect(result.current('details')).toBe('7-1');
  });

  it('never raises a section that is not remountable, so its focus and open dialogs stay', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: ['row changed', 'detail changed'], dirty: [] });
    for (const id of ['order-form', 'suppliers', 'shop', 'activity'] as const) {
      expect(result.current(id)).toBe('7-0');
    }
  });

  it('raises nothing when no section is remountable', () => {
    const { result, rerender } = setup(['row', 'detail'], [], []);
    rerender({ signature: ['row changed', 'detail'], dirty: [] });
    expect(result.current('details')).toBe('7-0');
  });

  it('leaves the key of a section that holds unsaved changes, so its form stays', () => {
    const { result, rerender } = setup(['row', 'detail'], ['details']);
    rerender({ signature: ['row changed', 'detail changed'], dirty: ['details'] });
    expect(result.current('details')).toBe('7-0');
    expect(result.current('prices')).toBe('7-1');
  });

  it('does not count data that arrives where there was none', () => {
    const first = setup([undefined, 'detail']);
    first.rerender({ signature: ['row', 'detail'], dirty: [] });
    expect(first.result.current('details')).toBe('7-0');
    const second = setup(['row', undefined]);
    second.rerender({ signature: ['row', 'detail'], dirty: [] });
    expect(second.result.current('details')).toBe('7-0');
  });

  it('does not count a part that goes away (the row left the loaded page)', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: [undefined, 'detail'], dirty: [] });
    expect(result.current('details')).toBe('7-0');
  });

  it('counts every later change again', () => {
    const { result, rerender } = setup(['row', 'detail']);
    rerender({ signature: ['row 2', 'detail'], dirty: [] });
    rerender({ signature: ['row 3', 'detail'], dirty: [] });
    expect(result.current('details')).toBe('7-2');
  });
});
