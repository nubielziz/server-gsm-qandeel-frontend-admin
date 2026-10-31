// useSurface: the surface the API tab is focused on, kept in the address (`?surface=v1`). No parameter means all surfaces.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Reads a `?surface=` value. Blank text is no surface; the server answers 422 for a key it does not know. */
export function parseSurface(raw: string | null): string | undefined {
  const text = raw?.trim();
  return text ? text : undefined;
}

/**
 * `[surface, setSurface]` from the address. Choosing a surface (or clearing it with `undefined`) replaces the history
 * entry, like the range and the tab do, and keeps every other parameter (`range`, `tab`).
 */
export function useSurface(): [string | undefined, (next: string | undefined) => void] {
  const [params, setParams] = useSearchParams();
  const surface = parseSurface(params.get('surface'));
  const setSurface = useCallback(
    (next: string | undefined) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next) updated.set('surface', next);
          else updated.delete('surface');
          return updated;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [surface, setSurface];
}
