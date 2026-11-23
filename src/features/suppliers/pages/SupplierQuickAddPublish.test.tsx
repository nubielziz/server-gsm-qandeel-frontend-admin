// Tests for "Also put them on the shop" in Quick add (feature 31): the tick box and its locks, the body and the review bullets, the
// server's "no rule" refusal with its link, and step 3's publishing line (preparing, the run with its link, "The shop preview was not
// prepared." with its button, the 5 second read). The last block plays the hand-over through the mock API. Where a test needs a run or
// a group list the seed does not hold, it answers the route itself.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPublishRun,
  listPublishRuns,
  listRetailPriceRules,
  updateRetailPriceRule,
} from '@/features/storefront';
import type { PublishRun } from '@/features/storefront';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { roleStore } from '@/mocks/roles';
import { setupMockApi } from '@/test/renderApp';
import { startQuickAdd } from '../api';
import { mocks } from '../mocks';
import { detailOf, openSuppliers, toasts } from '../test/suppliersPage';
import type { QuickAddRun, ServiceGroup } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

type User = ReturnType<typeof userEvent.setup>;
type Scope = ReturnType<typeof within>;

const BOX = 'Also put them on the shop';
const MINUTE = 60_000;

const group = (type: string, remoteGroup: string, addable: number): ServiceGroup => ({
  type,
  remoteGroup,
  total: addable,
  addable,
  imported: 0,
  unavailable: 0,
  unsupported: 0,
});

const run = (changes: Partial<QuickAddRun> = {}): QuickAddRun => ({
  id: 9,
  supplierId: 1,
  scope: 'groups',
  groups: [],
  serviceStatus: 'active',
  publish: 'listed',
  status: 'queued',
  total: 5,
  processed: 0,
  created: 0,
  skipped: 0,
  failed: 0,
  categoriesCreated: 0,
  failures: [],
  error: null,
  requestedBy: 1,
  createdAt: new Date().toISOString(),
  startedAt: null,
  finishedAt: null,
  ...changes,
});

/** The Quick add run as it reads once it is over. `finishedAt` decides how long ago that was. */
const ended = (changes: Partial<QuickAddRun> = {}) =>
  run({
    status: 'succeeded',
    processed: 5,
    created: 5,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...changes,
  });

const publishRun = (
  changes: Partial<PublishRun> = {},
  counts: Partial<PublishRun['counts']> = {},
): PublishRun => ({
  id: 11,
  status: 'succeeded',
  source: 'quick_add',
  quickAddRunId: 9,
  scope: { kind: 'quickAddRun', runId: 9 },
  listed: true,
  auto: true,
  total: 10,
  counts: {
    ready: 0,
    review: 0,
    blocked: 0,
    included: 7,
    noRule: 0,
    published: 7,
    skipped: 3,
    refused: 0,
    pending: 0,
    ...counts,
  },
  switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
  replacedBy: null,
  error: null,
  requestedBy: null,
  requestedByName: null,
  createdAt: new Date().toISOString(),
  preparedAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  ...changes,
});

/** The groups route answers these groups (Apple, 5 services unless said) and the newest run of the supplier (none unless said). */
function stubGroups(
  groups: ServiceGroup[] = [group('imei', 'Apple', 5)],
  latestRun: QuickAddRun | null = null,
) {
  const sum = groups.reduce((total, row) => total + row.addable, 0);
  mockServer.use(
    http.get('*/admin/suppliers/:id/service-groups', () =>
      HttpResponse.json({
        groups,
        totals: { total: sum, addable: sum, imported: 0, unavailable: 0, unsupported: 0 },
        latestRun,
      }),
    ),
  );
}

/** The start is answered with `started` and every read of the run with `later`; `sent.body` keeps what the start was sent. */
function stubRun(sent: { body?: unknown }, started: QuickAddRun, later: QuickAddRun) {
  mockServer.use(
    http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
      sent.body = await request.json();
      return HttpResponse.json(started, { status: 202 });
    }),
    http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(later)),
  );
}

