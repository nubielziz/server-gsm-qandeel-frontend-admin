// The hook of the sliding mark: starts attachIndicator on a container once it is on the page and stops it when it goes.
import { useLayoutEffect, type RefObject } from 'react';
import { attachIndicator, type IndicatorSpec } from './slidingIndicator';

/**
 * `container` is the ref of the row (a positioned element whose first child is a SlidingMark); `spec` says which item is the selected
 * one (TAB_INDICATOR, LINK_INDICATOR). Use a module-level `spec`, so the mark is not attached again on every render.
 */
export function useSlidingIndicator(container: RefObject<HTMLElement | null>, spec: IndicatorSpec): void {
  useLayoutEffect(() => {
    const el = container.current;
    return el ? attachIndicator(el, spec) : undefined;
  }, [container, spec]);
}
