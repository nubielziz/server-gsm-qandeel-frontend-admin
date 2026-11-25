// The palette's fixed rows: a "Go to" row per permitted page and the demo's quick actions (paletteItems() in 90-app.js).
// The demo's simulation actions are not ported. Each remaining action opens a page, so it is offered only when the
// staff member may open that page.
import type { IconName, PaletteItem } from '@/components/ui';
import { financePath } from '@/features/finance';
import { canUseView, viewSpec, type MoneyViewId } from '@/features/money';
import { refundsPath } from '@/features/refunds';
import type { PageResource } from '../resources';

export type PaletteItemsInput = {
  /** The pages the staff member may open. */
  pages: readonly PageResource[];
  /**
   * The staff member's permissions. A Money action is offered only when its own view is one they may use (the Money page opens for
   * many permissions); left out, the page gate alone decides.
   */
  permissions?: readonly string[];
  go: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

/** "Go to" rows first, then the actions in the demo's order. Switching the theme needs no page, so it is always there. */
export function buildPaletteItems({
  pages,
  permissions,
  go,
  isDark,
  toggleTheme,
}: PaletteItemsInput): PaletteItem[] {
  const allowed = new Set(pages.map((page) => page.name));
  // A Money view the staff member may use (decision 026); unknown permissions leave it to the page gate.
  const canView = (view: MoneyViewId) => permissions === undefined || canUseView(viewSpec(view), permissions);

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
    // Both money actions open views of the one Money page: the page's gate, then the view's own permissions.
    ...(canView('refunds')
      ? link(
          'money',
          'refund-requests',
          'Review refund requests',
          'undo',
          refundsPath({ tab: 'refunds', status: 'requested' }),
        )
      : []),
    {
      id: 'action:toggle-theme',
      group: 'Actions',
      label: 'Toggle dark mode',
      icon: isDark ? 'sun' : 'moon',
      keywords: ['theme', 'light', 'appearance'],
      run: toggleTheme,
    },
    ...link('orders', 'orders-review', 'Review orders that need attention', 'alert', '/orders?tab=review'),
    ...(canView('deposits')
      ? link('money', 'pending-deposits', 'Review pending deposits', 'receipt', financePath('payments'), [
          'payments',
        ])
      : []),
  ];

  return [...goTo, ...actions];
}