/** The publish runs route answers `answer()` for each read; `reads` keeps the address of every read. */
function stubPublishRuns(answer: (read: number) => PublishRun[]) {
  const reads: URL[] = [];
  mockServer.use(
    http.get('*/admin/publish-runs', ({ request }) => {
      reads.push(new URL(request.url));
      const rows = answer(reads.length);
      return HttpResponse.json(rows, { headers: { 'x-total-count': String(rows.length) } });
    }),
  );
  return reads;
}

/** Opens the supplier page and Quick add; the dialog may open on any step. */
async function openAny(user: User, permissions?: string[]) {
  const app = await openSuppliers('/suppliers', permissions ? { permissions } : {});
  const detail = await detailOf('Nordic GSM');
  await user.click(await detail.findByRole('button', { name: 'Quick add…' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Quick add from Nordic GSM' }));
  return { app, dialog };
}

/** Opens the supplier page and Quick add, and waits for the groups table. */
async function openDialog(user: User, permissions?: string[]) {
  const opened = await openAny(user, permissions);
  await opened.dialog.findByRole('table', { name: 'Supplier groups' });
  return opened;
}

const press = (user: User, dialog: Scope, name: string | RegExp) =>
  user.click(dialog.getByRole('button', { name }));
const box = (dialog: Scope) => dialog.getByRole('checkbox', { name: BOX }) as HTMLInputElement;

/** Ticks Apple (and the shop box when asked), reviews, adds, and waits until the run's result shows. */
async function addApple(user: User, dialog: Scope, { shop = true } = {}) {
  await user.click(dialog.getByRole('checkbox', { name: 'Select Apple (IMEI)' }));
  if (shop) await user.click(box(dialog));
  await press(user, dialog, 'Review');
  await press(user, dialog, 'Add 5 services');
  expect(await dialog.findByText('5 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
}

/** The paragraph that holds "Publishing to the shop:", as one text. */
async function publishingLine(dialog: Scope) {
  const label = await dialog.findByText('Publishing to the shop:', {}, { timeout: 5_000 });
  return label.closest('p') as HTMLElement;
}

describe('the tick box', () => {
  it('is off at first, under Add them as, and says what it does', async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    expect(box(dialog)).not.toBeChecked();
    expect(box(dialog)).toBeEnabled();
    expect(box(dialog)).not.toHaveAttribute('title');
    expect(box(dialog)).toHaveAccessibleDescription(
      'Each gets a clean title and a price from the retail pricing rules. The ones that need a look wait in Catalog, Publish runs.',
    );
    const status = dialog.getByRole('radio', { name: /^On sale/ });
    expect(status.compareDocumentPosition(box(dialog))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('is locked, with the reason in its title, while Switched off is chosen, and the body then leaves publish out', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended({ serviceStatus: 'disabled', publish: 'none' }));
    const { dialog } = await openDialog(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select Apple (IMEI)' }));
    await user.click(box(dialog));
    expect(box(dialog)).toBeChecked();

    await user.click(dialog.getByRole('radio', { name: /^Switched off/ }));
    expect(box(dialog)).toBeDisabled();
    expect(box(dialog)).not.toBeChecked();
    expect(box(dialog)).toHaveAttribute('title', 'Services added switched off cannot go on the shop.');
    await press(user, dialog, 'Review');
    expect(dialog.getByText('They are added switched off.')).toBeInTheDocument();
    expect(dialog.queryByText(/also published to the shop/)).not.toBeInTheDocument();
    await press(user, dialog, 'Add 5 services');
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', serviceStatus: 'disabled' }));
  });

  it('takes the tick back when On sale is chosen again', async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    await user.click(box(dialog));
    await user.click(dialog.getByRole('radio', { name: /^Switched off/ }));
    expect(box(dialog)).toBeDisabled();
    await user.click(dialog.getByRole('radio', { name: /^On sale/ }));
    expect(box(dialog)).toBeEnabled();
    expect(box(dialog)).toBeChecked();
    expect(box(dialog)).not.toHaveAttribute('title');
  });

  it('is locked for a role without storefront:publish, which names the permission', async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user, ['suppliers:read', 'catalog:create']);
    expect(box(dialog)).toBeDisabled();
    expect(box(dialog)).toHaveAttribute('title', 'You need the storefront:publish permission');
    await user.click(box(dialog));
    expect(box(dialog)).not.toBeChecked();
  });

  it('puts publish: { listed: true } in the body, and the review says they are also published', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended());
    const { dialog } = await openDialog(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select Apple (IMEI)' }));
    await user.click(box(dialog));
    await press(user, dialog, 'Review');

    expect(
      dialog.getByText('Price for merchants: the supplier’s cost plus the default minimum profit.'),
    ).toBeInTheDocument();
    expect(
      dialog.getByText('They are also published to the shop at the retail pricing rules’ prices.'),
    ).toBeInTheDocument();
    // The picks and the tick survive Back.
    await press(user, dialog, 'Back');
    expect(box(dialog)).toBeChecked();
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 5 services');
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', publish: { listed: true } }));
  });
});

describe('what the server refuses', () => {
  it('says no rule is active with a link to Retail pricing, back on the groups with the tick kept', async () => {
    const user = userEvent.setup();
    const { app, dialog } = await openDialog(user);
    const rules = await listRetailPriceRules();
    await Promise.all(rules.data.map((rule) => updateRetailPriceRule(rule.id, { isActive: false })));

    await user.click(dialog.getByRole('checkbox', { name: 'Select the groups shown' }));
    await user.click(box(dialog));
    await press(user, dialog, 'Review');
    await press(user, dialog, /^Add 2 services$/);

    const alert = (await dialog.findByText(/Set a retail pricing rule first\./)).closest('p') as HTMLElement;
    expect(alert).toHaveAttribute('role', 'alert');
    const link = within(alert).getByRole('link', { name: 'Open Retail pricing' });
    expect(link).toHaveAttribute('href', '/catalog?view=settings&tab=shop-prices');
    // Back on step 1, where the tick box is, still ticked.
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(box(dialog)).toBeChecked();

    await user.click(link);
    await waitFor(() => expect(app.location()).toBe('/catalog?view=settings&tab=shop-prices'), {
      timeout: 10_000,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Quick add from/ })).not.toBeInTheDocument(),
    );
  });

  it('shows the server’s 403 in the slot, with no link, when the role lost the permission after the page opened', async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    roleStore().patch(1, { permissions: ['suppliers:read', 'catalog:create'] });
    await user.click(dialog.getByRole('checkbox', { name: 'Select the groups shown' }));
    await user.click(box(dialog));
    await press(user, dialog, 'Review');
    await press(user, dialog, /^Add 2 services$/);

    expect(await dialog.findByText('You need the storefront:publish permission.')).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Open Retail pricing' })).not.toBeInTheDocument();
  });

  it('shows a refusal that is not about publish as before: the groups again, no link', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'scope', message: 'Nothing to add.' },
        ]),
      ),
    );
    const { dialog } = await openDialog(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select the groups shown' }));
    await press(user, dialog, 'Review');
    await press(user, dialog, /^Add 2 services$/);
    expect(await dialog.findByText('Nothing to add.')).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Open Retail pricing' })).not.toBeInTheDocument();
  });
});

