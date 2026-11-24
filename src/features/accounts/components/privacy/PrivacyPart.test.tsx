// Tests for the Privacy and risk part, run through the whole app against the dev mock API: the marketing choice and the consent records of the
// latest shop order, the account's data requests (left out without customers:privacy), the address a guest was seen from with its way to
// block it, the risk score and signals (no risk level), and the buttons each role is offered. The dialogs have their own file
// (PrivacyDialogs.test.tsx).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { renderAccount } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { account } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const DANIEL = /Daniel Whitmore/; // a retail account with a login, 4 orders, no requests
const LUKAS = /Lukas Brandt/; // agreed to marketing emails
const EMMA = /Emma Dubois/; // a finished export request
const MIA = /Mia Schneider/; // a guest with no orders and an open erasure request
const TYLER = /Tyler Brooks/; // a guest with orders, seen from an address nobody blocked
const JACK = /Jack Turner/; // a blocked guest with one order and two risk signals
const SOFIA = /Sofia Alvarez/; // a guest who has not ordered

const privacyOf = (id: number, name: RegExp, options: Parameters<typeof renderAccount>[2] = {}) =>
  renderAccount(id, name, { tab: 'privacy', ...options });

// The row of the part that has this label (a group named by its label).
const row = async (label: string) => within(await screen.findByRole('group', { name: label }));

