// Tests for an account drawn as a record: the left menu with the parts the role may see and the number of orders, the title and the line
// under it, the back link, the part the address names, the question asked before a part with unsaved changes is left, and the dialog host
// the parts open. Profile and Overview are replaced by small ones that say what the record gave them; the other parts and the dialogs are the
// real ones, so the record is drawn inside the app's providers against the dev mock API.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useDirtyMark } from '@/components/ui';
import { setupMockApi } from '@/test/renderApp';
import { renderInApp } from '../../pages/test-utils';
import { account, guest, merchantAccount } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';
import type { AccountDetail } from '../../types';
import { buildGrants } from '../frame/useAccountGrants';
import type { AccountPartId, AccountPartProps } from '../types';
import { openPart } from './openPart';
import { OpenAccount } from './OpenAccount';

setupMockApi();
installAccountMocks();
// The real parts and dialogs load with the app's providers, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

// Profile says it holds unsaved changes when "Type" is pressed; Overview opens the suspend dialog.
vi.mock('../profile', async () => {
  const { createElement: h } = await import('react');
  return {
    ProfilePart: ({ onDirtyChange }: AccountPartProps) =>
      h('button', { type: 'button', onClick: () => onDirtyChange(true) }, 'Type in Profile'),
  };
});
vi.mock('../overview', async () => {
  const { createElement: h } = await import('react');
  return {
    OverviewPart: ({ account: shown, onAction }: AccountPartProps) =>
      h('button', { type: 'button', onClick: () => onAction('suspend', [shown]) }, 'Suspend from Overview'),
  };
});

const OWNER = buildGrants(['*']);

function Probe() {
  const { pathname, search } = useLocation();
  return createElement('p', { 'data-testid': 'where' }, `${pathname}${search}`);
}

// The page holds the unsaved mark beside its read; here a small host does.
function Host({
  shown,
  part,
  grants = OWNER,
}: {
  shown: AccountDetail;
  part: AccountPartId | null;
  grants?: typeof OWNER;
}) {
  const mark = useDirtyMark(openPart(shown, part, grants).scope);
  return <OpenAccount account={shown} part={part} grants={grants} refreshing={false} mark={mark} />;
}

function show(shown: AccountDetail, part: AccountPartId | null = null, grants = OWNER) {
  return renderInApp(
    <>
      <Host shown={shown} part={part} grants={grants} />
      <Probe />
    </>,
    { route: `/accounts/${shown.id}` },
  );
}

describe('the record', () => {
  it('draws the name as the title, the number, the rank and the status under it, and the parts as a menu', async () => {
    await show(account({ id: 101, ordersCount: 4 }));
    expect(screen.getByRole('heading', { level: 2, name: 'Daniel Whitmore' })).toBeInTheDocument();
    expect(screen.getByText(/#101 · Storefront retail ·/)).toBeInTheDocument();
    const menu = within(screen.getByRole('navigation', { name: 'Parts of the account' }));
    expect(menu.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview',
      'Financial',
      'Profile',
      'Invoices',
      'Payments',
      'Security',
      'Orders4',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
    expect(menu.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(menu.getByRole('link', { name: 'Financial' })).toHaveAttribute('href', '/accounts/101?tab=wallet');
    expect(menu.getByRole('link', { name: /^Orders/ })).toHaveAttribute('href', '/accounts/101?tab=orders');
  });

  it('links back to the list', async () => {
    await show(account());
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute('href', '/accounts');
  });

  it('names a guest by their email when they have no name, and an anonymized account "Deleted account"', async () => {
    const { unmount } = await show(guest({ id: 131, name: '', email: 'no.name@mail.example' }));
    expect(screen.getByRole('heading', { level: 2, name: 'no.name@mail.example' })).toBeInTheDocument();
    unmount();
    await show(account({ id: 12, status: 'anonymized' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Deleted account' })).toBeInTheDocument();
  });

  it('shows the part the address names, and the first one for an unknown or hidden part', async () => {
    await show(merchantAccount({ id: 1 }), 'security');
    const menu = () => within(screen.getByRole('navigation', { name: 'Parts of the account' }));
    expect(menu().getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to the first part when the part is not one this account shows', async () => {
    await show(account({ id: 5 }), 'api');
    const menu = within(screen.getByRole('navigation', { name: 'Parts of the account' }));
    expect(menu.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    // The address is not rewritten.
    expect(screen.getByTestId('where')).toHaveTextContent('/accounts/5');
  });
});

describe('the dialog host', () => {
  it('opens the dialog of an action a part asks for, with its fixed title, and closes it', async () => {
    const user = userEvent.setup();
    await show(account({ id: 101 }));
    await user.click(screen.getByRole('button', { name: 'Suspend from Overview' }));
    expect(await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' })).toBeInTheDocument();
    // The dialog has two: the corner's and the footer's.
    await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('unsaved changes', () => {
  it('asks before another part is opened while a part holds unsaved changes, and stays when asked to keep editing', async () => {
    const user = userEvent.setup();
    await show(account({ id: 101 }), 'profile');
    await user.click(screen.getByRole('button', { name: 'Type in Profile' }));
    await user.click(screen.getByRole('link', { name: 'Support' }));
    const asking = screen.getByRole('dialog', { name: 'Discard your unsaved changes?' });
    expect(within(asking).getByText(/You have unsaved changes in Profile/)).toBeInTheDocument();
    await user.click(within(asking).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/accounts/101');
  });

  it('goes on to the held address after "Discard changes"', async () => {
    const user = userEvent.setup();
    await show(account({ id: 101 }), 'profile');
    await user.click(screen.getByRole('button', { name: 'Type in Profile' }));
    await user.click(screen.getByRole('link', { name: 'Back to All' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/accounts');
    expect(screen.getByTestId('where')).not.toHaveTextContent('/accounts/101');
  });

  it('asks nothing while nothing is unsaved', async () => {
    const user = userEvent.setup();
    await show(account({ id: 101 }), 'profile');
    await user.click(screen.getByRole('link', { name: 'Support' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/accounts/101?tab=support');
  });
});
