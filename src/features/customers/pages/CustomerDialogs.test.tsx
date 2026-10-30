// Tests for the actions on a customer's page, run through the whole app against the dev mock API: editing (what is sent, nothing changed,
// "email taken"), the password and create-account dialogs with the temporary password shown once, signing out, suspending, reactivating,
// blocking, exporting and anonymising, and the buttons a missing permission turns off. A failed call always shows in its dialog.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { detailTabs, openCustomer } from '../test/customersPage';

setupMockApi();
// The page is a lazy chunk and every flow here uses real dialogs against the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const DANIEL = /Daniel Whitmore/; // c1: an account with one session
const SOFIA = /Sofia Alvarez/; // c2: a guest
const MIA = /Mia Schneider/; // c16: a guest with an open erasure request
const HANNAH = /Hannah Weber/; // c18: suspended
const JACK = /Jack Turner/; // c19: blocked

/** Records the JSON body of every request a route gets, then lets the mock answer as usual. */
function recordBodies(method: 'post' | 'patch', path: string): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http[method](path, async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

const panel = () => within(screen.getByRole('tabpanel'));

/** The yellow banner of a suspended customer (toasts are also status regions, so it is found by its words). */
async function suspendedBanner() {
  const banner = (await screen.findByText(/^Account suspended /)).closest('[role="status"]');
  if (!banner) throw new Error('The suspended banner is missing.');
  return within(banner as HTMLElement);
}

// jsdom's Blob has no text(), so a download is read back through a FileReader.
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
const openTab = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(detailTabs().getByRole('tab', { name }));

describe('Edit details', () => {
  it('says nothing changed, and sends no request, when the form is saved as it was', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('patch', '*/admin/customers/:id');
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Daniel Whitmore' });
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Daniel Whitmore');
    expect(within(dialog).getByLabelText('Country')).toHaveValue('GB');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Daniel Whitmore' })).not.toBeInTheDocument(),
    );
    expect(bodies).toEqual([]);
  });

  it('sends only the changed fields, counts them in the toast and updates the page', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('patch', '*/admin/customers/:id');
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Daniel Whitmore' });
    await user.clear(within(dialog).getByLabelText('Full name'));
    await user.type(within(dialog).getByLabelText('Full name'), 'Dan Whitmore');
    await user.selectOptions(within(dialog).getByLabelText('Country'), 'IE');
    await user.type(within(dialog).getByLabelText('Internal notes'), 'Calls on Mondays');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(screen.getByText('3 fields updated.')).toBeInTheDocument();
    expect(bodies).toEqual([{ name: 'Dan Whitmore', country: 'IE', internalNotes: 'Calls on Mondays' }]);
    expect(await screen.findByRole('heading', { level: 1, name: /Dan Whitmore/ })).toBeInTheDocument();
    expect(screen.getByText(/· Ireland ·/)).toBeInTheDocument();
  });

  it('checks the name and email before sending', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Daniel Whitmore' });
    await user.clear(within(dialog).getByLabelText('Full name'));
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Enter the customer’s name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('puts the server’s "email taken" under the email field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Daniel Whitmore' });
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'sofia.alvarez@inbox.example');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await within(dialog).findByText(/already belongs to Sofia Alvarez, who bought as a guest/),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Password…', () => {
  it('sends a link and signs the customer out of every device, as the dialog starts', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/password');
    await openCustomer(1, DANIEL, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Daniel Whitmore' });
    expect(within(dialog).getByRole('radio', { name: /Email a link to choose it/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Sign them out of every device' })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Reset link sent')).toBeInTheDocument();
    expect(
      screen.getByText('Sent to daniel.whitmore@mail.example. It works for 1 hour.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ mode: 'reset_link', revokeSessions: true }]);
    expect(await panel().findByText('No active sessions')).toBeInTheDocument();
    expect(panel().getByText(/^Reset link sent /)).toBeInTheDocument();
  });

  it('shows a temporary password once, with a copy button, and not again', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Daniel Whitmore' });
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sign them out of every device' }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Daniel Whitmore' });
    expect(within(reveal).getByText(/^[A-Za-z0-9]{14}$/)).toBeInTheDocument();
    expect(within(reveal).getByRole('button', { name: 'Copy temporary password' })).toBeInTheDocument();
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Temporary password for Daniel Whitmore' }),
      ).not.toBeInTheDocument(),
    );
    expect(await panel().findByText('Temporary, they must change it at next sign-in')).toBeInTheDocument();
    // Sessions were kept, as the box was unticked.
    expect(panel().getByText('1 device')).toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/customers/:id/password', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not change passwords.'),
      ),
    );
    await openCustomer(1, DANIEL, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Daniel Whitmore' });
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await within(dialog).findByText('You may not change passwords.')).toBeInTheDocument();
  });
});

