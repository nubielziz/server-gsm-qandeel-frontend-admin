// Tests for the Audit log page, run through the whole app against the dev mock API: the list newest first, "Show more" adding the next
// page, the filters kept in the address, and the empty, error and permission states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { answerWith, countText, entries, entry, openAudit } from '../test/auditPage';

setupMockApi();
// The page is a lazy chunk and every flow goes through the mock API, so give the tests room.
vi.setConfig({ testTimeout: 20_000 });

const showMore = () => screen.findByRole('button', { name: /^Show \d+ more/ });

describe('the list', () => {
  it('shows the title, the note about the log and the first page newest first with the count', async () => {
    await openAudit();
    expect(
      screen.getByText(
        'Every change to money, prices, merchants and suppliers, with who and when. Entries can’t be edited or deleted.',
      ),
    ).toBeInTheDocument();
    const rows = await entries();
    expect(rows).toHaveLength(25);
    expect(rows[0]).toHaveTextContent('Lina S. completed order ORD-48792 for Zain Mobile Hub');
    expect(rows[1]).toHaveTextContent('System synced supplier costs Gulf Server Hub');
    await waitFor(() => expect(countText()).toBe('42 entries'));
  });

  it('groups the entries under day headings, in order', async () => {
    await openAudit();
    await entries();
    const days = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(days.length).toBeGreaterThan(3);
    expect(new Set(days).size).toBe(days.length);
    expect(['Today', 'Yesterday']).toContain(days[0]);
  });

  it('names the person, the action and the record, and strikes the old value in the summary', async () => {
    await openAudit();
    const first = within((await entries())[0]);
    expect(first.getByText('Lina S.')).toHaveClass('font-medium');
    expect(first.getByText('processing')).toHaveClass('line-through');
    expect(first.getByText('completed', { selector: 'span.text-ink2' })).toBeInTheDocument();
    const four = within(
      (await entries()).find((item) =>
        item.textContent?.includes('flagged supplier degraded'),
      ) as HTMLElement,
    );
    expect(four.getByText(/\+1 more/)).toBeInTheDocument();
  });
});

describe('Show more', () => {
  it('adds the next page below the entries already shown and says what is left', async () => {
    const user = userEvent.setup();
    await openAudit();
    const first = (await entries())[0];
    const button = await showMore();
    expect(button).toHaveTextContent('Show 17 more of 17 remaining');
    await user.click(button);
    await waitFor(async () => expect(await entries()).toHaveLength(42));
    // The first page stays where it was: nothing was replaced.
    expect((await entries())[0]).toBe(first);
    expect((await entries()).at(-1)).toHaveTextContent('rejected order');
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).not.toBeInTheDocument();
    expect(countText()).toBe('42 entries');
  });

  it('keeps what is loaded and offers another try when the next page fails', async () => {
    const user = userEvent.setup();
    await openAudit();
    await entries();
    let fail = true;
    mockServer.use(
      http.get('*/admin/audit-logs', ({ request }) => {
        if (new URL(request.url).searchParams.get('_start') === '0' || !fail) return undefined;
        return HttpResponse.json(
          { type: 'x', title: 'Server error', status: 500, code: 'INTERNAL', detail: 'Down.' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );
    await user.click(await showMore());
    // A failed read is tried once more before it is reported.
    expect(
      await screen.findByText('Could not load more entries.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(await entries()).toHaveLength(25);
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(async () => expect(await entries()).toHaveLength(42));
  });

  it('shows no button when everything fits on one page', async () => {
    await openAudit('/audit?type=merchant');
    await waitFor(() => expect(countText()).toBe('6 entries'));
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).not.toBeInTheDocument();
  });
});

describe('states', () => {
  it('says nothing was recorded yet when the log is empty', async () => {
    answerWith([]);
    await openAudit();
    expect(await screen.findByText('Nothing recorded yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Every change to prices, balances, merchants and suppliers is written here/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows the server’s message with Retry when the list fails, and loads on Retry', async () => {
    const user = userEvent.setup();
    let fail = true;
    mockServer.use(
      http.get('*/admin/audit-logs', () =>
        fail
          ? HttpResponse.json(
              { type: 'x', title: 'Server error', status: 500, code: 'INTERNAL', detail: 'The log is down.' },
              {
                status: 500,
                headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': 'req-9' },
              },
            )
          : undefined,
      ),
    );
    await openAudit();
    expect(
      await screen.findByText('Could not load the audit log', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('The log is down.')).toBeInTheDocument();
    expect(screen.getByText('req-9')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await entries()).toHaveLength(25);
  });

  it('writes an entry without names from the type and the number', async () => {
    answerWith([
      entry({ id: 5, actorName: null, actorId: 3, entityLabel: null, entityType: 'orders', entityId: 4812 }),
    ]);
    await openAudit();
    expect(await entries()).toHaveLength(1);
    expect((await entries())[0]).toHaveTextContent('Staff #3 changed Order #4812');
  });

  it('shows the access screen instead of the page without audit:read', async () => {
    await openAudit('/audit', { permissions: ['orders:read'] });
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).not.toBeInTheDocument();
  });
});
