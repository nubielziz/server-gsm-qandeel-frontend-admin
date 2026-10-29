// The palette's fixed rows: a "Go to" row per permitted page and the demo's quick actions (paletteItems() in 90-app.js).
// The demo's simulation actions are not ported. Each remaining action opens a page, so it is offered only when the
// staff member may open that page.
import type { IconName, PaletteItem } from '@/components/ui';
import type { PageResource } from '../resources';

export type PaletteItemsInput = {
  /** The pages the staff member may open. */
  pages: readonly PageResource[];
  go: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

/** "Go to" rows first, then the actions in the demo's order. Switching the theme needs no page, so it is always there. */
export function buildPaletteItems({ pages, go, isDark, toggleTheme }: PaletteItemsInput): PaletteItem[] {
  const allowed = new Set(pages.map((page) => page.name));

  const goTo: PaletteItem[] = pages.map((page) => ({
    id: `page:${page.name}`,
    group: 'Go to',
    label: page.meta.label,
    icon: page.meta.icon,
    run: () => go(page.path),
  }));

  // An action that deep-links into `page`: no row at all when that page is not allowed.
  const link = (
    page: string,
    id: string,
    label: string,
    icon: IconName,
    to: string,
    keywords: string[] = [],
  ): PaletteItem[] =>
    allowed.has(page)
      ? [{ id: `action:${id}`, group: 'Actions', label, icon, keywords, run: () => go(to) }]
      : [];

  const actions: PaletteItem[] = [
    ...link('risk', 'risk-queue', 'Open the risk review queue', 'shield', '/risk?tab=queue', [
      'fraud',
      'held',
    ]),
    ...link(
      'refunds',
      'refund-requests',
      'Review refund requests',
      'undo',
      '/refunds?tab=refunds&status=requested',
    ),
    {
      id: 'action:toggle-theme',
      group: 'Actions',
      label: 'Toggle dark mode',
      icon: isDark ? 'sun' : 'moon',
      keywords: ['theme', 'light', 'appearance'],
      run: toggleTheme,
    },
    ...link('orders', 'orders-review', 'Review orders that need attention', 'alert', '/orders?tab=review'),
    ...link('finance', 'pending-deposits', 'Review pending deposits', 'receipt', '/finance?tab=payments', [
      'payments',
    ]),
  ];

  return [...goTo, ...actions];
}
