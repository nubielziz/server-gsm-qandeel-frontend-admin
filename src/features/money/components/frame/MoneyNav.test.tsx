// Tests for MoneyNav: the strip and the row of views drawn from what the count hooks of the two view modules say, inside a router.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { usableViews, type MoneyViewId } from '../../lib/moneyViews';
import { fakeModules, type FakeOptions } from '../../test/fakeModules';
import { MoneyNav } from './MoneyNav';

async function draw(view: MoneyViewId, options: FakeOptions, permissions = ['*']) {
  const modules = await fakeModules(options);
  render(
    <MemoryRouter>
      <MoneyNav usable={usableViews(permissions)} view={view} modules={modules} />
    </MemoryRouter>,
  );
}
const texts = (name: string) =>
  within(screen.getByRole('navigation', { name }))
    .getAllByRole('link')
    .map((link) => link.textContent);
const current = (name: string) =>
  within(screen.getByRole('navigation', { name }))
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page')?.textContent;

describe('MoneyNav', () => {
  it('draws the strip with the counts the hooks give, and raises the tab of the view', async () => {
    await draw('deposits', { deposits: 3, refunds: 1, disputes: 1 });
    expect(texts('Money sections')).toEqual([
      'Overview',
      'Money in (3)',
      'Money back (2)',
      'Books',
      'Reports',
    ]);
    expect(current('Money sections')).toBe('Money in (3)');
  });

  it('draws the views of the tab with their own counts, the current one marked', async () => {
    await draw('deposits', { deposits: 3, refunds: 1, disputes: 1 });
    expect(texts('Views')).toEqual(['Deposits (3)', 'Shop payments']);
    expect(current('Views')).toBe('Deposits (3)');
    expect(screen.getByRole('link', { name: 'Deposits (3)' })).toHaveAttribute(
      'href',
      '/money?view=deposits',
    );
  });

  it('counts Refunds and Card disputes on their own links', async () => {
    await draw('disputes', { refunds: 4, disputes: 2 });
    expect(texts('Views')).toEqual(['Refunds (4)', 'Card disputes (2)']);
    expect(current('Views')).toBe('Card disputes (2)');
    expect(texts('Money sections')[2]).toBe('Money back (6)');
  });

  it('shows no number while the counts are unknown or zero', async () => {
    await draw('refunds', { deposits: 0, refunds: undefined, disputes: 0 });
    expect(texts('Money sections')).toEqual(['Overview', 'Money in', 'Money back', 'Books', 'Reports']);
    expect(texts('Views')).toEqual(['Refunds', 'Card disputes']);
  });

  it('draws no row of views on the Overview', async () => {
    await draw('overview', { deposits: 3 });
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
    expect(current('Money sections')).toBe('Overview');
  });

  it('draws the plus before Issue invoice, and names the link without it', async () => {
    await draw('issue-invoice', {});
    expect(texts('Views')).toEqual([
      'Ledger',
      'Trial balance',
      'Store balances',
      'Invoices',
      '+Issue invoice',
    ]);
    expect(current('Views')).toBe('+Issue invoice');
    expect(screen.getByRole('link', { name: 'Issue invoice' })).toHaveAttribute(
      'href',
      '/money?view=issue-invoice',
    );
  });

  it('draws only what a role may use', async () => {
    await draw('refunds', { refunds: 2 }, ['refunds:read']);
    expect(texts('Money sections')).toEqual(['Overview', 'Money back (2)']);
    expect(texts('Views')).toEqual(['Refunds (2)']);
  });
});
