// Tests for the Verification tab of a merchant's page (feature 20), run through the whole app against the dev mock API: the merchant's
// current verification state and own requests, the side sheet with the decision, and the loading, empty and error states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, rowOf, sectionTabs, tableNamed } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ALGIERS = /Algiers Service Plus/;
const panel = () => within(screen.getByRole('tabpanel', { name: 'Verification' }));

async function openVerification(id: number, name: string | RegExp, query = '', permissions?: string[]) {
  return openMerchant(id, name, `?tab=verification${query}`, permissions ? { permissions } : {});
}

describe('requests of one merchant', () => {
  it('shows the current state and only this merchant’s requests, asked from the server by merchant', async () => {
    const seen: string[] = [];
    mockServer.use(
      http.get('*/admin/kyc-submissions', ({ request }) => {
        seen.push(new URL(request.url).search);
        return undefined;
      }),
    );
    await openVerification(18, ALGIERS);
    expect(panel().getByText('Verification status')).toBeInTheDocument();
    expect(panel().getByText('In review')).toBeInTheDocument();
    const table = await tableNamed('Verification requests');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2));
    expect(table.queryByText('Accra Devices')).not.toBeInTheDocument();
    expect(table.getByRole('button', { name: /^Request #\d+$/ })).toBeInTheDocument();
    expect(table.getByText('Pending')).toBeInTheDocument();
    expect(seen.some((search) => search.includes('clientId=18'))).toBe(true);
  });

  it('shows an approved request with who reviewed it', async () => {
    await openVerification(1, /Zain Mobile Hub/);
    const row = await rowOf('Verification requests', /^Request #\d+$/);
    expect(row.getByText('Approved')).toBeInTheDocument();
    expect(row.getByText('Rami K.')).toBeInTheDocument();
    expect(panel().getByText('Verified')).toBeInTheDocument();
  });

  it('explains a merchant with no requests', async () => {
    await openVerification(5, /Cairo GSM Lab/);
    expect(await screen.findByText('No verification requests')).toBeInTheDocument();
    expect(screen.getByText('This merchant has not submitted documents yet.')).toBeInTheDocument();
  });

  it('shows an error with Retry when the requests cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/kyc-submissions', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openVerification(18, ALGIERS);
    expect(await screen.findByText('Could not load the verification requests')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the verification requests')).toBeInTheDocument();
  });
});

describe('the side sheet', () => {
  it('opens a request in the address, and a decision refreshes the tab and the page header', async () => {
    const user = userEvent.setup();
    const app = await openVerification(18, ALGIERS);
    expect(
      await screen.findByText(
        'KYC is in review. The merchant cannot place orders until you approve the account.',
      ),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^Request #\d+$/ }));
    expect(app.location()).toMatch(/^\/merchants\/18\?tab=verification&kyc=\d+$/);
    const drawer = await screen.findByRole('dialog', { name: 'Verification of Algiers Service Plus' });
    await user.click(within(drawer).getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog', { name: /Approve/ });
    await user.click(within(dialog).getByRole('button', { name: /^Approve/ }));
    expect(await screen.findByText('Algiers Service Plus verified')).toBeInTheDocument();
    // The tab's badge and the header's note both follow the decision.
    await waitFor(() => expect(panel().getByText('Verified')).toBeInTheDocument());
    expect(
      await screen.findByText(
        'KYC is verified. The merchant cannot place orders until you approve the account.',
      ),
    ).toBeInTheDocument();
    expect(
      (await rowOf('Verification requests', /^Request #\d+$/)).getByText('Approved'),
    ).toBeInTheDocument();
  });

  it('disables Approve and Reject for a role without kyc:decide', async () => {
    const user = userEvent.setup();
    await openVerification(18, ALGIERS, '', ['clients:read', 'kyc:read']);
    await user.click(await screen.findByRole('button', { name: /^Request #\d+$/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Verification of Algiers Service Plus' });
    const approve = within(drawer).getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('title', 'You need the kyc:decide permission');
  });
});

describe('the tab itself', () => {
  it('needs kyc:read and is left out without it', async () => {
    await openMerchant(18, ALGIERS, '?tab=verification', { permissions: ['clients:read'] });
    expect(sectionTabs().queryByRole('tab', { name: 'Verification' })).not.toBeInTheDocument();
    expect(sectionTabs().getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  });
});
