// Where focus goes when the service panel of the Catalog closes: back to the name button of the row that was open.

/** The attribute that marks a row's name button, so the page can find it again. */
const ROW_OPENER_ATTRIBUTE = 'data-service-opener';

/** The attribute of the name button of service `id`; spread it on the button. */
export function rowOpenerProps(id: number) {
  return { [ROW_OPENER_ATTRIBUTE]: id };
}

/**
 * Puts focus on the name button of service `id`'s row. Returns false when the row is not on the page (another page, a filter, a
 * service that is gone), so the caller can fall back to the table.
 */
export function focusRowOpener(id: number): boolean {
  const button = document.querySelector<HTMLElement>(`[${ROW_OPENER_ATTRIBUTE}="${id}"]`);
  button?.focus();
  return button !== null && document.activeElement === button;
}
