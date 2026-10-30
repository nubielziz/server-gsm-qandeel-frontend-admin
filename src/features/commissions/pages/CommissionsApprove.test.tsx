// Tests for the bulk approval ("Approve and pay out"), run through the whole app against the dev mock API: ticking rows and the strip,
// the review dialog, a clean approval, one with accruals the server skipped, "Select all", a refused request, and the ticks being dropped.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { approveAccruals, getAccrual, listAccruals } from '../api';
import { dataRows, dialogOf, openCommissions, accrualsTable, tabTexts } from '../test/commissionsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

const bar = () => within(screen.getByRole('region', { name: 'Bulk actions' }));

/** The ids of the first `count` rows of the table, read from their tick boxes. */
async function firstIds(count: number): Promise<number[]> {
  const boxes = await screen.findAllByRole('checkbox', { name: /^Select row / });
  return boxes
    .slice(0, count)
    .map((box) => Number(box.getAttribute('aria-label')?.replace('Select row ', '')));
}

async function tick(user: User, ...ids: number[]) {
  for (const id of ids) await user.click(await screen.findByRole('checkbox', { name: `Select row ${id}` }));
}

describe('the approval strip', () => {
  it('says how many are ticked, the amount and the agents, and clears', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await tick(user, 161, 160);
    expect(bar().getByText('2 selected')).toBeInTheDocument();
    expect(bar().getByText('$1.29 to 2 agents')).toBeInTheDocument();
    expect(bar().getByRole('button', { name: 'Approve 2' })).toBeEnabled();
    await user.click(bar().getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('says "1 agent" for one agent and ticks the whole page with the header box', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await tick(user, 161);
    expect(bar().getByText('$1.05 to 1 agent')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(bar().getByText('25 selected')).toBeInTheDocument();
  });

  it('drops the ticks when the page, the agent or the sort changes', async () => {
    const user = userEvent.setup();
    await openCommissions();
    const lonely = () =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    await tick(user, 161);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('26–49 of 49');
    lonely();
    await tick(user, ...(await firstIds(1)));
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Filter by agent' }),
      'Zain Mobile Hub',
    );
    await waitFor(lonely);
    await tick(user, ...(await firstIds(1)));
    await user.click(screen.getByRole('button', { name: /^Commission/ }));
    await waitFor(lonely);
  });

  it('drops the ticks when the status changes', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await tick(user, 161);
    await user.click(await screen.findByRole('button', { name: /^Approved/ }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /^Ready/ }));
    await screen.findByRole('checkbox', { name: 'Select row 161' });
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });
});

