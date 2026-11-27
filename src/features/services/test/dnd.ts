// Test helper for drag and drop (decision 038): jsdom has no layout, so a test does not drag with a pointer. It lets the real DndContext run, keeps
// the props of the latest one and calls its `onDragEnd` the way the library would at a drop. Use it from tests only, with
//   vi.mock('@dnd-kit/core', async (original) => (await import('<path>/test/dnd')).spyOnDndContext(await original()));
import type { DndContextProps } from '@dnd-kit/core';
import { act } from '@testing-library/react';
import { createElement, type ComponentType } from 'react';

let latest: DndContextProps | null = null;

/** The module of `@dnd-kit/core` with a DndContext that records its props. */
export function spyOnDndContext(module: unknown): Record<string, unknown> {
  const actual = module as { DndContext: ComponentType<DndContextProps> };
  const Real = actual.DndContext;
  const Spy = (props: DndContextProps) => {
    latest = props;
    return createElement(Real, props);
  };
  return { ...actual, DndContext: Spy };
}

/** The props of the DndContext on screen now (to read its sensors, modifiers or accessibility words). */
export function dndProps(): DndContextProps {
  if (!latest) throw new Error('No DndContext has been drawn.');
  return latest;
}

/** Drops the row with key `activeId` on the row with key `overId`, as the library reports a drop. */
export async function dropRow(activeId: number, overId: number | null) {
  await act(async () => {
    await dndProps().onDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    } as Parameters<NonNullable<DndContextProps['onDragEnd']>>[0]);
  });
}
