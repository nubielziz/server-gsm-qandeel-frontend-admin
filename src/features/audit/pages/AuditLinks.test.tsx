// Tests for "Open record": each kind of record leads where ARCHITECTURE §5.2 says, an order opens its drawer on the page, a record
// with no page stays text, and a link is offered only to a staff member who may open its page.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { answerWith, entriesNow, entry, entryWith, openAudit } from '../test/auditPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const AUDIT_ONLY = ['audit:read'];

describe('the links', () => {
  it('opens an order in its drawer on this page', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    const row = await entryWith('ORD-48792');
    await user.click(row.getByRole('button', { name: 'ORD-48792 for Zain Mobile Hub' }));
    expect(app.location()).toBe('/audit?order=48792');
    expect(await screen.findByRole('dialog', { name: 'ORD-48792' })).toBeInTheDocument();
    // The list is still behind the drawer.
    expect(screen.getByRole('heading', { level: 1, name: 'Audit log' })).toBeInTheDocument();
  });

  it('opens a deep link to an order with the drawer already open', async () => {
    await openAudit('/audit?order=48792');
    expect(await screen.findByRole('dialog', { name: 'ORD-48792' })).toBeInTheDocument();
  });

  it('links a merchant, a supplier and a customer to their pages', async () => {
    await openAudit();
    const merchant = await entryWith('Cairo GSM Lab, AT&T USA Premier');
    expect(merchant.getByRole('link', { name: 'Cairo GSM Lab, AT&T USA Premier' })).toHaveAttribute(
      'href',
      '/merchants/5',
    );
    const supplier = await entryWith('Gulf Server Hub');
    expect(supplier.getByRole('link', { name: 'Gulf Server Hub' })).toHaveAttribute(
      'href',
      '/suppliers?supplier=2',
    );
  });

  it('links a customer, a service, the blocklist and a refund', async () => {
    const link = async (query: string, name: string) => {
      const view = await openAudit(`/audit?type=${query}`);
      const found = await screen.findByRole('link', { name });
      const href = found.getAttribute('href');
      view.unmount();
      return href;
    };
    expect(await link('customer', 'Jack Turner')).toBe('/customers/19');
    expect(await link('service', 'T-Mobile USA Unlock')).toBe('/services?q=T-Mobile+USA+Unlock');
    expect(await link('blocklist', 'IMEI 35 389011 884201 9')).toBe('/risk?tab=block');
    expect(await link('refund', 'Goodwill refund on a delayed unlock')).toBe('/refunds');
  });

  it('sends an admin account to the Admin accounts tab', async () => {
    answerWith([
      entry({ id: 3, entityType: 'staff', entityId: 2, entityLabel: 'Lina S.', action: 'suspended' }),
    ]);
    await openAudit();
    const row = await entryWith('suspended');
    expect(row.getByRole('link', { name: 'Lina S.' })).toHaveAttribute('href', '/access?tab=admins');
  });

  it('goes to the page when a link is followed', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    const row = await entryWith('Gulf Server Hub');
    await user.click(row.getByRole('link', { name: 'Gulf Server Hub' }));
    // The suppliers page is a lazy chunk; the address changes when it has loaded.
    await waitFor(() => expect(app.location()).toBe('/suppliers?supplier=2'), { timeout: 10_000 });
  });

  it('leaves a record without a page as text', async () => {
    await openAudit('/audit?type=payment');
    const row = await entryWith('Basra Unlock Center, $90.00');
    expect(row.queryByRole('link')).not.toBeInTheDocument();
    expect(row.getAllByRole('button')).toHaveLength(1);
    expect(row.getByText('Basra Unlock Center, $90.00')).toHaveClass('font-medium');
  });

  it('names no record for a sign-in', async () => {
    await openAudit();
    const row = await entryWith('logged in');
    expect(row.getByText('logged in', { exact: false }).closest('p')).toHaveTextContent(
      /Lina S\. logged in\s*$/,
    );
    expect(row.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps an entry without an id as text', async () => {
    answerWith([entry({ id: 4, entityType: 'merchant', entityId: 0, entityLabel: 'Gone Ltd' })]);
    await openAudit();
    const row = await entryWith('Gone Ltd');
    expect(row.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('offers no link and no drawer to a staff member who can only read the log', async () => {
    await openAudit('/audit?order=48792', { permissions: AUDIT_ONLY });
    const rows = await waitFor(() => {
      const found = entriesNow();
      if (found.length === 0) throw new Error('not yet');
      return found;
    });
    expect(rows).toHaveLength(25);
    for (const row of rows) {
      expect(within(row).queryByRole('link')).not.toBeInTheDocument();
      expect(within(row).getAllByRole('button')).toHaveLength(1);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-48792 for Zain Mobile Hub')).toHaveClass('font-medium');
  });

  it('offers only the pages the staff member may open', async () => {
    await openAudit('/audit', { permissions: [...AUDIT_ONLY, 'orders:read'] });
    const order = await entryWith('ORD-48792');
    expect(order.getByRole('button', { name: 'ORD-48792 for Zain Mobile Hub' })).toBeInTheDocument();
    const merchant = await entryWith('Cairo GSM Lab, AT&T USA Premier');
    expect(merchant.queryByRole('link')).not.toBeInTheDocument();
    expect(merchant.getByText('Cairo GSM Lab, AT&T USA Premier')).toHaveClass('font-medium');
  });

  it('offers a merchant link with the merchants permission', async () => {
    await openAudit('/audit', { permissions: [...AUDIT_ONLY, 'clients:read'] });
    const merchant = await entryWith('Cairo GSM Lab, AT&T USA Premier');
    await waitFor(() => expect(merchant.getByRole('link')).toHaveAttribute('href', '/merchants/5'));
  });

  it('lets a staff member without the staff permission filter by Everyone and System only', async () => {
    await openAudit('/audit', { permissions: AUDIT_ONLY });
    const who = screen.getByRole('combobox', { name: 'Filter by person' });
    await entryWith('ORD-48792');
    expect(
      within(who)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Everyone', 'System']);
    // The role is not known either, so the line under an entry names none.
    const user = userEvent.setup();
    const row = await entryWith('ORD-48792');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getByText(/from 198\.51\.100\.77/)).toHaveTextContent(/from 198\.51\.100\.77$/);
  });
});