describe('Create account…', () => {
  it('gives a guest an account with an invitation link, and the tab then manages an account', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/account');
    await openCustomer(2, SOFIA, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Create account…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create an account for Sofia Alvarez' });
    expect(
      within(dialog).getByText('They bought as a guest. Their past orders will show in the new account.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Account created')).toBeInTheDocument();
    expect(screen.getByText('An invitation was sent to sofia.alvarez@inbox.example.')).toBeInTheDocument();
    expect(bodies).toEqual([{ mode: 'reset_link' }]);
    expect(await panel().findByRole('button', { name: 'Password…' })).toBeInTheDocument();
    expect(panel().queryByRole('button', { name: 'Create account…' })).not.toBeInTheDocument();
  });

  it('shows a temporary password once', async () => {
    const user = userEvent.setup();
    await openCustomer(2, SOFIA, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Create account…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create an account for Sofia Alvarez' });
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Sofia Alvarez' });
    expect(within(reveal).getByText(/^[A-Za-z0-9]{14}$/)).toBeInTheDocument();
  });
});

describe('Sign out everywhere', () => {
  it('asks first, says how many devices, then ends the sessions', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { tab: 'account' });
    await user.click(await panel().findByRole('button', { name: 'Sign out everywhere' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign Daniel Whitmore out everywhere?' });
    expect(within(dialog).getByText(/signed out of 1 device\./)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Signed out of all devices')).toBeInTheDocument();
    await waitFor(() => expect(panel().getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled());
    expect(panel().getByText('No active sessions')).toBeInTheDocument();
  });
});

describe('Suspend… and Reactivate', () => {
  it('needs a reason, sends it with the note, and shows the suspended banner with a way back', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/suspend');
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    expect(await within(dialog).findByText('Choose a reason for the audit log.')).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Account may be compromised');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'phone lost');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));

    expect(await screen.findByText('Daniel Whitmore suspended')).toBeInTheDocument();
    expect(screen.getByText('Signed out of all devices.')).toBeInTheDocument();
    expect(bodies).toEqual([{ reason: 'Account may be compromised', note: 'phone lost' }]);
    const banner = await suspendedBanner();
    expect(banner.getByText(/Account may be compromised: phone lost\./)).toBeInTheDocument();
    expect(banner.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('heading', { level: 1 })).getByText('Suspended')).toBeInTheDocument();
  });

  it('leaves the note out of the request when none was typed', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/suspend');
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Other');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    await screen.findByText('Daniel Whitmore suspended');
    expect(bodies).toEqual([{ reason: 'Other' }]);
  });

  it('shows the server’s refusal in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/customers/:id/suspend', () =>
        problem(409, 'NOT_ACTIVE', 'Not an active customer', 'Someone suspended this account a moment ago.'),
      ),
    );
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Other');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    expect(
      await within(dialog).findByText('Someone suspended this account a moment ago.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Suspend Daniel Whitmore?' })).toBeInTheDocument();
  });

  it('reactivates a suspended customer from the banner after a review step', async () => {
    const user = userEvent.setup();
    await openCustomer(18, HANNAH);
    const banner = await suspendedBanner();
    expect(banner.getByText(/Customer asked us to pause the account: phone lost\./)).toBeInTheDocument();
    await user.click(banner.getByRole('button', { name: 'Reactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reactivate Hannah Weber?' });
    expect(within(dialog).getByText(/They can sign in and order again/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText('Hannah Weber reactivated')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/^Account suspended /)).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Suspend…' })).toBeInTheDocument();
  });

  it('shows the server’s refusal when reactivating', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/customers/:id/reactivate', () =>
        problem(409, 'NOT_SUSPENDED', 'Not suspended', 'Only a suspended customer can be reactivated.'),
      ),
    );
    await openCustomer(18, HANNAH);
    await user.click((await suspendedBanner()).getByRole('button', { name: 'Reactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reactivate Hannah Weber?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reactivate' }));
    expect(
      await within(dialog).findByText('Only a suspended customer can be reactivated.'),
    ).toBeInTheDocument();
  });
});

