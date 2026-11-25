// Tests for the Issue invoice view on its own (inside the app shell, without the Money page): the button is locked, with the missing
// permission as its reason, for a role without invoices:create or clients:read. The page hides the view from such a role; the server checks too.
import { screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { IssueInvoiceView } from './IssueInvoiceView';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

async function openView(permissions: string[]) {
  await signInAs();
  mockMe({ id: 1, name: 'Rami K.', permissions });
  renderShell('/issue', <Route path="/issue" element={<IssueInvoiceView />} />);
  return screen.findByRole('button', { name: 'Issue invoice' }, { timeout: 10_000 });
}

describe('the Issue invoice button', () => {
  it('is disabled, with the missing permission in its title, without invoices:create', async () => {
    const button = await openView(['invoices:read', 'clients:read']);
    // The staff member's permissions load after the view is drawn, so the button settles on its reason.
    await waitFor(() => expect(button).toHaveAttribute('title', 'You need the invoices:create permission'));
    expect(button).toBeDisabled();
    expect(screen.getByText('You need the invoices:create permission')).toBeInTheDocument();
  });

  it('asks for clients:read too, since the merchant names come from it', async () => {
    const button = await openView(['invoices:read', 'invoices:create']);
    await waitFor(() => expect(button).toHaveAttribute('title', 'You need the clients:read permission'));
    expect(button).toBeDisabled();
  });

  it('is enabled for a role that has both', async () => {
    const button = await openView(['invoices:read', 'invoices:create', 'clients:read']);
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).not.toHaveAttribute('title');
  });
});
