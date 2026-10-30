// Tests for the page as a whole: the heading, the tab strip kept in the address, the "Open the storefront" link with and without
// VITE_STOREFRONT_URL (it replaces the demo's Live preview tab), what each permission opens and disables, and the page gate.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { dialogOf, openStorefront, rowOf, tabTexts } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.unstubAllEnvs());

describe('the tab strip', () => {
  it('shows the demo’s four tabs and the TAC catalogue, and no Live preview tab', async () => {
    await openStorefront();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Services on sale11',
        'Landing pages',
        'Content and legal',
        'Help centre',
        'TAC catalogue',
      ]),
    );
    expect(screen.queryByRole('tab', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('keeps the open tab in the address and starts the new tab clean', async () => {
    const user = userEvent.setup();
    const app = await openStorefront('/storefront?q=vodafone');
    await user.click(await screen.findByRole('tab', { name: 'Help centre' }));
    expect(app.location()).toBe('/storefront?tab=help');
    await user.click(screen.getByRole('tab', { name: /^Services on sale/ }));
    expect(app.location()).toBe('/storefront');
  });

  it('opens the tab the address names and falls back to the first for an unknown one', async () => {
    await openStorefront('/storefront?tab=landing');
    expect(await screen.findByRole('tab', { name: 'Landing pages' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('Open the storefront', () => {
  it('is a link to VITE_STOREFRONT_URL that opens in a new tab', async () => {
    vi.stubEnv('VITE_STOREFRONT_URL', 'https://shop.gsm-supply.example/');
    await openStorefront();
    const link = screen.getByRole('link', { name: 'Open the storefront' });
    expect(link).toHaveAttribute('href', 'https://shop.gsm-supply.example');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('is left out when the variable is not set, and the demo’s Preview checkout button is gone either way', async () => {
    vi.stubEnv('VITE_STOREFRONT_URL', '');
    await openStorefront();
    expect(screen.queryByRole('link', { name: 'Open the storefront' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview checkout' })).not.toBeInTheDocument();
  });
});

describe('a reader of the storefront', () => {
  const READER = ['storefront:read'];

  it('sees four tabs and no TAC catalogue', async () => {
    await openStorefront('/storefront', { permissions: READER });
    await waitFor(() =>
      expect(tabTexts()).toEqual(['Services on sale11', 'Landing pages', 'Content and legal', 'Help centre']),
    );
  });

  it('cannot change a listing: the switch, the price and Add listing say which permission they need', async () => {
    await openStorefront('/storefront', { permissions: READER });
    const row = await rowOf('Storefront listings', 'EE UK Unlock');
    const toggle = row.getByRole('switch', { name: 'Show EE UK Unlock on the storefront' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', 'You need the storefront:update permission');
    expect(row.getByRole('button', { name: 'Edit the storefront price of EE UK Unlock' })).toBeDisabled();
    const add = screen.getByRole('button', { name: 'Add listing…' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the storefront:create and catalog:read permission');
  });

  it('can change a listing with storefront:update', async () => {
    await openStorefront('/storefront', { permissions: [...READER, 'storefront:update'] });
    const row = await rowOf('Storefront listings', 'EE UK Unlock');
    expect(row.getByRole('switch', { name: 'Show EE UK Unlock on the storefront' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'Edit the storefront price of EE UK Unlock' })).toBeEnabled();
  });

  it('has landing page menu items disabled, with the permission in the item', async () => {
    const user = userEvent.setup();
    await openStorefront('/storefront?tab=landing', { permissions: READER });
    await user.click(await screen.findByRole('button', { name: 'Actions for Samsung KG lock fix' }));
    const edit = await screen.findByRole('menuitem', { name: /^Edit/ });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute('title', 'You need the storefront:update permission');
    const publish = screen.getByRole('menuitem', { name: /^Publish/ });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAttribute('title', 'You need the storefront:publish permission');
    expect(screen.getByRole('button', { name: 'New page…' })).toHaveAttribute(
      'title',
      'You need the storefront:create permission',
    );
    expect(screen.getByRole('button', { name: 'Generate drafts…' })).toBeDisabled();
  });

  it('can publish a page with storefront:publish alone, and the page toggles and article buttons follow their permissions', async () => {
    await openStorefront('/storefront?tab=content', { permissions: [...READER, 'storefront:publish'] });
    const row = await rowOf('Pages and blog posts', 'About us');
    expect(row.getByRole('button', { name: 'Unpublish About us' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'Edit About us' })).toBeDisabled();
  });

  it('sees the legal part as unavailable without legal:read', async () => {
    await openStorefront('/storefront?tab=content', { permissions: READER });
    expect(
      await screen.findByText('You need the legal:read permission to see the legal documents.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Legal documents' })).not.toBeInTheDocument();
  });

  it('has the help centre buttons disabled', async () => {
    await openStorefront('/storefront?tab=help', { permissions: READER });
    const row = await rowOf('Help articles', 'Where is my order?');
    expect(row.getByRole('button', { name: 'Edit Where is my order?' })).toBeDisabled();
    expect(row.getByRole('button', { name: 'Unpublish Where is my order?' })).toHaveAttribute(
      'title',
      'You need the storefront:update permission',
    );
    expect(screen.getByRole('button', { name: 'New article…' })).toBeDisabled();
  });
});

describe('a role with a different part of the page', () => {
  it('opens on the legal documents for legal:read alone, with their buttons asking for legal:create and legal:publish', async () => {
    await openStorefront('/storefront', { permissions: ['legal:read'] });
    expect(await screen.findByRole('tab', { name: 'Content and legal' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['Content and legal']);
    expect(
      await screen.findByText('You need the storefront:read permission to see pages and blog posts.'),
    ).toBeInTheDocument();
    const publish = await screen.findByRole('button', { name: 'Publish Refund policy v1.5 (English)' });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAttribute('title', 'You need the legal:publish permission');
    expect(screen.getByRole('button', { name: 'New version…' })).toHaveAttribute(
      'title',
      'You need the legal:create permission',
    );
  });

  it('can publish a legal version with legal:publish', async () => {
    const user = userEvent.setup();
    await openStorefront('/storefront', { permissions: ['legal:read', 'legal:publish'] });
    await user.click(await screen.findByRole('button', { name: 'Publish Refund policy v1.5 (English)' }));
    expect(dialogOf('Publish a new version?')).toBeTruthy();
  });

  it('opens on the TAC catalogue for catalog:read alone, with Add and Edit asking for catalog:create and catalog:update', async () => {
    await openStorefront('/storefront', { permissions: ['catalog:read'] });
    expect(await screen.findByRole('tab', { name: 'TAC catalogue' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['TAC catalogue']);
    const row = await rowOf('TAC catalogue', '35389011');
    expect(row.getByRole('button', { name: 'Edit TAC 35389011' })).toHaveAttribute(
      'title',
      'You need the catalog:update permission',
    );
    expect(screen.getByRole('button', { name: 'Add TAC…' })).toHaveAttribute(
      'title',
      'You need the catalog:create permission',
    );
  });

  it('can add and edit TACs with catalog:create and catalog:update', async () => {
    await openStorefront('/storefront', {
      permissions: ['catalog:read', 'catalog:create', 'catalog:update'],
    });
    const row = await rowOf('TAC catalogue', '35389011');
    expect(row.getByRole('button', { name: 'Edit TAC 35389011' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add TAC…' })).toBeEnabled();
  });
});

describe('the page gate', () => {
  it('shows the no-access page to a role with none of the three read permissions', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    renderApp('/storefront');
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('storefront:read or legal:read or catalog:read')).toBeInTheDocument();
  });
});
