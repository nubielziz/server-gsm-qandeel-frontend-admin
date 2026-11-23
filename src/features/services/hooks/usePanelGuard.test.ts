// Tests for the service panel's unsaved-changes guard: nothing is asked while every section is saved, a move is held back while one is
// not, and what the question does (go on, or stay). The marks belong to the open service.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePanelGuard } from './usePanelGuard';

function setup(open: number | null = 1) {
  const openService = vi.fn();
  const close = vi.fn();
  const view = renderHook(
    (props: { open: number | null }) => usePanelGuard({ ...props, openService, close }),
    {
      initialProps: { open },
    },
  );
  return { ...view, openService, close };
}

describe('the guard with nothing unsaved', () => {
  it('lets a service be picked and the panel be closed at once', () => {
    const { result, openService, close } = setup();
    act(() => result.current.requestOpen(2, 'prices'));
    expect(openService).toHaveBeenCalledWith(2, 'prices');
    act(() => result.current.requestClose());
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.move).toBeNull();
  });
});

describe('the guard with a section that holds changes', () => {
  it('holds back a pick of another service until the staff member answers', () => {
    const { result, openService } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    expect(result.current.dirty).toEqual(['details']);
    act(() => result.current.requestOpen(2, 'shop'));
    expect(openService).not.toHaveBeenCalled();
    expect(result.current.move).toEqual({ kind: 'open', id: 2, section: 'shop' });
  });

  it('carries the held-back pick out on confirm, once, and forgets it', () => {
    const { result, openService } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.requestOpen(2));
    act(() => result.current.confirm());
    expect(openService).toHaveBeenCalledTimes(1);
    expect(openService).toHaveBeenCalledWith(2, undefined);
    expect(result.current.move).toBeNull();
  });

  it('holds back closing, and closes on confirm', () => {
    const { result, close } = setup();
    act(() => result.current.markDirty(1, 'prices', true));
    act(() => result.current.requestClose());
    expect(close).not.toHaveBeenCalled();
    expect(result.current.move).toEqual({ kind: 'close' });
    act(() => result.current.confirm());
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.move).toBeNull();
  });

  it('stays where it is on cancel, with the changes still marked', () => {
    const { result, openService, close } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.requestClose());
    act(() => result.current.cancel());
    expect(result.current.move).toBeNull();
    expect(result.current.dirty).toEqual(['details']);
    expect(openService).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('does not ask to move to another section of the same service', () => {
    const { result, openService } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.requestOpen(1, 'prices'));
    expect(openService).toHaveBeenCalledWith(1, 'prices');
    expect(result.current.move).toBeNull();
  });

  it('stops asking once the section reports that it is saved again', () => {
    const { result, close } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.markDirty(1, 'details', false));
    expect(result.current.dirty).toEqual([]);
    act(() => result.current.requestClose());
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps asking while a second section still holds changes', () => {
    const { result } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.markDirty(1, 'prices', true));
    act(() => result.current.markDirty(1, 'details', false));
    expect(result.current.dirty).toEqual(['prices']);
    act(() => result.current.requestClose());
    expect(result.current.move).toEqual({ kind: 'close' });
  });
});

describe('a move that leaves the panel', () => {
  it('goes at once when nothing is unsaved', () => {
    const { result } = setup();
    const go = vi.fn();
    act(() => result.current.requestLeave(go));
    expect(go).toHaveBeenCalledTimes(1);
    expect(result.current.move).toBeNull();
  });

  it('is held back while a section holds changes, and goes once on confirm', () => {
    const { result } = setup();
    const go = vi.fn();
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.requestLeave(go));
    expect(go).not.toHaveBeenCalled();
    expect(result.current.move).toEqual({ kind: 'leave', go });
    act(() => result.current.confirm());
    expect(go).toHaveBeenCalledTimes(1);
    expect(result.current.move).toBeNull();
  });

  it('stays where it is on cancel', () => {
    const { result } = setup();
    const go = vi.fn();
    act(() => result.current.markDirty(1, 'prices', true));
    act(() => result.current.requestLeave(go));
    act(() => result.current.cancel());
    expect(go).not.toHaveBeenCalled();
    expect(result.current.move).toBeNull();
    expect(result.current.dirty).toEqual(['prices']);
  });
});

describe('closing or reloading the tab', () => {
  // A cancelable event, as the browser sends: preventDefault on it is what makes the browser ask.
  const unload = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event;
  };

  it('asks the browser to warn while a section holds changes, and not otherwise', () => {
    const { result } = setup();
    expect(unload().defaultPrevented).toBe(false);
    act(() => result.current.markDirty(1, 'details', true));
    expect(unload().defaultPrevented).toBe(true);
    act(() => result.current.markDirty(1, 'details', false));
    expect(unload().defaultPrevented).toBe(false);
  });

  it('stops warning once the page that held the guard is gone', () => {
    const { result, unmount } = setup();
    act(() => result.current.markDirty(1, 'details', true));
    unmount();
    expect(unload().defaultPrevented).toBe(false);
  });
});

describe('the marks belong to the open service', () => {
  it('start empty for another service, and a late report from the first is ignored', () => {
    const { result, rerender } = setup(1);
    act(() => result.current.markDirty(1, 'details', true));
    rerender({ open: 2 });
    expect(result.current.dirty).toEqual([]);
    act(() => result.current.markDirty(1, 'prices', true));
    expect(result.current.dirty).toEqual([]);
    act(() => result.current.markDirty(2, 'prices', true));
    expect(result.current.dirty).toEqual(['prices']);
  });

  it('are forgotten when the panel closes, so the same service opens clean again', () => {
    const { result, rerender } = setup(1);
    act(() => result.current.markDirty(1, 'details', true));
    rerender({ open: null });
    rerender({ open: 1 });
    expect(result.current.dirty).toEqual([]);
  });

  it('drop a question that was waiting when the address moved by itself', () => {
    const { result, rerender } = setup(1);
    act(() => result.current.markDirty(1, 'details', true));
    act(() => result.current.requestClose());
    expect(result.current.move).not.toBeNull();
    rerender({ open: 2 });
    expect(result.current.move).toBeNull();
  });
});
