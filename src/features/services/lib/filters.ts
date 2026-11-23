// The page of a list kept in the address (`?page=3`) for the code stock and the price check, which page a list of their own. The
// Product / Services page's own addresses (filters, page, page size) are written by `productsPath`.

/** Codes per page of the code stock. */
export const INVENTORY_PAGE_SIZE = 25;

const digits = (value: string | null): string => (value && /^[1-9]\d*$/.test(value) ? value : '');

/** The page in the address, 1 when it is missing or not a number. */
export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The address with a page; the first page is left out. */
export function writeView(base: URLSearchParams, view: { page?: number }): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view.page !== undefined) {
    if (view.page > 1) next.set('page', String(view.page));
    else next.delete('page');
  }
  return next;
}
