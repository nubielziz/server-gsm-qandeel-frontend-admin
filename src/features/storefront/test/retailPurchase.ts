// Helpers for the tests of the Retail Purchase part: open the host signed in as the owner or as a staff member with fewer permissions, find
// the requests it sent, and find a label-left row by its label. Import it from tests only.
import { screen } from '@testing-library/react';
import { createElement } from 'react';
import { Route } from 'react-router';
import { mockMe, renderShell, signInAs } from '@/test/renderApp';
import { recordRequests } from './requests';
import { RetailHost, type RetailHostProps } from './RetailHost';

export type Requests = ReturnType<typeof recordRequests>;

/** Opens the part (inside the app's providers), signed in as the owner, or as a staff member holding only `permissions`. */
export async function openRetail(props: RetailHostProps = {}, permissions?: string[]): Promise<Requests> {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const requests = recordRequests();
  renderShell('/probe', createElement(Route, { path: '/probe', element: createElement(RetailHost, props) }));
  return requests;
}

/** The requests of one method whose path ends with `path`. */
export const sentTo = (requests: Requests, method: string, path: string) =>
  requests.sent().filter((sent) => sent.method === method && sent.url.pathname.endsWith(path));

/** The requests of one method to one shop page. */
export const listingRequests = (requests: Requests, method: string, id: number) =>
  sentTo(requests, method, `/admin/service-listings/${id}`);

/** The proposals the part asked for one service. */
export const proposalReads = (requests: Requests, serviceId: number) =>
  requests
    .sent()
    .filter(
      (sent) =>
        sent.method === 'GET' &&
        sent.url.pathname.endsWith('/admin/retail-price-changes') &&
        sent.url.searchParams.get('serviceId') === String(serviceId),
    );

/** The label-left row that carries this label (a label that appears once on the screen). */
export function rowOf(label: string): HTMLElement {
  const row = screen.getByText(label).closest<HTMLElement>('.form-row');
  if (!row) throw new Error(`There is no row labelled "${label}".`);
  return row;
}
