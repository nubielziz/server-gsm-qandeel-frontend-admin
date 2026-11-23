// Tests for the start of the publish view: what to publish (everything, a category found by search, a supplier), the note about
// prices with and without an active rule, the button that asks the server for a preview, the server's refusals in the error slot,
// the permissions each choice needs, and the earlier runs.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { lastOf, openPublishStart, PUBLISH_PERMISSIONS } from '../test/publishPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const PREPARE = 'Prepare the preview';
const RUNS = /\/admin\/publish-runs$/;
const noRules = () =>
  mockServer.use(
    http.get('*/admin/retail-price-rules', () =>
      HttpResponse.json([], {
        headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
      }),
    ),
  );

describe('the choices', () => {
  it('offers everything not on the shop yet, a category and a supplier’s services, with everything chosen', async () => {
    await openPublishStart();
    const group = screen.getByRole('group', { name: 'What to publish' });
    expect(within(group).getByRole('radio', { name: 'Everything not on the shop yet' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'A category' })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: "A supplier's services" })).not.toBeChecked();
    expect(screen.queryByRole('searchbox', { name: 'Search categories' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: PREPARE })).toBeEnabled();
  });

  it('keeps Prepare the preview, the view’s one primary button, in the pinned bar', async () => {
    await openPublishStart();
    const button = screen.getByRole('button', { name: PREPARE });
    expect(button.className).toContain('btn-primary');
    expect(button.closest('.pinned-bar')).not.toBeNull();
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('prepares a preview of everything: the request, then the run in the address', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPublishStart();
    await user.click(screen.getByRole('button', { name: PREPARE }));
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&type=imei&run=8'));
    expect(lastOf(requests, 'POST', RUNS).body).toEqual({ scope: { kind: 'all' } });
    expect(await screen.findByRole('heading', { level: 2, name: 'Publish run 8' })).toBeInTheDocument();
    expect(await screen.findByText('Preparing the preview of 60 services…')).toBeInTheDocument();
  });

  it('finds a category by searching, 20 at a time, and prepares a preview of it', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPublishStart();
    await user.click(screen.getByRole('radio', { name: 'A category' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'carrier');
    const menu = screen.getByRole('combobox', { name: 'Category' });
    await waitFor(() =>
      expect(within(menu).getByRole('option', { name: 'Carrier unlock' })).toBeInTheDocument(),
    );
    // The menu first shows the first categories by name; the request for the typed text follows the pause in the typing.
    const asked = () =>
      requests.sent().filter((sent) => sent.url.pathname.endsWith('/admin/service-categories'));
    await waitFor(() => expect(asked().at(-1)!.url.searchParams.get('q')).toBe('carrier'));
    expect(asked().at(-1)!.url.searchParams.get('_end')).toBe('20');
    await user.selectOptions(menu, 'Carrier unlock');
    await user.click(screen.getByRole('button', { name: PREPARE }));
    await waitFor(() => expect(app.location()).toMatch(/&run=8$/));
    expect(lastOf(requests, 'POST', RUNS).body).toEqual({ scope: { kind: 'category', categoryId: 4 } });
  });

  it('asks for a category or a supplier before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPublishStart();
    await user.click(screen.getByRole('radio', { name: 'A category' }));
    await user.click(screen.getByRole('button', { name: PREPARE }));
    expect(await screen.findByText('Choose a category.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: "A supplier's services" }));
    expect(screen.queryByText('Choose a category.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: PREPARE }));
    expect(await screen.findByText('Choose a supplier.')).toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.method === 'POST' && RUNS.test(sent.url.pathname))).toBe(
      false,
    );
  });

  it('prepares a preview of a supplier’s services', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPublishStart();
    await user.click(screen.getByRole('radio', { name: "A supplier's services" }));
    const menu = screen.getByRole('combobox', { name: 'Supplier' });
    await waitFor(() => expect(within(menu).getByRole('option', { name: 'Rapid IMEI' })).toBeInTheDocument());
    await user.selectOptions(menu, 'Rapid IMEI');
    await user.click(screen.getByRole('button', { name: PREPARE }));
    await waitFor(() => expect(app.location()).toMatch(/&run=8$/));
    expect(lastOf(requests, 'POST', RUNS).body).toEqual({ scope: { kind: 'supplier', supplierId: 3 } });
  });
});