describe('the publishing line of step 3', () => {
  it('is not there for a run that did not ask to publish, and the page asks nothing', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run({ publish: 'none' }), ended({ publish: 'none' }));
    const reads = stubPublishRuns(() => []);
    const { dialog } = await openDialog(user);
    await addApple(user, dialog, { shop: false });
    expect(dialog.queryByText('Publishing to the shop:')).not.toBeInTheDocument();
    expect(reads).toHaveLength(0);
  });

  it('says preparing while the server has made no run yet, and asks for the run of this Quick add', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended());
    const reads = stubPublishRuns(() => []);
    const { dialog } = await openDialog(user);
    await addApple(user, dialog);
    expect(await publishingLine(dialog)).toHaveTextContent('Publishing to the shop: preparing');
    expect(dialog.queryByRole('button', { name: 'Prepare the shop preview' })).not.toBeInTheDocument();
    const read = reads[0];
    expect(read.searchParams.get('quickAddRunId')).toBe('9');
    expect(read.searchParams.get('_start')).toBe('0');
    expect(read.searchParams.get('_end')).toBe('1');
  });

  it('tells what is on the shop and what needs a look, with a link to the run', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended());
    stubPublishRuns(() => [publishRun()]);
    const { dialog } = await openDialog(user);
    await addApple(user, dialog);
    const line = await publishingLine(dialog);
    await waitFor(() =>
      expect(line).toHaveTextContent('Publishing to the shop: 7 on the shop, 3 need a look.'),
    );
    expect(within(line).getByRole('link', { name: 'Open the run' })).toHaveAttribute(
      'href',
      '/catalog?view=publish&run=11',
    );
    expect(dialog.queryByRole('button', { name: 'Prepare the shop preview' })).not.toBeInTheDocument();
  });

  it('shows the line for a Quick add that stopped after adding some services', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(
      sent,
      run(),
      ended({ status: 'failed', created: 3, processed: 3, error: 'The run stopped before it finished.' }),
    );
    stubPublishRuns(() => [publishRun({}, { published: 3, skipped: 0, pending: 7 })]);
    const { dialog } = await openDialog(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select Apple (IMEI)' }));
    await user.click(box(dialog));
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 5 services');
    const line = await publishingLine(dialog);
    await waitFor(() => expect(line).toHaveTextContent('3 on the shop, 7 need a look.'));
    expect(dialog.getByRole('button', { name: 'Back to groups' })).toBeInTheDocument();
  });

  it('reads the run again every 5 seconds while it is going, and shows its end', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended());
    const reads = stubPublishRuns((read) =>
      read === 1
        ? [publishRun({ status: 'running' }, { published: 3, skipped: 0, pending: 4 })]
        : [publishRun()],
    );
    const { dialog } = await openDialog(user);
    await addApple(user, dialog);
    const line = await publishingLine(dialog);
    await waitFor(() => expect(line).toHaveTextContent('Publishing to the shop: 3 on the shop so far.'));
    await waitFor(
      () => expect(line).toHaveTextContent('Publishing to the shop: 7 on the shop, 3 need a look.'),
      {
        timeout: 9_000,
      },
    );
    expect(reads).toHaveLength(2);
  });

  it('says the preview was not prepared when there is no run two minutes after the end, and prepares it', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    let prepared: unknown;
    stubGroups();
    // Quick add run 1 is one the storefront mock knows (8 services), so the real route answers the new run.
    stubRun(
      sent,
      run({ id: 1 }),
      ended({ id: 1, finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString() }),
    );
    stubPublishRuns(() => []);
    mockServer.use(
      http.post('*/admin/publish-runs', async ({ request }) => {
        prepared = await request.clone().json();
        return undefined;
      }),
    );
    const { app, dialog } = await openDialog(user);
    await addApple(user, dialog);
    const line = await publishingLine(dialog);
    await waitFor(() =>
      expect(line).toHaveTextContent('Publishing to the shop: The shop preview was not prepared.'),
    );
    const button = dialog.getByRole('button', { name: 'Prepare the shop preview' });
    expect(button).toBeEnabled();
    expect(dialog.queryByRole('link', { name: 'Open the run' })).not.toBeInTheDocument();

    await user.click(button);
    await waitFor(() => expect(prepared).toEqual({ scope: { kind: 'quickAddRun', runId: 1 } }));
    await waitFor(() => expect(app.location()).toBe('/catalog?view=publish&run=8'), { timeout: 10_000 });
  });

  it('says the same for a run that failed before its preview was ready', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended());
    stubPublishRuns(() => [
      publishRun({
        status: 'failed',
        preparedAt: null,
        error: 'The preview was not finished. Start a new one.',
      }),
    ]);
    const { dialog } = await openDialog(user);
    await addApple(user, dialog);
    expect(await dialog.findByText('The shop preview was not prepared.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Prepare the shop preview' })).toBeEnabled();
  });

  it('locks the button without storefront:create, naming the permission', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended({ finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString() }));
    stubPublishRuns(() => []);
    const { dialog } = await openDialog(user, ['suppliers:read', 'catalog:create', 'storefront:publish']);
    await addApple(user, dialog);
    const button = await dialog.findByRole('button', { name: 'Prepare the shop preview' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the storefront:create permission');
  });

  it('shows the server’s refusal of the preview as a toast and stays on the dialog', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups();
    stubRun(sent, run(), ended({ finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString() }));
    stubPublishRuns(() => []);
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
    const { app, dialog } = await openDialog(user);
    await addApple(user, dialog);
    await user.click(await dialog.findByRole('button', { name: 'Prepare the shop preview' }));
    const toast = toasts();
    expect(await toast.findByText('Could not prepare the preview')).toBeInTheDocument();
    expect(
      toast.getByText('Nothing to publish: every service of this choice is already on the shop.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/suppliers');
    expect(dialog.getByRole('button', { name: 'Prepare the shop preview' })).toBeEnabled();
  });

  it('says it could not read the run when the read is refused, and Retry reads it again', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    let calls = 0;
    stubGroups();
    stubRun(sent, run(), ended());
    mockServer.use(
      http.get('*/admin/publish-runs', () => {
        calls += 1;
        return calls <= 1
          ? problem(403, 'FORBIDDEN', 'Forbidden', 'You need the storefront:read permission.')
          : HttpResponse.json([publishRun()], { headers: { 'x-total-count': '1' } });
      }),
    );
    const { dialog } = await openDialog(user);
    await addApple(user, dialog);
    const line = await publishingLine(dialog);
    await waitFor(() => expect(line).toHaveTextContent('Publishing to the shop: could not be read.'), {
      timeout: 5_000,
    });
    await user.click(within(line).getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(dialog.getByText('Publishing to the shop:').closest('p')).toHaveTextContent(
        '7 on the shop, 3 need a look.',
      ),
    );
  });
});

