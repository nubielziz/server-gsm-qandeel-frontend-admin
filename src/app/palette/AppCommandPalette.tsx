// AppCommandPalette: the console's command palette (⌘K). Joins the fixed rows (pages and actions) with the results
// the features' palette sources find on the server. Ports openPalette/drawPalette/runPal of 90-app.js.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CommandPalette } from '@/components/ui';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { usePermittedPages } from '../layout/usePages';
import { usePreferences } from '../layout/preferences';
import { buildPaletteItems } from './buildPaletteItems';
import { filterFixedItems } from './filterItems';
import { paletteSources, type PaletteSource } from './paletteSources';
import { useRemotePaletteItems } from './useRemotePaletteItems';

export interface AppCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Where the server results come from; the app's registry unless a test passes its own. */
  sources?: readonly PaletteSource[];
}

export function AppCommandPalette({ open, onClose, sources = paletteSources }: AppCommandPaletteProps) {
  const navigate = useNavigate();
  const pages = usePermittedPages();
  const { isDark, toggleTheme } = usePreferences();
  const [query, setQuery] = useState('');

  const go = useCallback((path: string) => void navigate(path), [navigate]);
  const fixed = useMemo(
    () => buildPaletteItems({ pages: pages ?? [], go, isDark, toggleTheme }),
    [pages, go, isDark, toggleTheme],
  );
  // Only search what the staff member may read: a source they lack the permission for would only answer 403.
  const { data: staff } = useMe();
  const permittedSources = useMemo(
    () =>
      sources.filter(
        (source) =>
          !source.permission || (staff !== undefined && hasPermission(staff.permissions, source.permission)),
      ),
    [sources, staff],
  );
  const remote = useRemotePaletteItems(query, permittedSources, go);
  const items = useMemo(() => [...filterFixedItems(fixed, query), ...remote], [fixed, query, remote]);

  // The kit forgets the typed text on every opening, so the app does too. Resetting on open (not only in `close`)
  // also covers the palette being closed from outside, e.g. a second ⌘K, which never calls `close`.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  const close = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  return (
    <CommandPalette
      open={open}
      onClose={close}
      items={items}
      filter={false}
      maxResults={14}
      onQueryChange={setQuery}
    />
  );
}
