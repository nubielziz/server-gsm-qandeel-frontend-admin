// Tests for the dialog host: each action opens the one dialog of that action, with its fixed title, for the accounts it was asked for; nothing is
// drawn without a request; a dialog starts empty each time it opens. The host draws the real dialogs, so it is drawn inside the app's
// providers against the dev mock API; the tests look only at the title a dialog opens with.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { renderInApp } from '../../pages/test-utils';
import { account, guest } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountAction } from '../types';
import { AccountDialogs } from './AccountDialogs';
import type { DialogRequest } from './useAccountDialogs';

setupMockApi();
installAccountMocks();
// The real dialogs load with the app's providers, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ALL_ACTIONS: AccountAction[] = [
  'adjust',
  'freeze',
  'unfreeze',
  'credit-limit',
  'rank',
  'suspend',
  'reactivate',
  'block',
  'unblock',
  'password',
  'signout',
  'reset-2fa',
  'make-account',
  'export',
  'anonymize',
];
const request = (action: AccountAction, accounts = [account()], opening = 1): DialogRequest => ({
  action,
  accounts,
  opening,
});

describe('AccountDialogs', () => {
  it('draws nothing without a request', async () => {
    await renderInApp(<AccountDialogs request={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(ALL_ACTIONS)('opens the dialog of %s with its fixed title', async (action) => {
    await renderInApp(<AccountDialogs request={request(action)} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: dialogTitle(action, [account()]) })).toBeInTheDocument();
  });

  it.each(['suspend', 'reactivate', 'signout'] as const)(
    'gives %s every account it was asked for, and counts them in the title',
    async (action) => {
      await renderInApp(
        <AccountDialogs
          request={request(action, [account(), guest(), account({ id: 9 })])}
          onClose={vi.fn()}
        />,
      );
      expect(await screen.findByRole('dialog', { name: new RegExp('3 accounts') })).toBeInTheDocument();
    },
  );

  it('gives a dialog about one account the first of the accounts', async () => {
    await renderInApp(<AccountDialogs request={request('rank', [guest(), account()])} onClose={vi.fn()} />);
    expect(
      await screen.findByRole('dialog', { name: 'Change the rank of Sofia Alvarez' }),
    ).toBeInTheDocument();
  });

  it('closes the dialog when it asks to close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    await renderInApp(<AccountDialogs request={request('block')} onClose={onClose} />);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mounts a dialog afresh for each opening', async () => {
    const { rerender } = await renderInApp(
      <AccountDialogs request={request('block', [account()], 1)} onClose={vi.fn()} />,
    );
    const first = await screen.findByRole('dialog');
    rerender(<AccountDialogs request={request('block', [account()], 2)} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog')).not.toBe(first);
  });
});