describe('Quick add opened again after the run ended', () => {
  /** The newest run is over, asked to publish and made services: the answer of the groups route and of the run's own read. */
  function stubEnded(changes: Partial<QuickAddRun> = {}) {
    const over = ended(changes);
    stubGroups([group('imei', 'Apple', 5)], over);
    mockServer.use(http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(over)));
  }

  it('opens on step 3 with the publishing line, not on the groups', async () => {
    const user = userEvent.setup();
    stubEnded();
    const reads = stubPublishRuns(() => [publishRun()]);
    const { dialog } = await openAny(user);
    const line = await publishingLine(dialog);
    await waitFor(() =>
      expect(line).toHaveTextContent('Publishing to the shop: 7 on the shop, 3 need a look.'),
    );
    expect(within(line).getByRole('link', { name: 'Open the run' })).toHaveAttribute(
      'href',
      '/catalog?view=publish&run=11',
    );
    expect(reads[0].searchParams.get('quickAddRunId')).toBe('9');
    expect(dialog.queryByRole('table', { name: 'Supplier groups' })).not.toBeInTheDocument();
    // Add more goes to the groups with the picks cleared, as after a run that was just watched.
    await press(user, dialog, 'Add more');
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
  });

  it('keeps Prepare the shop preview when the run it asked for was never made', async () => {
    const user = userEvent.setup();
    let prepared: unknown;
    // Quick add run 1 is one the storefront mock knows, so the real route answers the new run.
    stubEnded({ id: 1, finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString() });
    stubPublishRuns(() => []);
    mockServer.use(
      http.post('*/admin/publish-runs', async ({ request }) => {
        prepared = await request.clone().json();
        return undefined;
      }),
    );
    const { app, dialog } = await openAny(user);
    expect(
      await dialog.findByText('The shop preview was not prepared.', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Prepare the shop preview' }));
    await waitFor(() => expect(prepared).toEqual({ scope: { kind: 'quickAddRun', runId: 1 } }));
    await waitFor(() => expect(app.location()).toBe('/catalog?view=publish&run=8'), { timeout: 10_000 });
  });

  it('opens on step 3 for a run that failed after it made some services, with its line and its error', async () => {
    const user = userEvent.setup();
    const error = 'The run stopped before it finished.';
    stubEnded({ status: 'failed', created: 3, processed: 3, error });
    const reads = stubPublishRuns(() => [publishRun({}, { published: 3, skipped: 0, pending: 7 })]);
    const { dialog } = await openAny(user);
    const line = await publishingLine(dialog);
    await waitFor(() =>
      expect(line).toHaveTextContent('Publishing to the shop: 3 on the shop, 7 need a look.'),
    );
    expect(within(line).getByRole('link', { name: 'Open the run' })).toHaveAttribute(
      'href',
      '/catalog?view=publish&run=11',
    );
    expect(dialog.getByText(error)).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Supplier groups' })).not.toBeInTheDocument();
    expect(reads[0].searchParams.get('quickAddRunId')).toBe('9');
    // A failed run offers the groups again, as after a run that succeeded.
    await press(user, dialog, 'Back to groups');
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
  });

  it('keeps Prepare the shop preview for a failed run whose publish run was never made', async () => {
    const user = userEvent.setup();
    let prepared: unknown;
    stubEnded({
      id: 1,
      status: 'failed',
      created: 3,
      processed: 3,
      error: 'The run stopped before it finished.',
      finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString(),
    });
    stubPublishRuns(() => []);
    mockServer.use(
      http.post('*/admin/publish-runs', async ({ request }) => {
        prepared = await request.clone().json();
        return undefined;
      }),
    );
    const { app, dialog } = await openAny(user);
    expect(
      await dialog.findByText('The shop preview was not prepared.', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Prepare the shop preview' }));
    await waitFor(() => expect(prepared).toEqual({ scope: { kind: 'quickAddRun', runId: 1 } }));
    await waitFor(() => expect(app.location()).toBe('/catalog?view=publish&run=8'), { timeout: 10_000 });
  });

  it('shows checking, not the button, while a reopened Quick add reads again after an empty answer', async () => {
    const user = userEvent.setup();
    const posts: unknown[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubEnded({ finishedAt: new Date(Date.now() - 5 * MINUTE).toISOString() });
    let reads = 0;
    mockServer.use(
      http.get('*/admin/publish-runs', async () => {
        reads += 1;
        // The first read finds no run (long after the end: "not prepared"); the second waits until the test lets it go.
        if (reads > 1) await gate;
        const rows = reads === 1 ? [] : [publishRun()];
        return HttpResponse.json(rows, { headers: { 'x-total-count': String(rows.length) } });
      }),
      http.post('*/admin/publish-runs', async ({ request }) => {
        posts.push(await request.clone().json());
        return undefined;
      }),
    );
    const first = await openAny(user);
    expect(
      await first.dialog.findByText('The shop preview was not prepared.', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    // The header's X and the footer's Close share the name: the footer button is the last.
    await user.click(first.dialog.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Quick add from Nordic GSM' })).not.toBeInTheDocument(),
    );

    // Opened again within minutes: the answer it kept says "not prepared", but the new read has not come back.
    const detail = await detailOf('Nordic GSM');
    await user.click(await detail.findByRole('button', { name: 'Quick add…' }));
    const again = within(await screen.findByRole('dialog', { name: 'Quick add from Nordic GSM' }));
    const line = await publishingLine(again);
    expect(line).toHaveTextContent('Publishing to the shop: checking...');
    expect(reads).toBe(2);
    expect(again.queryByRole('button', { name: 'Prepare the shop preview' })).not.toBeInTheDocument();
    expect(again.queryByText('The shop preview was not prepared.')).not.toBeInTheDocument();

    release();
    await waitFor(async () =>
      expect(await publishingLine(again)).toHaveTextContent(
        'Publishing to the shop: 7 on the shop, 3 need a look.',
      ),
    );
    expect(again.queryByRole('button', { name: 'Prepare the shop preview' })).not.toBeInTheDocument();
    expect(posts).toEqual([]);
  });

  it.each([
    ['did not ask to publish', { publish: 'none' as const }],
    ['made no service', { created: 0, processed: 0 }],
    ['failed before it made a service', { status: 'failed' as const, created: 0, processed: 0 }],
  ])('opens on the groups for a run that %s, and asks for no publish run', async (_name, changes) => {
    const user = userEvent.setup();
    stubEnded(changes);
    const reads = stubPublishRuns(() => []);
    const { dialog } = await openAny(user);
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(dialog.queryByText('Publishing to the shop:')).not.toBeInTheDocument();
    expect(reads).toHaveLength(0);
  });
});

describe('the hand-over in the mock', () => {
  it('makes the automatic publish run when the tick is on, and step 3 first reads it as preparing', async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select the groups shown' }));
    await user.click(box(dialog));
    await press(user, dialog, 'Review');
    await press(user, dialog, /^Add 2 services$/);
    expect(await dialog.findByText('2 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(await publishingLine(dialog)).toHaveTextContent('Publishing to the shop: preparing');

    // The run is the mock's own: a Quick add run, made by the system, of the two services, published at once.
    const made = (await listPublishRuns({ filters: { source: 'quick_add' }, sort: ['id'], order: ['desc'] }))
      .data[0];
    expect(made).toMatchObject({
      source: 'quick_add',
      quickAddRunId: 2,
      auto: true,
      listed: true,
      total: 2,
      scope: { kind: 'quickAddRun', runId: 2 },
    });
  });

  it('moves the run one step for each read of the list asked by Quick add run, and not for any other read', async () => {
    await openSuppliers();
    await startQuickAdd(1, { scope: 'all', publish: { listed: true } });
    const newest = async () =>
      (
        await listPublishRuns({
          filters: { quickAddRunId: 2 },
          start: 0,
          end: 1,
          sort: ['id'],
          order: ['desc'],
        })
      ).data[0];
    const history = await listPublishRuns({
      filters: { source: 'quick_add' },
      sort: ['id'],
      order: ['desc'],
    });
    expect(history.data[0]).toMatchObject({ quickAddRunId: 2, status: 'preparing' });
    const seen = [];
    for (let read = 0; read < 5; read += 1) seen.push((await newest()).status);
    expect(seen).toEqual(['preparing', 'queued', 'running', 'succeeded', 'succeeded']);
    const last = await newest();
    expect(last.counts.published).toBe(last.counts.included);
    expect(last.counts.published).toBeGreaterThan(0);
  });

  it('refuses publish for switched off services and, with no active rule, as the server does', async () => {
    await openSuppliers();
    await expect(
      startQuickAdd(1, { scope: 'all', serviceStatus: 'disabled', publish: { listed: true } }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { publish: ['Services added switched off cannot go on the shop.'] },
    });
    const rules = await listRetailPriceRules();
    await Promise.all(rules.data.map((rule) => updateRetailPriceRule(rule.id, { isActive: false })));
    await expect(startQuickAdd(1, { scope: 'all', publish: { listed: true } })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { publish: ['Set a retail pricing rule first.'] },
    });
    // Without the ask the same start is allowed, and the run says it did not ask.
    expect(await startQuickAdd(1, { scope: 'all' })).toMatchObject({ publish: 'none' });
  });

  it('makes the Quick add run known to "Prepare the shop preview", also when it did not ask to publish', async () => {
    await openSuppliers();
    const started = await startQuickAdd(1, { scope: 'all' });
    expect(started.publish).toBe('none');
    const made = await createPublishRun({ scope: { kind: 'quickAddRun', runId: started.id } });
    expect(made).toMatchObject({ status: 'preparing', source: 'console', auto: false, total: 2 });
  });

  it('finds the run staff made with Prepare the shop preview too, newest first, and leaves its own key null', async () => {
    await openSuppliers();
    const started = await startQuickAdd(1, { scope: 'all', publish: { listed: true } });
    const query = (quickAddRunId: number) =>
      listPublishRuns({ filters: { quickAddRunId }, start: 0, end: 1, sort: ['id'], order: ['desc'] });
    // Only the automatic run exists: it is found by its own key.
    expect((await query(started.id)).data[0]).toMatchObject({ auto: true, quickAddRunId: started.id });
    const made = await createPublishRun({ scope: { kind: 'quickAddRun', runId: started.id } });
    expect(made).toMatchObject({ source: 'console', auto: false, quickAddRunId: null });
    // Newest first: the staff run, found by its scope, then the automatic one.
    const both = await listPublishRuns({
      filters: { quickAddRunId: started.id },
      sort: ['id'],
      order: ['desc'],
    });
    // (The seeded history run 7 also says Quick add run 2, so it comes last.)
    expect(both.data.map((row) => [row.id, row.auto])).toEqual([
      [made.id, false],
      [made.id - 1, true],
      [7, true],
    ]);
    expect(both.total).toBe(3);
    expect((await query(started.id)).data[0]).toMatchObject({ id: made.id, quickAddRunId: null });
    // Another Quick add run's id finds neither.
    expect((await query(started.id + 40)).data).toEqual([]);
  });
});