describe('Approve', () => {
  it('shows what each agent will receive, then pays out and tells how much went where', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions();
    await tick(user, 161, 160);
    await user.click(bar().getByRole('button', { name: 'Approve 2' }));
    const dialog = dialogOf('Approve 2 commissions');
    expect(dialog.getByText('$1.29 will be paid into agent wallets')).toBeInTheDocument();
    const agents = dialog.getAllByRole('listitem').map((item) => item.textContent);
    expect(agents).toEqual(['Cairo GSM Lab$1.05', 'Zain Mobile Hub$0.24']);
    expect(dialog.getByText(/This can’t be undone\./)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Approve $1.29' }));

    expect(await screen.findByText('2 commissions approved')).toBeInTheDocument();
    expect(screen.getByText('$1.29 credited to 2 agent wallets.')).toBeInTheDocument();
    const post = requests
      .sent()
      .find((request) => request.method === 'POST' && request.url.pathname.endsWith('/approve'));
    expect(post?.body).toEqual({ ids: expect.arrayContaining([161, 160]) });
    expect((post?.body as { ids: number[] }).ids).toHaveLength(2);
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    await waitFor(() => expect(tabTexts()[0]).toBe('Accruals47'));
    expect(await screen.findByText('47 accruals are ready to approve.')).toBeInTheDocument();
    const strip = within(screen.getByRole('region', { name: 'Commission figures' }));
    expect(await strip.findByText('47 accruals')).toBeInTheDocument();
    expect(await strip.findByText('114 accruals paid into wallets')).toBeInTheDocument();
    const paid = await getAccrual(161);
    expect(paid.status).toBe('approved');
    expect(paid.ledgerTxId).toEqual(expect.any(Number));
  });

  it('says "1 agent wallet" and "1 commission" for a single one', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await tick(user, 161);
    await user.click(bar().getByRole('button', { name: 'Approve 1' }));
    const dialog = dialogOf('Approve 1 commission');
    await user.click(dialog.getByRole('button', { name: 'Approve $1.05' }));
    expect(await screen.findByText('1 commission approved')).toBeInTheDocument();
    expect(screen.getByText('$1.05 credited to 1 agent wallet.')).toBeInTheDocument();
  });

  it('opens a summary with the server’s reason when it skipped some accruals, and pays the rest', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await tick(user, 161, 160, 159);
    await user.click(bar().getByRole('button', { name: 'Approve 3' }));
    const dialog = dialogOf('Approve 3 commissions');
    // Someone else approves one of them while the dialog is open.
    await approveAccruals({ ids: [159] });
    await user.click(dialog.getByRole('button', { name: /^Approve \$/ }));

    const summary = dialogOf('2 of 3 commissions approved');
    expect(
      summary.getByText(/\$1\.29 was paid into agent wallets\. 1 could not be approved/),
    ).toBeInTheDocument();
    const items = summary.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('CA-0159 · Cairo GSM Lab · Already approved.');
    expect(screen.queryByText('2 commissions approved')).not.toBeInTheDocument();
    await user.click(summary.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    expect(screen.queryByRole('dialog', { name: /approved$/ })).not.toBeInTheDocument();
    expect((await getAccrual(161)).status).toBe('approved');
  });

  it('keeps the dialog and the ticks, and shows the server’s message, when the request is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/commission-accruals/approve', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You cannot approve commissions today.'),
      ),
    );
    await openCommissions();
    await tick(user, 161);
    await user.click(bar().getByRole('button', { name: 'Approve 1' }));
    const dialog = dialogOf('Approve 1 commission');
    await user.click(dialog.getByRole('button', { name: /^Approve \$/ }));
    expect(await dialog.findByText('You cannot approve commissions today.')).toBeInTheDocument();
    expect(bar().getByText('1 selected')).toBeInTheDocument();
    expect((await getAccrual(161)).status).toBe('accrued');
  });

  it('closes with Cancel without sending anything', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions();
    await tick(user, 161);
    await user.click(bar().getByRole('button', { name: 'Approve 1' }));
    await user.click(dialogOf('Approve 1 commission').getByRole('button', { name: 'Cancel' }));
    expect(requests.sent().some((request) => request.url.pathname.endsWith('/approve'))).toBe(false);
    expect(bar().getByText('1 selected')).toBeInTheDocument();
  });
});

describe('Select all', () => {
  it('ticks every ready accrual of the filter, across pages, and approves them all', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await user.click(await screen.findByRole('button', { name: 'Select all 49' }));
    await waitFor(() => expect(bar().getByText('49 selected')).toBeInTheDocument());
    expect(bar().getByText('$23.75 to 2 agents')).toBeInTheDocument();
    await user.click(bar().getByRole('button', { name: 'Approve 49' }));
    const dialog = dialogOf('Approve 49 commissions');
    expect(dialog.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Zain Mobile Hub$14.10',
      'Cairo GSM Lab$9.65',
    ]);
    await user.click(dialog.getByRole('button', { name: 'Approve $23.75' }));
    expect(await screen.findByText('49 commissions approved')).toBeInTheDocument();
    expect(screen.getByText('$23.75 credited to 2 agent wallets.')).toBeInTheDocument();
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect((await listAccruals({ filters: { status: 'accrued' } })).total).toBe(0);
  });

  it('follows the agent filter and is offered on Ready only', async () => {
    const user = userEvent.setup();
    await openCommissions('/commissions?agent=1');
    await user.click(await screen.findByRole('button', { name: 'Select all 30' }));
    await waitFor(() => expect(bar().getByText('30 selected')).toBeInTheDocument());
    expect(bar().getByText(/to 1 agent$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Approved/ }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Select all/ })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('ticks the rows of the page as well', async () => {
    const user = userEvent.setup();
    await openCommissions();
    await user.click(await screen.findByRole('button', { name: 'Select all 49' }));
    await waitFor(() => expect(bar().getByText('49 selected')).toBeInTheDocument());
    const table = await accrualsTable();
    expect(dataRows(table)).toHaveLength(25);
    for (const box of table.getAllByRole('checkbox')) expect(box).toBeChecked();
  });
});