describe('the refusals', () => {
  it('shows the server’s refusal of an empty choice in the error slot and stays on the start', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          {
            field: 'scope',
            message: 'Nothing to publish: every service of this choice is already on the shop.',
          },
        ]),
      ),
    );
    const app = await openPublishStart();
    await user.click(screen.getByRole('button', { name: PREPARE }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Nothing to publish: every service of this choice is already on the shop.',
    );
    expect(app.location()).toBe('/products?view=publish');
  });

  it('shows the 422 of a scope with too many services', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          {
            field: 'scope',
            message:
              'This choice has 6200 services. A run takes at most 5000: pick a category or a supplier.',
          },
        ]),
      ),
    );
    await openPublishStart();
    await user.click(screen.getByRole('button', { name: PREPARE }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A run takes at most 5000');
  });

  it('shows the server’s words for a category or supplier that does not exist', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'scope.categoryId', message: 'Choose a category that exists.' },
        ]),
      ),
    );
    await openPublishStart();
    await user.click(screen.getByRole('radio', { name: 'A category' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'carrier');
    const menu = screen.getByRole('combobox', { name: 'Category' });
    await waitFor(() =>
      expect(within(menu).getByRole('option', { name: 'Carrier unlock' })).toBeInTheDocument(),
    );
    await user.selectOptions(menu, 'Carrier unlock');
    await user.click(screen.getByRole('button', { name: PREPARE }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a category that exists.');
  });
});

describe('the note about prices', () => {
  it('says prices come from the retail pricing rules, with a link to the shop price rules', async () => {
    await openPublishStart();
    const link = await screen.findByRole('link', { name: 'retail pricing rules' });
    expect(link).toHaveAttribute('href', '/products?view=rules&tab=shop');
    expect(screen.getByText(/Prices come from the/)).toBeInTheDocument();
    expect(screen.queryByText(/No retail pricing rule is active/)).not.toBeInTheDocument();
  });

  it('turns into a warning when no rule is active, and links to where one is made', async () => {
    noRules();
    await openPublishStart();
    const note = (await screen.findByText(/No retail pricing rule is active/)).closest('p')!;
    expect(note).toHaveTextContent(
      'No retail pricing rule is active. Services without a price cannot be published until you make a rule or type their prices.',
    );
    expect(within(note).getByRole('link', { name: 'Make a rule' })).toHaveAttribute(
      'href',
      '/products?view=rules&tab=shop',
    );
  });

  it('asks for the active rules with a one-row count, and keeps the plain line for a role that cannot read them', async () => {
    const requests = recordRequests();
    await openPublishStart();
    await screen.findByRole('link', { name: 'retail pricing rules' });
    await waitFor(() =>
      expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/admin/retail-price-rules'))).toBe(
        true,
      ),
    );
    const asked = requests.sent().find((sent) => sent.url.pathname.endsWith('/admin/retail-price-rules'))!;
    expect(Object.fromEntries(asked.url.searchParams)).toEqual({ _start: '0', _end: '1', isActive: 'true' });
  });

  it('does not ask for the rules without pricing:read, and then shows the plain line even with no rule', async () => {
    noRules();
    const requests = recordRequests();
    await openPublishStart({
      permissions: PUBLISH_PERMISSIONS.filter((permission) => permission !== 'pricing:read'),
    });
    await screen.findByRole('link', { name: 'retail pricing rules' });
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/admin/retail-price-rules'))).toBe(
      false,
    );
    expect(screen.queryByText(/No retail pricing rule is active/)).not.toBeInTheDocument();
  });
});

describe('the permissions', () => {
  it('names the permission a choice needs: catalog:read for a category, suppliers:read for a supplier', async () => {
    const permissions = PUBLISH_PERMISSIONS.filter(
      (one) => one !== 'catalog:read' && one !== 'suppliers:read',
    );
    await openPublishStart({ permissions });
    expect(screen.getByRole('radio', { name: /^A category/ })).toBeDisabled();
    expect(screen.getByText('You need the catalog:read permission')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^A supplier's services/ })).toBeDisabled();
    expect(screen.getByText('You need the suppliers:read permission')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Everything not on the shop yet' })).toBeEnabled();
  });
});
