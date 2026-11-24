// Tests for the Overview as the record draws it, run through the whole app against the dev mock API: the buttons open the dialogs of their
// own areas, and what a dialog changes shows on the Overview again (status, reason, rank). The dialogs of other areas are asserted only by
// their fixed title, so these tests hold before and after those areas land.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';
import { renderAccount } from '../../pages/test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const DANIEL = /Daniel Whitmore/;

function row(label: string) {
  const found = screen.getByText(label, { selector: '.form-row-label span' }).closest('.form-row');
  if (!(found instanceof HTMLElement)) throw new Error(`No row "${label}".`);
  return within(found);
}

describe('status', () => {
  it('suspends an account from the Overview, and the status, the reason and the button follow', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.DANIEL, DANIEL);
    await user.click(
      await within(await screen.findByRole('region', { name: 'Overview' })).findByRole('button', {
        name: 'Suspend…',
      }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'Account may be compromised');
    await user.click(dialog.getByRole('button', { name: 'Suspend' }));
    expect(await screen.findByText('Daniel Whitmore suspended')).toBeInTheDocument();
    expect(await row('Status').findByText(/Reason: Account may be compromised/)).toBeInTheDocument();
    expect(row('Status').getByText('Suspended')).toBeInTheDocument();
    expect(row('Status').queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
    expect(row('Status').getByRole('button', { name: 'Reactivate…' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reactivates a suspended account from the Overview, and it is active again', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.HANNAH, /Hannah/);
    expect(row('Status').getByText('Suspended')).toBeInTheDocument();
    await user.click(row('Status').getByRole('button', { name: 'Reactivate…' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: /Reactivate Hannah/ })).getByRole('button', {
        name: 'Reactivate',
      }),
    );
    await waitFor(() => expect(row('Status').getByText('Active')).toBeInTheDocument());
    expect(row('Status').getByRole('button', { name: 'Suspend…' })).toBeInTheDocument();
  });

  it('shows a suspension the migration made, with its fixed reason and no banner', async () => {
    await renderAccount(SEED.FORMER_PENDING, /Accra Devices/);
    expect(
      await row('Status').findByText(/Reason: Waiting for approval before the accounts were merged/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Activate account|Approve account/ }),
    ).not.toBeInTheDocument();
  });
});

describe('rank', () => {
  it('moves a merchant to another rank from the Overview, and the rank row follows', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.ZAIN, ZAIN);
    expect(row('Rank').getByText('merchant rank · 8% off base prices')).toBeInTheDocument();
    await user.click(row('Rank').getByRole('button', { name: 'Change rank…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Change the rank of Zain Mobile Hub' }));
    await waitFor(() => expect(dialog.getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'New rank' }), 'Wholesale (-4%)');
    await user.click(dialog.getByRole('button', { name: 'Change rank' }));
    expect(await screen.findByText('Zain Mobile Hub is now Wholesale.')).toBeInTheDocument();
    expect(await row('Rank').findByText('Wholesale')).toBeInTheDocument();
    expect(row('Rank').getByText('merchant rank · 4% off base prices')).toBeInTheDocument();
  });

  it('shows a role that is not the Owner the fact and no button', async () => {
    await renderAccount(SEED.ZAIN, ZAIN, { role: 'manager' });
    expect(await row('Rank').findByText('Only the Owner changes a rank.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change rank…' })).not.toBeInTheDocument();
  });
});

describe('sign-in', () => {
  it('opens the dialog that makes an account of a guest', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.SOFIA, /Sofia Alvarez/);
    await user.click(row('Login').getByRole('button', { name: 'Make an account…' }));
    expect(
      await screen.findByRole('dialog', { name: 'Make an account for Sofia Alvarez' }),
    ).toBeInTheDocument();
  });
});