describe('Block… and Unblock', () => {
  it('needs a reason, then blocks and marks the customer high risk', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/block');
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Block…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Block customer' }));
    expect(await within(dialog).findByText('Choose a reason for the audit log.')).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Card testing or fraud');
    await user.click(within(dialog).getByRole('button', { name: 'Block customer' }));

    expect(await screen.findByText('Daniel Whitmore blocked')).toBeInTheDocument();
    expect(screen.getByText('Added to the blocklist.')).toBeInTheDocument();
    expect(bodies).toEqual([{ blocked: true, reason: 'Card testing or fraud' }]);
    const title = screen.getByRole('heading', { level: 1 });
    expect(await within(title).findByText('Blocked')).toBeInTheDocument();
    expect(within(title).getByText('High risk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Block…' })).not.toBeInTheDocument();
    // A blocked customer is not offered Suspend.
    expect(screen.queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
  });

  it('lifts a block after a review step', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/customers/:id/block');
    await openCustomer(19, JACK);
    await user.click(screen.getByRole('button', { name: 'Unblock' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unblock Jack Turner?' });
    expect(within(dialog).getByText(/Their email stays on the blocklist/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }));
    expect(await screen.findByText('Jack Turner unblocked')).toBeInTheDocument();
    expect(bodies).toEqual([{ blocked: false }]);
    expect(await screen.findByRole('button', { name: 'Block…' })).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { level: 1 })).getByText('Active')).toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/customers/:id/block', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Only the risk team can block a customer.'),
      ),
    );
    await openCustomer(1, DANIEL);
    await user.click(screen.getByRole('button', { name: 'Block…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Daniel Whitmore?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Other');
    await user.click(within(dialog).getByRole('button', { name: 'Block customer' }));
    expect(await within(dialog).findByText('Only the risk team can block a customer.')).toBeInTheDocument();
  });
});

