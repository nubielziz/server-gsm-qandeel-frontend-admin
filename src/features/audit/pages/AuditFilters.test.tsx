// Tests for the filters of the Audit log page: search, person, record type and days, each kept in the address, and Clear filters.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { countText, entries, openAudit } from '../test/auditPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the filters', () => {
  it('searches after a pause and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    await entries();
    await user.type(screen.getByRole('searchbox', { name: 'Search person, action, record' }), 'cairo');
    await waitFor(() => expect(app.location()).toBe('/audit?q=cairo'));
    await waitFor(() => expect(countText()).toBe('2 entries'));
    const rows = await entries();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Cairo GSM Lab');
  });

  it('filters by person, with their role, and by the system', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    await entries();
    const who = screen.getByRole('combobox', { name: 'Filter by person' });
    await waitFor(() => expect(within(who).getAllByRole('option').length).toBeGreaterThan(2));
    expect(
      within(who)
        .getAllByRole('option')
        .slice(0, 3)
        .map((option) => option.textContent),
    ).toEqual(['Everyone', 'System', 'Rami K. (Owner)']);
    await user.selectOptions(who, 'Lina S. (Support)');
    await waitFor(() => expect(app.location()).toBe('/audit?actor=2'));
    await waitFor(() => expect(countText()).toBe('18 entries'));
    await user.selectOptions(who, 'System');
    await waitFor(() => expect(app.location()).toBe('/audit?actor=system'));
    await waitFor(() => expect(countText()).toBe('4 entries'));
    for (const row of await entries()) expect(row).toHaveTextContent(/^.*System/);
  });

  it('filters by record type', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    await entries();
    const type = screen.getByRole('combobox', { name: 'Filter by record type' });
    expect(within(type).getAllByRole('option')[0]).toHaveTextContent('All records');
    await user.selectOptions(type, 'Account');
    await waitFor(() => expect(app.location()).toBe('/audit?type=account'));
    // The one filter lists the rows that say merchant, customer or account.
    await waitFor(() => expect(countText()).toBe('7 entries'));
  });

  it('offers one record type for accounts and none for the old words', async () => {
    await openAudit();
    await entries();
    const type = screen.getByRole('combobox', { name: 'Filter by record type' });
    const names = within(type)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toContain('Account');
    expect(names).not.toContain('Merchant');
    expect(names).not.toContain('Customer');
  });

  it('filters to one record when the address names its type and id, with a chip that removes it', async () => {
    const user = userEvent.setup();
    const app = await openAudit('/audit?type=account&record=5');
    await waitFor(() => expect(countText()).toBe('2 entries'));
    for (const row of await entries()) expect(row).toHaveTextContent('Cairo GSM Lab');
    expect(screen.getByText('Record #5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove the filter on record #5' }));
    await waitFor(() => expect(app.location()).toBe('/audit?type=account'));
    await waitFor(() => expect(countText()).toBe('7 entries'));
    expect(screen.queryByText('Record #5')).not.toBeInTheDocument();
  });

  it('finds the old customer rows of an account by its new number', async () => {
    await openAudit('/audit?type=account&record=119');
    await waitFor(() => expect(countText()).toBe('1 entry'));
    expect(await entries()).toHaveLength(1);
    expect((await entries())[0]).toHaveTextContent('Jack Turner');
  });

  it('reads an old address that says merchant as the account filter', async () => {
    await openAudit('/audit?type=merchant&record=5');
    await waitFor(() => expect(countText()).toBe('2 entries'));
    expect(screen.getByRole('combobox', { name: 'Filter by record type' })).toHaveValue('account');
  });

  it('reads an old address that says customer as the account filter without the old number', async () => {
    await openAudit('/audit?type=customer&record=19');
    await waitFor(() => expect(countText()).toBe('7 entries'));
    expect(screen.getByRole('combobox', { name: 'Filter by record type' })).toHaveValue('account');
    expect(screen.queryByText('Record #19')).not.toBeInTheDocument();
  });

  it('drops the record when the record type changes, and Clear filters removes it too', async () => {
    const user = userEvent.setup();
    const app = await openAudit('/audit?type=account&record=5');
    await waitFor(() => expect(countText()).toBe('2 entries'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by record type' }), 'Order');
    await waitFor(() => expect(app.location()).toBe('/audit?type=order'));
    expect(screen.queryByText(/^Record #/)).not.toBeInTheDocument();
    app.unmount();
    const again = await openAudit('/audit?type=account&record=5');
    await waitFor(() => expect(countText()).toBe('2 entries'));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(again.location()).toBe('/audit'));
  });

  it('ignores a record id that has no type beside it', async () => {
    const app = await openAudit('/audit?record=5');
    await waitFor(() => expect(countText()).toBe('42 entries'));
    expect(screen.queryByText('Record #5')).not.toBeInTheDocument();
    expect(app.location()).toBe('/audit?record=5');
  });

  it('filters by days and says when nothing is in the range', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    await entries();
    await user.type(screen.getByLabelText('From date'), '2999-01-01');
    await waitFor(() => expect(app.location()).toBe('/audit?from=2999-01-01'));
    expect(await screen.findByText('No entries match')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toHaveAttribute('min', '2999-01-01');
  });

  it('opens from a link with the filters already set and the controls showing them', async () => {
    const app = await openAudit('/audit?actor=system&type=supplier');
    await waitFor(() => expect(countText()).toBe('2 entries'));
    expect(screen.getByRole('combobox', { name: 'Filter by person' })).toHaveValue('system');
    expect(screen.getByRole('combobox', { name: 'Filter by record type' })).toHaveValue('supplier');
    expect(app.location()).toBe('/audit?actor=system&type=supplier');
  });

  it('shows a person from the address that the list does not hold', async () => {
    await openAudit('/audit?actor=77');
    expect(await screen.findByRole('option', { name: 'Staff #77' })).toBeInTheDocument();
  });

  it('clears every filter at once and shows the button only when one is on', async () => {
    const user = userEvent.setup();
    const app = await openAudit();
    await entries();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by record type' }), 'Order');
    await waitFor(() => expect(countText()).toBe('14 entries'));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/audit');
    await waitFor(() => expect(countText()).toBe('42 entries'));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('offers Clear filters in the empty state', async () => {
    const user = userEvent.setup();
    const app = await openAudit('/audit?q=zzzz-nothing');
    expect(await screen.findByText('No entries match')).toBeInTheDocument();
    expect(screen.getByText('Try another search or remove a filter.')).toBeInTheDocument();
    const empty = within(screen.getByText('No entries match').closest('.empty') as HTMLElement);
    await user.click(empty.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/audit');
    expect(await entries()).toHaveLength(25);
  });
});
