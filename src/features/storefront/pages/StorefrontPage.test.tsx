// Tests for the page as a whole: the heading, the tab strip kept in the address (the default tab written there too), the "Open the
// storefront" link with and without VITE_STOREFRONT_URL (it replaces the demo's Live preview tab), what each permission opens and
// disables, and the page gate. The listings, publish and retail pricing parts are not tabs of this page any more; their own tests mount
// them at the Product / Services page's addresses.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { dialogOf, openStorefront, rowOf, tabTexts } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.unstubAllEnvs());

describe('the tab strip', () => {
  it('shows Content and legal, Help centre and Search, with no Landing pages, TAC catalogue or Live preview tab', async () => {
    await openStorefront();
    await waitFor(() => expect(tabTexts()).toEqual(['Content and legal', 'Help centre', 'Search']));
    for (const name of [/preview/i, /^Landing/, /^TAC/]) {
      expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
    }
  });

  it('names what is left in the header, and no retired part', async () => {
    await openStorefront();
    const sub = await screen.findByText(/What the public site says/);
    expect(sub).toHaveTextContent('content and legal documents, help articles and the search index');
    expect(sub.textContent).not.toMatch(/landing|TAC/i);
  });

  it('has no tab for the services on sale, the publishing or the retail pricing: they live on the Product / Services page', async () => {
    await openStorefront();
    await screen.findByRole('tab', { name: 'Content and legal' });
    for (const name of [/^Services on sale/, /^Publish/, /^Retail pricing/]) {
      expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
    }
  });

  it('opens on Content and legal and writes that tab in the address', async () => {
    const app = await openStorefront();
    expect(await screen.findByRole('tab', { name: 'Content and legal' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Content and legal' })).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=content'));
  });

  it('keeps the open tab in the address, the first tab too, and starts the new tab clean', async () => {
    const user = userEvent.setup();
    const app = await openStorefront('/storefront?tab=help&q=refund');
    await user.click(await screen.findByRole('tab', { name: 'Content and legal' }));
    expect(app.location()).toBe('/storefront?tab=content');
    await user.click(screen.getByRole('tab', { name: 'Help centre' }));
    expect(app.location()).toBe('/storefront?tab=help');
  });

  it('names the tab in an address that has a page type but no tab, and drops the page type', async () => {
    // A search, a page or a sort with no tab is the old list of services on the shop: the shell sends it to the list of services.
    const app = await openStorefront('/storefront?kind=carrier');
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=content'));
  });

  it('opens the tab the address names', async () => {
    const app = await openStorefront('/storefront?tab=help');
    expect(await screen.findByRole('tab', { name: 'Help centre' })).toHaveAttribute('aria-selected', 'true');
    expect(app.location()).toBe('/storefront?tab=help');
  });

  // The old tabs that moved to the Product / Services page (listings, publish, pricing) never reach the page: the shell redirects them first.
  it.each(['preview', 'nothing'])(
    'falls back to Content and legal, and says so in the address, for the tab "%s" that is not here',
    async (old) => {
      const app = await openStorefront(`/storefront?tab=${old}`);
      expect(await screen.findByRole('tab', { name: 'Content and legal' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await waitFor(() => expect(app.location()).toBe('/storefront?tab=content'));
    },
  );

  // The two retired tabs (decision 025): an old bookmark or link still opens Shop content, on the first tab the role may read, with what
  // the old address carried (a page type, a search, a page number) dropped. The shell never sends these to Product / Services.
  it.each([
    ['/storefront?tab=landing'],
    ['/storefront?tab=landing&kind=carrier'],
    ['/storefront?tab=landing&q=unlock&page=2&sort=title&dir=asc'],
    ['/storefront?tab=tac'],
    ['/storefront?tab=tac&q=3538&page=2'],
  ])('opens Content and legal for the old address %s, and rewrites it', async (old) => {
    const app = await openStorefront(old);
    expect(await screen.findByRole('tab', { name: 'Content and legal' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('table', { name: 'Pages and blog posts' })).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=content'));
  });

  it('opens the first tab a legal reader may read for the old Landing pages address', async () => {
    const app = await openStorefront('/storefront?tab=landing', { permissions: ['legal:read'] });
    expect(await screen.findByRole('tab', { name: 'Content and legal' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['Content and legal']);
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=content'));
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

  it('sees the three tabs', async () => {
    await openStorefront('/storefront', { permissions: READER });
    await waitFor(() => expect(tabTexts()).toEqual(['Content and legal', 'Help centre', 'Search']));
  });

  it('has the New page button asking for storefront:create, and no generator', async () => {
    await openStorefront('/storefront?tab=content', { permissions: READER });
    expect(await screen.findByRole('button', { name: 'New page…' })).toHaveAttribute(
      'title',
      'You need the storefront:create permission',
    );
    expect(screen.queryByRole('button', { name: 'Generate drafts…' })).not.toBeInTheDocument();
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
    const publish = await screen.findByRole('button', { name: 'Publish Refund policy v1.5' });
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
    await user.click(await screen.findByRole('button', { name: 'Publish Refund policy v1.5' }));
    expect(dialogOf('Publish a new version?')).toBeTruthy();
  });
});

describe('the page gate', () => {
  async function openAs(permissions: string[]) {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions });
    renderApp('/storefront');
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
  }

  it('shows the no-access page to a role with none of the two read permissions', async () => {
    await openAs(['orders:read']);
    expect(screen.getByText('storefront:read or legal:read')).toBeInTheDocument();
  });

  it('does not let in a role that only reads the catalog: the TAC catalogue was the one tab it opened here', async () => {
    await openAs(['catalog:read']);
    expect(screen.queryByRole('tablist', { name: 'Shop content sections' })).not.toBeInTheDocument();
    expect(screen.getByText('storefront:read or legal:read')).toBeInTheDocument();
  });

  it('does not let in a role that only reads the retail pricing: that part moved to the Product / Services page', async () => {
    await openAs(['pricing:read']);
    // The refusal is headed with the page's label, so the page itself is told by its tab strip.
    expect(screen.queryByRole('tablist', { name: 'Shop content sections' })).not.toBeInTheDocument();
    expect(screen.getByText('storefront:read or legal:read')).toBeInTheDocument();
  });

  it('does not let in a role that only creates on the storefront: publishing moved to the Product / Services page', async () => {
    await openAs(['storefront:create']);
    expect(screen.queryByRole('tablist', { name: 'Shop content sections' })).not.toBeInTheDocument();
  });
});
