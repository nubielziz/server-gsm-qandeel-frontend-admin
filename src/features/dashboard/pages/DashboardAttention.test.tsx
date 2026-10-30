// Tests for the "Needs attention" panel, run through the whole app: the six-item cap and "Show n more", All clear, an item of
// a kind the console does not know, and the buttons a staff member may not use.
import { act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { answerDashboard } from '../test/answers';
import { openDashboard, panelOf } from '../test/dashboardPage';
import { ATTENTION_SAMPLES, dashboardFixture } from '../test/fixtures';
import type { AttentionItem } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Gives the access checks (one small query per button) time to answer before a test asserts that a button is absent.
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));

describe('needs attention', () => {
  it('shows the first six items, most urgent first, with their severity, words and buttons', async () => {
    answerDashboard(dashboardFixture({ attention: ATTENTION_SAMPLES }));
    await openDashboard();
    const panel = await panelOf('Needs attention');
    const rows = await panel.findAllByRole('listitem');
    expect(rows).toHaveLength(6);
    expect(panel.getByText('15 open, most urgent first')).toBeInTheDocument();

    const first = within(rows[0]);
    expect(first.getByText('Critical')).toBeInTheDocument();
    expect(first.getByText('3 orders are past SLA')).toHaveClass('font-semibold');
    expect(first.getByText('Oldest #48784, 12m over its 2m target')).toBeInTheDocument();
    const open = await first.findByRole('link', { name: 'Open orders' });
    expect(open).toHaveAttribute('href', '/orders?pastSla=true');

    const review = within(rows[2]);
    expect(review.getByText('High')).toBeInTheDocument();
    expect(review.getByText('5 orders need manual review')).toHaveClass('font-medium');
    expect(await review.findByRole('link', { name: 'Review queue' })).toHaveAttribute(
      'href',
      '/orders?tab=review',
    );
  });

  it('shows the rest on "Show n more", and fewer again, keeping focus on the toggle', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture({ attention: ATTENTION_SAMPLES }));
    await openDashboard();
    const panel = await panelOf('Needs attention');
    const toggle = await panel.findByRole('button', { name: 'Show 9 more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'attn-list');
    expect(document.getElementById('attn-list')).toBeInTheDocument();

    await user.click(toggle);
    const fewer = panel.getByRole('button', { name: 'Show fewer' });
    expect(fewer).toBe(toggle);
    expect(fewer).toHaveAttribute('aria-expanded', 'true');
    expect(fewer).toHaveFocus();
    expect(panel.getAllByRole('listitem')).toHaveLength(15);

    await user.click(fewer);
    expect(panel.getAllByRole('listitem')).toHaveLength(6);
    expect(panel.getByRole('button', { name: 'Show 9 more' })).toHaveFocus();
  });

  it('has no toggle when everything fits', async () => {
    answerDashboard(dashboardFixture({ attention: ATTENTION_SAMPLES.slice(0, 6) }));
    await openDashboard();
    const panel = await panelOf('Needs attention');
    expect(await panel.findAllByRole('listitem')).toHaveLength(6);
    expect(panel.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
  });

  it('says "All clear" when nothing needs a person', async () => {
    answerDashboard(dashboardFixture({ attention: [] }));
    await openDashboard();
    const panel = await panelOf('Needs attention');
    expect(await panel.findByRole('heading', { name: 'All clear' })).toBeInTheDocument();
    expect(
      panel.getByText('No late orders, supplier problems or pending approvals right now.'),
    ).toBeInTheDocument();
    expect(panel.queryByText(/most urgent first/)).not.toBeInTheDocument();
    expect(panel.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('shows an item of a kind it does not know with its severity, a neutral title and no button', async () => {
    const future = { id: 'new-1', severity: 'high', kind: 'warehouse_on_fire' } as unknown as AttentionItem;
    answerDashboard(dashboardFixture({ attention: [future] }));
    await openDashboard();
    const panel = await panelOf('Needs attention');
    const row = within(await panel.findByRole('listitem'));
    expect(row.getByText('High')).toBeInTheDocument();
    expect(row.getByText('Needs attention')).toBeInTheDocument();
    await settle();
    expect(row.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves out the button of a page the staff member may not open, and keeps the row', async () => {
    // dashboard:read opens the page; orders:read is the only page behind any of the three items' buttons.
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read', 'orders:read'] });
    const panel = await panelOf('Needs attention');
    const rows = await panel.findAllByRole('listitem');
    expect(rows).toHaveLength(3);
    // The positive control: orders buttons appear...
    expect(await within(rows[0]).findByRole('link', { name: 'Open orders' })).toBeInTheDocument();
    expect(await within(rows[2]).findByRole('link', { name: 'Review queue' })).toBeInTheDocument();
    // ...and the supplier button does not, though its row is there.
    await settle();
    expect(within(rows[1]).getByText('Gulf Server Hub is down')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no buttons at all when the staff member may open no other page', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read'] });
    const panel = await panelOf('Needs attention');
    await panel.findAllByRole('listitem');
    await settle();
    expect(panel.queryByRole('link')).not.toBeInTheDocument();
    expect(panel.getByText('3 orders are past SLA')).toBeInTheDocument();
  });
});
