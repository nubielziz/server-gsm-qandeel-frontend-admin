// The pages a campaign's link can open, as menus (decision 036): the console's own pages for staff, the shop's account pages for merchants and
// retail accounts. What is sent is the same path text as before; "Another page…" keeps the free text box for any other path.
import type { SelectOption } from '@/components/ui';
import type { LinkKey } from './spec';

/** One page a link can open: its words and the path that is sent. */
export interface LinkPage {
  path: string;
  label: string;
}

/**
 * The console's main pages, in the order of the sidebar. A copy of the page list of `src/app/resources.ts` (the path of a page is
 * `/<name>`); it is not imported from there because the app's resources import the features, this one included.
 */
export const STAFF_PAGES: readonly LinkPage[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/orders', label: 'Orders' },
  { path: '/accounts', label: 'Accounts' },
  { path: '/support', label: 'Support' },
  { path: '/risk', label: 'Risk & checks' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/products', label: 'Product / Services' },
  { path: '/suppliers', label: 'Suppliers' },
  { path: '/money', label: 'Money' },
  { path: '/access', label: 'Admins & access' },
  { path: '/settings', label: 'Settings' },
  { path: '/storefront', label: 'Shop content' },
  { path: '/audit', label: 'Audit log' },
  { path: '/system-health', label: 'System health' },
];

/**
 * The shop's account pages, the same for a merchant and a retail account: every account's pages live under `/account` and the server
 * refuses a merchant link outside it (backend decision 064). A copy of the pages of the shop's `app/en/account` folder: the ones that
 * have a page of their own. `/account/services` (the retired price list) is not here on purpose: it only redirects to the shop's
 * `/services`, and `/account/services/<id>` is an old order form address that redirects to the checkout (shop decision 003).
 */
export const ACCOUNT_PAGES: readonly LinkPage[] = [
  { path: '/account', label: 'Account home' },
  { path: '/account/orders', label: 'Orders' },
  { path: '/account/wallet', label: 'Wallet' },
  { path: '/account/invoices', label: 'Invoices' },
  { path: '/account/support', label: 'Support' },
  { path: '/account/notifications', label: 'Notifications' },
  { path: '/account/settings', label: 'Settings' },
];

/** The known pages of the link of one kind of person. */
export function pagesFor(key: LinkKey): readonly LinkPage[] {
  return key === 'staff' ? STAFF_PAGES : ACCOUNT_PAGES;
}

/** The menu's value for "no link": an empty path, which the form already sends as no link. */
export const NO_LINK = '';

/** The menu's own word for "another page": no page has this path. */
export const ANOTHER_PAGE = '__another_page__';

/** The menu for one kind of person: no link, the known pages, then "Another page…". */
export function linkOptions(key: LinkKey): SelectOption[] {
  return [
    { value: NO_LINK, label: 'No link' },
    ...pagesFor(key).map((page) => ({ value: page.path, label: page.label })),
    { value: ANOTHER_PAGE, label: 'Another page…' },
  ];
}

/** True when the text is the path of one of the known pages (the menu can show it as a choice). */
export function isKnownPage(key: LinkKey, path: string): boolean {
  return pagesFor(key).some((page) => page.path === path);
}

/** True when a stored link is a path the menu does not know: it shows as "Another page…" with its text. */
export function startsAsAnotherPage(key: LinkKey, path: string): boolean {
  const value = path.trim();
  return value !== '' && !isKnownPage(key, value);
}
