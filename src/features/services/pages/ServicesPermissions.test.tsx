// Tests for what the staff member's permissions open and disable on the Services & pricing page: which tabs show, which one opens
// first, which buttons and switches are disabled (with the missing permission in their title), and the page gate. Every check is a hint
// for the user; the server still refuses what the role may not do.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { openServices, serviceRow, tabTexts } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('a reader of the catalog', () => {
  const READER = ['catalog:read'];

  it('sees the Services and Categories tabs only', async () => {
    await openServices('/services', { permissions: READER });
    expect(
      await screen.findByText('1 service is priced below cost plus minimum profit.'),
    ).toBeInTheDocument();
    expect(tabTexts()).toEqual(['Services27', 'Categories']);
  });

  it('cannot change anything: the buttons and switches say which permission they need', async () => {
    await openServices('/services', { permissions: READER });
    const create = screen.getByRole('button', { name: 'New service' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the catalog:create permission');
    expect(screen.getByRole('button', { name: 'Bulk price change…' })).toHaveAttribute(
      'title',
      'You need the pricing:update permission',
    );
    const row = await serviceRow('EE UK Unlock');
    const enabled = row.getByRole('switch', { name: 'Enable EE UK Unlock' });
    expect(enabled).toBeDisabled();
    expect(enabled).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(row.getByRole('switch', { name: 'Automation for EE UK Unlock' })).toBeDisabled();
    // The price is plain text, not an edit button.
    expect(row.queryByRole('button', { name: /^Edit price of/ })).not.toBeInTheDocument();
  });

  it('has a row menu whose actions are disabled, except the links the role may follow', async () => {
    const user = userEvent.setup();
    await openServices('/services', { permissions: READER });
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    const menu = within(await screen.findByRole('menu'));
    for (const name of ['Edit price…', 'Edit service…', 'Group prices…', 'Fields…', 'Options…', 'Delete…']) {
      expect(menu.getByRole('menuitem', { name })).toBeDisabled();
    }
    expect(menu.getByRole('menuitem', { name: 'Trace a merchant price' })).toBeDisabled();
    expect(menu.getByRole('menuitem', { name: 'See orders' })).toBeDisabled();
  });

  it('falls back to the first tab it may open when the address names one it may not', async () => {
    await openServices('/services?tab=inventory', { permissions: READER });
    expect(await screen.findByRole('tab', { name: /^Services/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });
});

describe('an editor of the catalog', () => {
  it('can edit prices and use the switches', async () => {
    await openServices('/services', { permissions: ['catalog:read', 'catalog:update'] });
    const row = await serviceRow('EE UK Unlock');
    expect(row.getByRole('switch', { name: 'Enable EE UK Unlock' })).toBeEnabled();
    expect(row.getByRole('button', { name: /^Edit price of EE UK Unlock/ })).toBeEnabled();
  });
});

describe('a role with a different part of the page', () => {
  it('opens on the code inventory for inventory:read alone, with no header sentence', async () => {
    await openServices('/services', { permissions: ['inventory:read'] });
    expect(await screen.findByRole('tab', { name: 'Code inventory' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['Code inventory']);
    expect(screen.queryByText(/priced below cost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Every active service is priced above its floor\./)).not.toBeInTheDocument();
  });

  it('opens on the rules for pricing:read alone, since the resolver also needs the catalog', async () => {
    await openServices('/services?tab=resolver', { permissions: ['pricing:read'] });
    expect(await screen.findByRole('tab', { name: 'Rules and groups' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['Rules and groups']);
  });

  it('opens the resolver for pricing:read with catalog:read', async () => {
    await openServices('/services', { permissions: ['catalog:read', 'pricing:read'] });
    await waitFor(() =>
      expect(tabTexts()).toEqual(['Services27', 'Price resolver', 'Rules and groups', 'Categories']),
    );
  });
});

describe('the page gate', () => {
  it('shows the no-access page to a role with none of the three read permissions', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    renderApp('/services');
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('catalog:read or pricing:read or inventory:read')).toBeInTheDocument();
  });
});
