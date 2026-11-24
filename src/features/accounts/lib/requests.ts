// How a data request is named on screen: its number ("DSR-12"). The request views and their deadline words are the page's own.

/** The number staff say aloud for a request: `DSR-12`. */
export function requestNumber(id: number): string {
  return `DSR-${id}`;
}
