// Tests for sending reminders from the checkouts page, run through the whole app against the dev mock API: a row button, the bulk
// bar that counts out the rows that cannot be reminded, a partly refused answer told in a dialog, a send that reached nobody, the
// server's refusal shown as a toast, and the ticks that go when the list changes.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { filterGroup, openCheckouts, serveCheckouts } from '../test/checkoutsPage';
import { checkout } from '../test/fixtures';
import type { RecoverCheckoutsResult } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const READY = checkout({ id: 1, email: 'ra•••@a.example' });
const READY_TOO = checkout({ id: 2, email: 'li•••@b.example', serviceName: 'Samsung Info' });
const NO_CONSENT = checkout({ id: 3, email: 'no•••@c.example', marketingConsent: false, canRecover: false });

/** Serves this answer for the recover call and returns the bodies it received. */
function serveRecover(result: RecoverCheckoutsResult): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http.post('*/admin/checkouts/recover', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(result);
    }),
  );
  return bodies;
}

describe('sending reminders', () => {
  it('sends one reminder from a row button and leaves the other ticks alone', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY, READY_TOO]);
    const bodies = serveRecover({ sent: 1, skipped: [] });
    await openCheckouts();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 2' }));
    await user.click(await screen.findByRole('button', { name: 'Send a reminder to ra•••@a.example' }));
    await waitFor(() => expect(bodies).toEqual([{ ids: [1] }]));
    expect(await screen.findByText('1 reminder sent')).toBeInTheDocument();
    expect(screen.getByText('Each email has a one-click link back to the saved basket.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeChecked();
  });

  it('sends the ticked rows the server says can be reminded, and counts the others out', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY, READY_TOO, NO_CONSENT]);
    const bodies = serveRecover({ sent: 2, skipped: [] });
    await openCheckouts('/checkouts?filter=all');
    const send = await screen.findByRole('button', { name: 'Send reminder' });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByText('3 selected, 1 cannot be reminded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reminders' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Send reminders' }));
    await waitFor(() => expect(bodies).toEqual([{ ids: [1, 2] }]));
    expect(await screen.findByText('2 reminders sent')).toBeInTheDocument();
    // Everything is unticked afterwards, the left-out row too.
    await waitFor(() => expect(screen.queryByText(/selected/)).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the Send button off while only rows that cannot be reminded are ticked', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY, NO_CONSENT]);
    await openCheckouts('/checkouts?filter=all');
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 3' }));
    const send = screen.getByRole('button', { name: 'Send reminder' });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute('title', 'None of the ticked checkouts can be reminded');
  });

  it('tells how many went out and why the server left the others out', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY, READY_TOO, checkout({ id: 7, email: 'ne•••@g.example' })]);
    serveRecover({
      sent: 1,
      skipped: [
        { id: 2, reason: 'no_marketing_consent' },
        { id: 7, reason: 'no_marketing_consent' },
      ],
    });
    await openCheckouts();
    await user.click(await screen.findByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(screen.getByRole('button', { name: 'Send reminders' }));
    const dialog = within(await screen.findByRole('dialog', { name: '1 of 3 checkouts emailed' }));
    expect(dialog.getByText('1 email sent')).toBeInTheDocument();
    expect(dialog.getByRole('listitem')).toHaveTextContent(
      '2 checkouts skipped: the customer has not agreed to marketing emailCK-2, CK-7',
    );
    expect(screen.getByText('1 reminder sent')).toBeInTheDocument();
    // The dialog has a close cross in its header and a Close button in its footer.
    await user.click(dialog.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /emailed/ })).not.toBeInTheDocument());
  });

  it('shows a send that reached nobody as a dialog only, with no success toast', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY]);
    serveRecover({ sent: 0, skipped: [{ id: 1, reason: 'already_emailed' }] });
    await openCheckouts();
    await user.click(await screen.findByRole('button', { name: 'Send a reminder to ra•••@a.example' }));
    const dialog = within(await screen.findByRole('dialog', { name: '0 of 1 checkout emailed' }));
    expect(dialog.getByRole('listitem')).toHaveTextContent(
      '1 checkout skipped: a recovery email was already sentCK-1',
    );
    expect(screen.queryByText(/reminders? sent/)).not.toBeInTheDocument();
  });

  it("shows the server's refusal of the whole send as a toast and keeps the ticks", async () => {
    const user = userEvent.setup();
    serveCheckouts([READY]);
    mockServer.use(
      http.post('*/admin/checkouts/recover', () =>
        problem(429, 'RATE_LIMITED', 'Slow down', 'Only 200 recovery emails an hour.'),
      ),
    );
    await openCheckouts();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 1' }));
    await user.click(screen.getByRole('button', { name: 'Send reminder' }));
    expect(await screen.findByText('Slow down')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeChecked();
  });

  it('forgets the ticks when the filter changes', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY, NO_CONSENT]);
    await openCheckouts('/checkouts?filter=all');
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await user.click(filterGroup().getByRole('button', { name: 'Needs a reminder' }));
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument());
  });
});
