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
    await user.selectOptions(type, 'Merchant');
    await waitFor(() => expect(app.location()).toBe('/audit?type=merchant'));
    await waitFor(() => expect(countText()).toBe('6 entries'));
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
