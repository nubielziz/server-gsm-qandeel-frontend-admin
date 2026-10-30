// Tests for opening an audit entry: the before / after table, the line under it, the entries that come without their snapshots (read
// one by one), and values that must stay text.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { answerWith, entryWith, entry, openAudit } from '../test/auditPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const toggle = (code: string) => screen.findByRole('button', { name: new RegExp(`details for ${code}$`) });

describe('opening an entry', () => {
  it('shows the fields with their old and new value, and the number, time and address', async () => {
    const user = userEvent.setup();
    await openAudit();
    const row = await entryWith('completed order ORD-48792');
    const button = row.getByRole('button', { name: 'Show details for AUD-0042' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(row.queryByRole('table')).not.toBeInTheDocument();

    await user.click(button);
    expect(row.getByRole('button', { name: 'Hide details for AUD-0042' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const table = within(row.getByRole('table', { name: 'Changes made by AUD-0042' }));
    expect(table.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Field',
      'Before',
      'After',
    ]);
    expect(table.getAllByRole('row')[1]).toHaveTextContent('statusprocessingcompleted');
    expect(row.getByText(/from 198\.51\.100\.77/)).toHaveTextContent(
      /^AUD-0042 · .+ · from 198\.51\.100\.77 · Support$/,
    );
  });

  it('closes again, and keeps other entries open', async () => {
    const user = userEvent.setup();
    await openAudit();
    const first = await entryWith('ORD-48792');
    const second = await entryWith('Gulf Server Hub');
    await user.click(first.getByRole('button', { name: /^Show details/ }));
    await user.click(second.getByRole('button', { name: /^Show details/ }));
    expect(first.getByRole('table')).toBeInTheDocument();
    expect(second.getByRole('table')).toBeInTheDocument();
    await user.click(first.getByRole('button', { name: /^Hide details/ }));
    expect(first.queryByRole('table')).not.toBeInTheDocument();
    expect(second.getByRole('table')).toBeInTheDocument();
  });

  it('lists every changed field', async () => {
    const user = userEvent.setup();
    await openAudit();
    const row = await entryWith('flagged supplier degraded');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    const rows = row.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('statusupdegraded');
    expect(rows[2]).toHaveTextContent('success_1h97%48%');
  });

  it('shows a dash for a value that was not there before', async () => {
    const user = userEvent.setup();
    await openAudit('/audit?type=order');
    const row = await entryWith('ORD-48608');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    const reason = row.getAllByRole('row').find((line) => line.textContent?.startsWith('reason'));
    expect(reason).toBeDefined();
    expect(within(reason as HTMLElement).getByText('—')).toBeInTheDocument();
  });

  it('says "automatic" for a change nobody made from a browser', async () => {
    const user = userEvent.setup();
    await openAudit();
    const row = await entryWith('synced supplier costs');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getByText(/automatic/)).toHaveTextContent(/^AUD-0041 · .+ · automatic$/);
  });

  it('says so when an entry changed no field', async () => {
    const user = userEvent.setup();
    await openAudit();
    const row = await entryWith('logged in');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getByText('No field changes recorded for this action.')).toBeInTheDocument();
  });

  it('leaves out a field that did not change', async () => {
    const user = userEvent.setup();
    answerWith([entry({ id: 7, before: { a: 1, b: 2 }, after: { a: 1, b: 3 } })]);
    await openAudit();
    const row = await entryWith('Rami K.');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getAllByRole('row')).toHaveLength(2);
    expect(row.getByText('b')).toBeInTheDocument();
  });
});

describe('an entry whose list row has no before and after', () => {
  it('reads the single entry when it is opened', async () => {
    const user = userEvent.setup();
    answerWith([entry({ id: 51, before: undefined, after: undefined, entityLabel: 'Trimmed row' })]);
    mockServer.use(
      http.get('*/admin/audit-logs/51', () =>
        HttpResponse.json(entry({ id: 51, before: { rate: '1.0' }, after: { rate: '1.5' } })),
      ),
    );
    await openAudit();
    const row = await entryWith('Trimmed row');
    expect(row.queryByText(/rate/)).not.toBeInTheDocument();
    await user.click(row.getByRole('button', { name: 'Show details for AUD-0051' }));
    expect(await row.findByText('rate')).toBeInTheDocument();
    expect(row.getAllByRole('row')[1]).toHaveTextContent('rate1.01.5');
  });

  it('shows the server’s message with Retry when the single read fails', async () => {
    const user = userEvent.setup();
    answerWith([entry({ id: 52, before: undefined, after: undefined })]);
    let fail = true;
    mockServer.use(
      http.get('*/admin/audit-logs/52', () =>
        fail
          ? HttpResponse.json(
              {
                type: 'x',
                title: 'Server error',
                status: 500,
                code: 'INTERNAL',
                detail: 'Cannot read the entry.',
              },
              { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
            )
          : HttpResponse.json(entry({ id: 52, before: { x: 'old' }, after: { x: 'new' } })),
      ),
    );
    await openAudit();
    const row = await entryWith('Rami K.');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(await row.findByText('Cannot read the entry.', {}, { timeout: 5000 })).toBeInTheDocument();
    fail = false;
    await user.click(row.getByRole('button', { name: 'Retry' }));
    expect(await row.findByText('old')).toBeInTheDocument();
    expect(row.getByText('new')).toBeInTheDocument();
  });

  it('does not read the single entry when the list row already has them', async () => {
    const user = userEvent.setup();
    let reads = 0;
    mockServer.use(
      http.get('*/admin/audit-logs/:id', () => {
        reads += 1;
        return undefined;
      }),
    );
    await openAudit();
    const row = await entryWith('ORD-48792');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getByRole('table')).toBeInTheDocument();
    expect(reads).toBe(0);
  });
});

describe('values are text', () => {
  it('shows markup as it was written and never builds it', async () => {
    const user = userEvent.setup();
    const markup = '<img src="x" onerror="alert(1)">';
    answerWith([entry({ id: 8, entityLabel: '<b>bold</b>', before: { note: '' }, after: { note: markup } })]);
    await openAudit();
    const row = await entryWith('Rami K.');
    expect(row.getByText('<b>bold</b>')).toBeInTheDocument();
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    expect(row.getAllByText(markup).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });

  it('shows a list or an object as formatted JSON in a block that scrolls', async () => {
    const user = userEvent.setup();
    const rules = { allow: ['203.0.113.1', '203.0.113.2'], deny: [] };
    answerWith([entry({ id: 9, before: { rules: null }, after: { rules } })]);
    await openAudit();
    const row = await entryWith('Rami K.');
    // The summary line is plain text, the table has the block.
    expect(row.getByText(/rules:/)).toBeInTheDocument();
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    const block = row.getByText((_, element) => element?.tagName === 'PRE');
    expect(block).toHaveClass('overflow-auto', 'max-h-40');
    expect(JSON.parse(block.textContent ?? '')).toEqual(rules);
    expect(block.textContent).toContain('\n  "allow"');
  });

  it('keeps the page working for a snapshot that is not an object', async () => {
    const user = userEvent.setup();
    answerWith([entry({ id: 10, before: 'old text', after: 'new text' })]);
    await openAudit();
    const row = await entryWith('Rami K.');
    await user.click(row.getByRole('button', { name: /^Show details/ }));
    await waitFor(() => expect(row.getAllByRole('row')[1]).toHaveTextContent('valueold textnew text'));
    expect(await toggle('AUD-0010')).toHaveAttribute('aria-expanded', 'true');
  });
});
