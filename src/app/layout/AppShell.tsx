// AppShell: the page frame around every signed-in screen: skip link, sidebar, topbar, <main>, command palette and
// shortcut list. Ports the frame of reference/gsm-admin/src/index.html and the shell parts of 90-app.js.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { AppCommandPalette } from '../palette';
import { BreadcrumbTitleContext } from './breadcrumbTitle';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useDocumentTitle } from './useDocumentTitle';
import { useFocusMainOnNavigation } from './useFocusMainOnNavigation';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import { useMobileNav } from './useMobileNav';
import { useNavCounts } from './useNavCounts';
import { usePermittedPages } from './usePages';

/**
 * `children` is the routed page (an <Outlet/>). A page that crashes shows an error state inside <main> and the
 * shell stays usable; the error clears when the path changes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const nav = useMobileNav();
  const pages = usePermittedPages();
  const counts = useNavCounts();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [record, setRecord] = useState<string>();

  useDocumentTitle(record);
  useFocusMainOnNavigation(mainRef);
  useGlobalShortcuts({
    togglePalette: () => setPaletteOpen((open) => !open),
    openPalette: () => setPaletteOpen(true),
    openShortcuts: () => setShortcutsOpen(true),
    // Only pages the staff member may open; the sidebar does not list the others either.
    goTo: (name) => {
      const page = pages?.find((candidate) => candidate.name === name);
      if (page) void navigate(page.path);
    },
  });

  const breadcrumb = useMemo(() => ({ title: record, setTitle: setRecord }), [record]);

  return (
    <BreadcrumbTitleContext.Provider value={breadcrumb}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-surface"
        onClick={(event) => {
          // A plain #main link would add a hash to the URL; focusing <main> does the same job.
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <div
          id="scrim"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          hidden={!nav.open}
          aria-hidden="true"
          onClick={nav.closeNav}
        />
        <Sidebar
          pages={pages}
          counts={counts}
          open={nav.open}
          onClose={nav.closeNav}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          sidebarRef={nav.sidebarRef}
        />
        <div className="flex min-h-dvh min-w-0 flex-col">
          <Topbar
            navOpen={nav.open}
            onOpenNav={nav.openNav}
            menuButtonRef={nav.menuButtonRef}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <main
            id="main"
            ref={mainRef}
            tabIndex={-1}
            className="mx-auto w-full min-w-0 max-w-[1480px] flex-1 px-4 py-4 outline-none lg:px-6 lg:py-5"
          >
            <AppErrorBoundary resetKey={pathname}>{children}</AppErrorBoundary>
          </main>
        </div>
      </div>
      <AppCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </BreadcrumbTitleContext.Provider>
  );
}
