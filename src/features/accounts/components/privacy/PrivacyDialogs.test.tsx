// Tests for the four dialogs of the Privacy and risk part, run through the whole app against the dev mock API: Block (one of the reasons is
// required and sent as it is, with no free note; the server's refusal stays in the dialog), Unblock, Export (a review step, a file saved,
// no request before it is confirmed) and Anonymize (a warning, then a removed account with no actions). A failed call always shows in its dialog.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { renderAccount } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and every flow here uses real dialogs against the mock API, so give them room.
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const DANIEL = /Daniel Whitmore/; // an active retail account with a login
const MIA = /Mia Schneider/; // a guest with an open erasure request (DSR-32)
const JACK = /Jack Turner/; // a blocked guest

const openPrivacy = (id: number, name: RegExp) => renderAccount(id, name, { tab: 'privacy' });

// Records the JSON body of every request a route gets, then lets the mock answer as usual.
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

// jsdom's Blob has no text(), so a download is read back through a FileReader.
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

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

describe('Block…', () => {
  it('needs a reason, then blocks the account and says so', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/clients/:id/block');
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Block…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Daniel Whitmore?' });
    expect(within(dialog).getByText(/Use Suspend for a pause/)).toBeInTheDocument();
    // The server takes one of the reasons only: there is no free note.
    expect(within(dialog).queryAllByRole('textbox')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Block account' }));
    expect(await within(dialog).findByText('Choose a reason for the audit log.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Card testing or fraud');
    await user.click(within(dialog).getByRole('button', { name: 'Block account' }));

    expect(await screen.findByText('Daniel Whitmore blocked')).toBeInTheDocument();
    expect(screen.getByText('Added to the blocklist.')).toBeInTheDocument();
    expect(bodies).toEqual([{ blocked: true, reason: 'Card testing or fraud' }]);
    // The record reads the account again: it is blocked, so the part offers Unblock and no longer Block.
    expect(await screen.findByRole('button', { name: 'Unblock…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Block…' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/block', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Only the risk team can block an account.'),
      ),
    );
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Block…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Daniel Whitmore?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Other');
    await user.click(within(dialog).getByRole('button', { name: 'Block account' }));
    expect(await within(dialog).findByText('Only the risk team can block an account.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Block Daniel Whitmore?' })).toBeInTheDocument();
    expect(screen.queryByText('Not allowed')).not.toBeInTheDocument();
  });

  it('puts the server’s refusal of the reason under the reason field', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/block', () =>
        problem(422, 'VALIDATION_FAILED', 'Invalid', 'Choose a reason.', [
          { field: 'reason', message: 'Choose a reason.' },
        ]),
      ),
    );
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Block…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Daniel Whitmore?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Abuse of refunds');
    await user.click(within(dialog).getByRole('button', { name: 'Block account' }));
    expect(await within(dialog).findByText('Choose a reason.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Unblock…', () => {
  it('lifts a block after a review step', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('post', '*/admin/clients/:id/block');
    await openPrivacy(SEED.JACK, JACK);
    await user.click(await screen.findByRole('button', { name: 'Unblock…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unblock Jack Turner?' });
    expect(
      within(dialog).getByText('Only what this block added to the blocklist is removed.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }));
    expect(await screen.findByText('Jack Turner unblocked')).toBeInTheDocument();
    expect(bodies).toEqual([{ blocked: false }]);
    expect(await screen.findByRole('button', { name: 'Block…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unblock…' })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/block', () =>
        problem(409, 'NOT_BLOCKED', 'Not blocked', 'Someone lifted this block a moment ago.'),
      ),
    );
    await openPrivacy(SEED.JACK, JACK);
    await user.click(await screen.findByRole('button', { name: 'Unblock…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unblock Jack Turner?' });
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }));
    expect(await within(dialog).findByText('Someone lifted this block a moment ago.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Unblock Jack Turner?' })).toBeInTheDocument();
  });
});