describe('the privacy facts', () => {
  it('lists the consent records of the latest order and the marketing choice', async () => {
    await privacyOf(SEED.DANIEL, DANIEL);
    const consents = await row('Consent records');
    for (const text of [
      'Terms of service v3.2',
      'Privacy policy v2.1',
      'Refund policy v1.4',
      'Digital service starts now, right of withdrawal is waived',
    ]) {
      expect(await consents.findByText(text)).toBeInTheDocument();
    }
    expect(consents.queryByText('Marketing emails (opt-in)')).not.toBeInTheDocument();
    expect(consents.getAllByText(/IP 203\.0\.113\.177/)).toHaveLength(4);
    // The order the records belong to is a link to it.
    expect(consents.getByRole('link', { name: 'SF-20485' })).toHaveAttribute('href', '/orders?order=20485');
    expect(consents.getByText(/This is the evidence pack attached to a card dispute/)).toBeInTheDocument();
    expect((await row('Marketing emails')).getByText('Not opted in')).toBeInTheDocument();
    expect(screen.queryByText('IMEI storage')).not.toBeInTheDocument();
  });

  it('adds the marketing opt-in to the records for an account that agreed to it', async () => {
    await privacyOf(103, LUKAS);
    expect(await (await row('Consent records')).findByText('Marketing emails (opt-in)')).toBeInTheDocument();
    expect((await row('Marketing emails')).getByText('Opted in')).toBeInTheDocument();
  });

  it('lists the account’s data requests, done and open', async () => {
    await privacyOf(104, EMMA);
    const requests = await row('Requests');
    expect(await requests.findByText(/^DSR-31 · Export · done /)).toBeInTheDocument();
  });

  it('says there was no consent to record when the account has no orders, and counts down the open request', async () => {
    await privacyOf(SEED.MIA, MIA);
    expect(await screen.findByText('No consent recorded: no shop order yet')).toBeInTheDocument();
    const line = await (await row('Requests')).findByText(/^DSR-32 · Erasure ·/);
    expect(line).toHaveTextContent('DSR-32 · Erasure · due in 27d');
  });

  it('says there are no requests when the account made none', async () => {
    await privacyOf(SEED.DANIEL, DANIEL);
    expect(await (await row('Requests')).findByText('No requests')).toBeInTheDocument();
  });

  it('leaves out the rows the staff member cannot read, and turns off the buttons with the permission named', async () => {
    await privacyOf(SEED.DANIEL, DANIEL, { role: 'reader' });
    expect(await screen.findByRole('group', { name: 'Marketing emails' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Requests' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Data requests' })).not.toBeInTheDocument();
    const lock = (name: string, permission: string) => {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'title',
        `You need the ${permission} permission`,
      );
    };
    lock('Export data…', 'customers:privacy');
    lock('Anonymize…', 'customers:privacy');
    lock('Block…', 'clients:block');
  });

  it('offers every button to the Owner of an active retail account', async () => {
    await privacyOf(SEED.DANIEL, DANIEL);
    expect(await screen.findByRole('button', { name: 'Export data…' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Anonymize…' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Block…' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Unblock…' })).not.toBeInTheDocument();
  });

  it('offers Unblock instead of Block for a blocked account', async () => {
    await privacyOf(SEED.JACK, JACK);
    expect(await screen.findByRole('button', { name: 'Unblock…' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Block…' })).not.toBeInTheDocument();
  });

  it('shows a read that fails as a line with Retry, and keeps the buttons', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/privacy', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await privacyOf(SEED.DANIEL, DANIEL);
    expect(
      await screen.findByText('Could not load the privacy details.', {}, { timeout: 8_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Block…' })).toBeEnabled();
    mockServer.resetHandlers();
    mockServer.use(...(await import('../../mocks/index')).mocks.handlers);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await (await row('Marketing emails')).findByText('Not opted in')).toBeInTheDocument();
  });
});

describe('where a guest was seen from', () => {
  it('shows the address of the latest checkout with a Block IP… button, prefilled for the shop', async () => {
    const user = userEvent.setup();
    await privacyOf(110, TYLER);
    const seen = await row('Seen from');
    expect(await seen.findByText('198.51.100.192')).toBeInTheDocument();
    await user.click(seen.getByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).getByLabelText('IP address or range')).toHaveValue('198.51.100.192');
    expect(within(dialog).getByLabelText('Who it applies to')).toHaveValue('store');
    expect(within(dialog).getByText(/Last used by Tyler Brooks/)).toBeInTheDocument();
  });

  it('marks an address the server refuses, and links to the rule instead of offering to block it', async () => {
    await privacyOf(SEED.JACK, JACK);
    const seen = await row('Seen from');
    expect(await seen.findByText('192.0.2.77')).toBeInTheDocument();
    expect(await seen.findByText('Blocked')).toBeInTheDocument();
    expect(seen.getByRole('link', { name: 'See the rule' })).toHaveAttribute('href', '/access?tab=block');
    expect(seen.queryByRole('button', { name: 'Block IP…' })).not.toBeInTheDocument();
  });

  it('says the address is unknown when no order left one', async () => {
    await privacyOf(SEED.MIA, MIA);
    expect(await (await row('Seen from')).findByText('Unknown')).toBeInTheDocument();
  });

  it('turns Block IP… off without the access permission, and says which one', async () => {
    await privacyOf(110, TYLER, { permissions: ['clients:read', 'customers:privacy'] });
    const button = await (await row('Seen from')).findByRole('button', { name: 'Block IP…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the access:create permission');
  });

  it('is not drawn for an account with a login', async () => {
    await privacyOf(SEED.DANIEL, DANIEL);
    await row('Consent records');
    expect(screen.queryByRole('group', { name: 'Seen from' })).not.toBeInTheDocument();
  });
});

describe('risk', () => {
  it('shows the highest score and the signals, with a link to each order', async () => {
    await privacyOf(SEED.JACK, JACK);
    const score = await row('Highest score');
    expect(await score.findByText('71')).toBeInTheDocument();
    const signals = await row('Signals seen on orders');
    expect(signals.getByText(/Email on a previous chargeback/)).toBeInTheDocument();
    expect(signals.getByText(/Disposable email domain/)).toBeInTheDocument();
    const links = signals.getAllByRole('link', { name: 'SF-20400' });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/orders?order=20400');
  });

  it('says there were no signals, and a dash for the score, when there are no orders', async () => {
    await privacyOf(SEED.SOFIA, SOFIA);
    expect(
      await (await row('Signals seen on orders')).findByText('No risk signals on any order.'),
    ).toBeInTheDocument();
    expect(await row('Highest score')).toBeTruthy();
    expect((await row('Highest score')).getByText('–')).toBeInTheDocument();
  });

  it('shows the score of the riskiest order even when no order raised a signal', async () => {
    await privacyOf(SEED.DANIEL, DANIEL);
    expect(await (await row('Highest score')).findByText('24')).toBeInTheDocument();
    expect(
      (await row('Signals seen on orders')).getByText('No risk signals on any order.'),
    ).toBeInTheDocument();
  });

  it('shows no risk level, even when an older server still sends one', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/privacy', () =>
        HttpResponse.json({
          marketingOptIn: false,
          latestConsents: null,
          risk: { highestScore: 40, signals: [] },
          riskLevel: 'high',
        }),
      ),
    );
    await privacyOf(SEED.DANIEL, DANIEL);
    expect(await (await row('Highest score')).findByText('40')).toBeInTheDocument();
    expect(screen.queryByText(/risk level/i)).not.toBeInTheDocument();
    expect(screen.queryByText('High')).not.toBeInTheDocument();
    expect(screen.queryByText(/flagged/i)).not.toBeInTheDocument();
  });
});

describe('an anonymized account', () => {
  it('says what was removed and offers no button, not even Export', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id', () =>
        HttpResponse.json(
          account({
            id: SEED.MIA,
            name: 'Deleted account',
            email: 'deleted-account-116@redacted.invalid',
            status: 'anonymized',
            hasAccount: false,
            security: null,
          }),
        ),
      ),
    );
    await privacyOf(SEED.MIA, /Deleted account/);
    expect(await screen.findByText(/Name, email and IMEIs have been removed/)).toBeInTheDocument();
    for (const name of ['Export data…', 'Block…', 'Unblock…', 'Anonymize…']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    // The address of a guest is personal data: an anonymized record shows none.
    expect(screen.queryByRole('group', { name: 'Seen from' })).not.toBeInTheDocument();
  });
});
