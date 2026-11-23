// Tests for the menu of a supplier's own services in the supplier chain editor: it offers the first 100 services, says so when the
// list is longer, and its search box asks the server so a service beyond those 100 can still be linked. It runs against the
// suppliers mock API, which plays the server (search over name, group and remote id).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { mocks } from '../mocks';
import { addNotImported } from '../test/bigCatalogue';
import type { DraftStep } from '../lib/links';
import { LinkServicePicker } from './LinkServicePicker';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

const STEP: DraftStep = {
  key: 'step-1',
  supplierId: 1,
  supplierName: 'Nordic GSM',
  supplierServiceId: null,
  supplierServiceName: '',
};

async function show(lock = { disabled: false } as { disabled: boolean; title?: string }) {
  await signInAs();
  const onPick = vi.fn();
  const onSubmit = vi.fn();
  renderShell(
    '/probe',
    <Route
      path="/probe"
      element={
        // The form stands for the one around the chain editor: a lone text box submits it on Enter.
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <LinkServicePicker step={STEP} lock={lock} onPick={onPick} />
        </form>
      }
    />,
  );
  const menu = await screen.findByLabelText('Service at Nordic GSM', undefined, { timeout: 10_000 });
  await waitFor(() => expect(within(menu).getAllByRole('option').length).toBeGreaterThan(1));
  return { menu, onPick, onSubmit };
}

describe('the supplier service menu', () => {
  it('offers the services, with no hint while the whole list fits', async () => {
    const { menu } = await show();
    expect(within(menu).getAllByRole('option').length).toBeLessThanOrEqual(101);
    expect(screen.queryByText(/Type to narrow the list/)).not.toBeInTheDocument();
  });

  it('says how many there are when the list is longer than the menu, and a search reaches a service past the first 100', async () => {
    const user = userEvent.setup();
    await addNotImported(1, 600);
    const requests = recordRequests();
    const { menu, onPick } = await show();
    expect(within(menu).getAllByRole('option')).toHaveLength(101); // the placeholder and the first 100 by name
    expect(
      await screen.findByText(/^Showing 100 of [\d,]+\. Type to narrow the list\.$/),
    ).toBeInTheDocument();
    // "Bulk 0599" sorts far past the first 100 services, so it is only offered once the server is asked for it.
    expect(within(menu).queryByRole('option', { name: /^Bulk 0599/ })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: "Search Nordic GSM's services" }), 'Bulk 0599');
    const found = await within(menu).findByRole('option', { name: /^Bulk 0599/ }, { timeout: 5_000 });
    await waitFor(() => expect(within(menu).getAllByRole('option')).toHaveLength(2));
    expect(screen.queryByText(/Type to narrow the list/)).not.toBeInTheDocument();
    const asked = requests
      .sent()
      .filter((call) => call.method === 'GET' && call.url.pathname === '/admin/suppliers/1/services');
    expect(asked.some((call) => call.url.searchParams.get('q') === 'Bulk 0599')).toBe(true);

    await user.selectOptions(menu, found);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bulk 0599' }));
  });

  it('says no service matches when the search finds none, and does not submit a form on Enter', async () => {
    const user = userEvent.setup();
    const { menu, onSubmit } = await show();
    await user.type(
      screen.getByRole('searchbox', { name: "Search Nordic GSM's services" }),
      'zzz no such service{Enter}',
    );
    await waitFor(
      () =>
        expect(within(menu).getByRole('option')).toHaveTextContent('No service matches. Change the search.'),
      {
        timeout: 5_000,
      },
    );
    expect(menu).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('turns the box and the menu off with the missing permission as their title', async () => {
    const lock = { disabled: true, title: 'You need the catalog:update permission' };
    const { menu } = await show(lock);
    const box = screen.getByRole('searchbox', { name: "Search Nordic GSM's services" });
    for (const control of [box, menu]) {
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute('title', lock.title);
    }
  });
});