describe('Export data…', () => {
  it('asks first, then downloads the account’s data as a JSON file and says the request is marked done', async () => {
    const user = userEvent.setup();
    const { created, saved } = stubDownload();
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Export data…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export the data of Daniel Whitmore?' });
    expect(
      within(dialog).getByText(/A JSON file with everything stored about this account/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/never a key or a password/)).toBeInTheDocument();
    // Nothing has left yet: the file goes only when the review step is confirmed.
    expect(saved).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(await screen.findByText('Data exported')).toBeInTheDocument();
    expect(screen.getByText('account-101.json. Any open export request is marked done.')).toBeInTheDocument();
    expect(saved).toHaveBeenCalledOnce();
    expect(JSON.parse(await readBlob(created[0]!))).toMatchObject({
      account: { id: 101, name: 'Daniel Whitmore' },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Export the data of Daniel Whitmore?' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('asks the server for nothing when the review step is cancelled', async () => {
    const user = userEvent.setup();
    const { saved } = stubDownload();
    let calls = 0;
    mockServer.use(
      http.get('*/admin/clients/:id/export', () => {
        calls += 1;
        return undefined;
      }),
    );
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Export data…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export the data of Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Export the data of Daniel Whitmore?' }),
      ).not.toBeInTheDocument(),
    );
    expect(calls).toBe(0);
    expect(saved).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal of the export in the dialog, not as a toast, and keeps it open', async () => {
    const user = userEvent.setup();
    const { saved } = stubDownload();
    mockServer.use(
      http.get('*/admin/clients/:id/export', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not export account data.'),
      ),
    );
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Export data…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Export the data of Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(await within(dialog).findByText('You may not export account data.')).toBeInTheDocument();
    expect(screen.queryByText('Not allowed')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Export the data of Daniel Whitmore?' })).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
});

describe('Anonymize…', () => {
  it('anonymizes after a warning, then shows a removed account with no actions and its erasure request done', async () => {
    const user = userEvent.setup();
    await openPrivacy(SEED.MIA, MIA);
    expect(await (await screen.findByRole('group', { name: 'Requests' })).textContent).toContain('DSR-32');
    await user.click(await screen.findByRole('button', { name: 'Anonymize…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymize Mia Schneider?' });
    expect(
      within(dialog).getByText(/Name, email, notes and the IMEIs of their orders are removed for good/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/A guest record with the same proven email is erased too/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('This can’t be undone.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Anonymize' }));

    expect(await screen.findByText('Account anonymized')).toBeInTheDocument();
    expect(screen.getByText('Any open erasure request is marked done.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Deleted account' })).toBeInTheDocument();
    expect(await screen.findByText(/Name, email and IMEIs have been removed/)).toBeInTheDocument();
    for (const name of ['Anonymize…', 'Block…', 'Unblock…']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    // The erasure request of the account is done: the part says so.
    expect(await (await screen.findByRole('group', { name: 'Requests' })).textContent).toMatch(
      /DSR-32 · Erasure · done /,
    );
  });

  it('shows the server’s refusal in the warning dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/anonymize', () =>
        problem(409, 'OPEN_CHECKOUT', 'Open checkout', 'A checkout of this account is still open.'),
      ),
    );
    await openPrivacy(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Anonymize…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymize Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Anonymize' }));
    expect(await within(dialog).findByText('A checkout of this account is still open.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Anonymize Daniel Whitmore?' })).toBeInTheDocument();
    expect(screen.queryByText('Open checkout')).not.toBeInTheDocument();
  });

  it('is turned off for a merchant rank, with the reason, and opens no dialog', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.ZAIN, /Zain Mobile Hub/, { tab: 'privacy' });
    // The action rules turn the button off for a merchant rank and say why; the server refuses it too (409).
    const button = await screen.findByRole('button', { name: 'Anonymize…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Move the account to the retail rank first');
    await user.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