describe('Export their data and Anonymise…', () => {
  // Stands in for the download: the files the page would save, and the click that saves them.
  function stubDownload() {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    const saved = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return { created, saved };
  }

  it('asks first, then downloads the customer’s data as a JSON file and says the request is marked done', async () => {
    const user = userEvent.setup();
    const { created, saved } = stubDownload();
    await openCustomer(1, DANIEL, { tab: 'consents' });
    await user.click(await panel().findByRole('button', { name: 'Export their data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export Daniel Whitmore’s data?' });
    expect(within(dialog).getByText(/customer-1\.json/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/open export request, if there is one, is marked done/),
    ).toBeInTheDocument();
    // Nothing has left yet: the file goes only when the review step is confirmed.
    expect(saved).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(await screen.findByText('Data exported')).toBeInTheDocument();
    expect(screen.getByText('customer-1.json. Any open export request is marked done.')).toBeInTheDocument();
    expect(saved).toHaveBeenCalledOnce();
    expect(JSON.parse(await readBlob(created[0]))).toMatchObject({
      customer: { id: 1, name: 'Daniel Whitmore' },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Export Daniel Whitmore’s data?' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('asks the server for nothing when the review step is cancelled', async () => {
    const user = userEvent.setup();
    const { saved } = stubDownload();
    let calls = 0;
    mockServer.use(
      http.get('*/admin/customers/:id/export', () => {
        calls += 1;
        return undefined;
      }),
    );
    await openCustomer(1, DANIEL, { tab: 'consents' });
    await user.click(await panel().findByRole('button', { name: 'Export their data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export Daniel Whitmore’s data?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Export Daniel Whitmore’s data?' }),
      ).not.toBeInTheDocument(),
    );
    expect(calls).toBe(0);
    expect(saved).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal of the export in the dialog, not as a toast, and keeps it open', async () => {
    const user = userEvent.setup();
    const { saved } = stubDownload();
    mockServer.use(
      http.get('*/admin/customers/:id/export', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not export customer data.'),
      ),
    );
    await openCustomer(1, DANIEL, { tab: 'consents' });
    await user.click(await panel().findByRole('button', { name: 'Export their data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export Daniel Whitmore’s data?' });
    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(await within(dialog).findByText('You may not export customer data.')).toBeInTheDocument();
    expect(screen.queryByText('Not allowed')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Export Daniel Whitmore’s data?' })).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });

  it('anonymises after a warning, then shows a removed customer with no actions', async () => {
    const user = userEvent.setup();
    await openCustomer(16, MIA, { tab: 'consents' });
    await user.click(await panel().findByRole('button', { name: 'Anonymise…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymise Mia Schneider?' });
    expect(within(dialog).getByText('This can’t be undone.')).toBeInTheDocument();
    expect(within(dialog).getByText(/IMEIs on past orders are cut to the model code/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Anonymise' }));

    expect(await screen.findByText('Customer anonymised')).toBeInTheDocument();
    const title = await screen.findByRole('heading', { level: 1, name: /Deleted customer/ });
    expect(within(title).getByText('Anonymised')).toBeInTheDocument();
    expect(screen.getByText(/^Personal data removed · Germany · customer since/)).toBeInTheDocument();
    for (const name of ['Edit details', 'Suspend…', 'Block…', 'Unblock', 'Reactivate']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    // The consents tab explains what was removed and offers no privacy buttons; the erasure request is done.
    expect(await panel().findByText(/Name, email and IMEIs have been removed/)).toBeInTheDocument();
    expect(panel().queryByRole('button', { name: 'Anonymise…' })).not.toBeInTheDocument();
    expect(await panel().findByText(/^DSR-32 · Erasure · Done /)).toBeInTheDocument();
    await openTab(user, /^Account/);
    expect(
      panel().getByText('This customer was anonymised. There is no account left to manage.'),
    ).toBeInTheDocument();
  });

  it('shows the customer’s orders with their IMEIs cut after anonymising', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL);
    const before = within(await screen.findByRole('table', { name: 'Orders by this customer' }));
    expect(await before.findByText('SF-20485')).toBeInTheDocument();
    expect(before.queryAllByText(/•••••••$/)).toHaveLength(0);
    await openTab(user, /^Consents/);
    await user.click(await panel().findByRole('button', { name: 'Anonymise…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymise Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Anonymise' }));
    await screen.findByText('Customer anonymised');
    await openTab(user, /^Orders/);
    const after = within(await screen.findByRole('table', { name: 'Orders by this customer' }));
    expect(await after.findAllByText(/•••••••$/)).toHaveLength(4);
  });

  it('shows the server’s refusal in the warning dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/customers/:id/anonymize', () =>
        problem(409, 'OPEN_DISPUTE', 'Open dispute', 'A card dispute is still open for this customer.'),
      ),
    );
    await openCustomer(1, DANIEL, { tab: 'consents' });
    await user.click(await panel().findByRole('button', { name: 'Anonymise…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymise Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Anonymise' }));
    expect(
      await within(dialog).findByText('A card dispute is still open for this customer.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Anonymise Daniel Whitmore?' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('turns off each action the staff member lacks the permission for, and names the permission', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { permissions: ['customers:read', 'orders:read'] });
    const title = (name: string) => screen.getByRole('button', { name });
    expect(title('Edit details')).toBeDisabled();
    expect(title('Edit details')).toHaveAttribute('title', 'You need the customers:update permission');
    expect(title('Suspend…')).toBeDisabled();
    expect(title('Suspend…')).toHaveAttribute('title', 'You need the customers:suspend permission');
    expect(title('Block…')).toBeDisabled();
    expect(title('Block…')).toHaveAttribute('title', 'You need the customers:block permission');

    await openTab(user, /^Account/);
    const account = panel();
    expect(account.getByRole('button', { name: 'Password…' })).toHaveAttribute(
      'title',
      'You need the customers:password permission',
    );
    expect(account.getByRole('button', { name: 'Password…' })).toBeDisabled();
    expect(account.getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled();
    expect(account.getByRole('button', { name: 'Edit details' })).toBeDisabled();
    expect(account.getByRole('button', { name: 'Block IP…' })).toBeDisabled();
    expect(account.getByRole('button', { name: 'Block IP…' })).toHaveAttribute(
      'title',
      'You need the access:create permission',
    );
  });

  it('keeps every action on for the Owner', async () => {
    await openCustomer(1, DANIEL);
    for (const name of ['Edit details', 'Suspend…', 'Block…']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
  });
});
