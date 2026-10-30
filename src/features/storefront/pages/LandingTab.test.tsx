// Tests for the Landing pages tab: the figures and columns, the page type filter in the address, the row menu (publish and
// unpublish), the edit and new page dialogs, and the draft generator with the list of drafts it created.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import {
  dialogOf,
  openStorefront,
  openTab,
  pickFromRowMenu,
  rowOf,
  tableNamed,
} from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const TABLE = 'Landing pages';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the Landing pages tab through the tab strip. */
async function openLanding(user: User) {
  const app = await openStorefront();
  await openTab(user, 'Landing pages');
  await tableNamed(TABLE);
  return app;
}

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

describe('the table and the figures', () => {
  it('counts pages by status and shows each page with its path, type, status, visits, orders and conversion', async () => {
    const user = userEvent.setup();
    const app = await openLanding(user);
    expect(app.location()).toBe('/storefront?tab=landing');
    const strip = within(await screen.findByRole('region', { name: 'Landing page figures' }));
    await waitFor(() => expect(strip.getByText('Published pages').parentElement).toHaveTextContent('11'));
    expect(strip.getByText('Drafts').parentElement).toHaveTextContent('2');
    expect(strip.getByText('Hidden from Google').parentElement).toHaveTextContent('1');

    const row = await rowOf(TABLE, 'Unlock iPhone on AT&T');
    expect(row.getByText('/unlock/unlock-iphone-on-atandt')).toBeInTheDocument();
    expect(row.getByText('Carrier')).toBeInTheDocument();
    expect(row.getByText('Published')).toBeInTheDocument();
    expect(row.getByText('5,480')).toBeInTheDocument();
    expect(row.getByText('21')).toBeInTheDocument();
    expect(row.getByText('0.4%')).toBeInTheDocument();
    expect(row.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('14 pages')).toBeInTheDocument();
  });

  it('words the three statuses: Published, Draft and Hidden from Google', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    expect((await rowOf(TABLE, 'Samsung KG lock fix')).getByText('Draft')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Unlock Redmi Note 12')).getByText('Hidden from Google')).toBeInTheDocument();
  });
});

describe('the page type filter', () => {
  it('shows one type, keeps it in the address and goes back to All', async () => {
    const user = userEvent.setup();
    const app = await openLanding(user);
    const types = within(screen.getByRole('group', { name: 'Page type' }));
    await user.click(types.getByRole('button', { name: 'Carrier' }));
    expect(await screen.findByText('6 pages')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=landing&kind=carrier');
    expect(types.getByRole('button', { name: 'Carrier' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Unlock Galaxy S23')).not.toBeInTheDocument();

    await user.click(types.getByRole('button', { name: 'All' }));
    expect(await screen.findByText('14 pages')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=landing');
  });

  it('opens straight on a type from the address, and says when no page has that type', async () => {
    await openStorefront('/storefront?tab=landing&kind=country&q=nothing');
    expect(await screen.findByText('No pages of this type')).toBeInTheDocument();
  });
});

describe('the row menu', () => {
  it('publishes a draft and says so', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await pickFromRowMenu(user, 'Samsung KG lock fix', 'Publish');
    expect(await screen.findByText('Page published')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf(TABLE, 'Samsung KG lock fix')).getByText('Published')).toBeInTheDocument(),
    );
    const strip = within(screen.getByRole('region', { name: 'Landing page figures' }));
    await waitFor(() => expect(strip.getByText('Drafts').parentElement).toHaveTextContent('1'));
  });

  it('unpublishes a published page', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await pickFromRowMenu(user, 'Unlock iPhone 13', 'Unpublish');
    expect(await screen.findByText('Page unpublished')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf(TABLE, 'Unlock iPhone 13')).getByText('Draft')).toBeInTheDocument(),
    );
  });

  it('offers only what applies: a draft cannot be unpublished, a hidden page can go either way', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await user.click(await screen.findByRole('button', { name: 'Actions for Samsung KG lock fix' }));
    let menu = within(await screen.findByRole('menu'));
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Edit…', 'Publish']);
    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Actions for Unlock Redmi Note 12' }));
    menu = within(await screen.findByRole('menu'));
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Edit…',
      'Publish',
      'Unpublish',
    ]);
  });
});

describe('Edit and New page', () => {
  it('edits a page, sending only what changed', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await pickFromRowMenu(user, 'Samsung KG lock fix', 'Edit…');
    const dialog = dialogOf('Edit Samsung KG lock fix');
    expect(dialog.getByRole('combobox', { name: 'Type' })).toBeDisabled();
    expect(dialog.getByRole('textbox', { name: 'Slug' })).toHaveValue('samsung-kg-lock-fix');
    expect(dialog.getByRole('textbox', { name: 'Text (Markdown)' })).toHaveValue(
      '# Samsung KG lock fix\n\nText for Samsung KG lock fix goes here.',
    );
    await retype(user, dialog.getByRole('textbox', { name: 'Title' }), 'Samsung KG lock removal');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Page saved')).toBeInTheDocument();
    expect(await rowOf(TABLE, 'Samsung KG lock removal')).toBeTruthy();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await pickFromRowMenu(user, 'Samsung KG lock fix', 'Edit…');
    await user.click(dialogOf('Edit Samsung KG lock fix').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });

  it('shows the server’s refusal of a slug another page uses under the Slug field', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await pickFromRowMenu(user, 'Samsung KG lock fix', 'Edit…');
    const dialog = dialogOf('Edit Samsung KG lock fix');
    await retype(user, dialog.getByRole('textbox', { name: 'Slug' }), 'unlock-iphone-on-atandt');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(
      await dialog.findByText('The slug unlock-iphone-on-atandt is already used by another page.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit Samsung KG lock fix' })).toBeInTheDocument();
  });

  it('saves a new page as a draft', async () => {
    const user = userEvent.setup();
    await openLanding(user);
    await user.click(screen.getByRole('button', { name: 'New page…' }));
    const dialog = dialogOf('New page');
    expect(
      within(dialog.getByRole('combobox', { name: 'Type' }))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Carrier', 'Phone model', 'Free tool', 'Brand', 'Country']);
    await user.click(dialog.getByRole('button', { name: 'Save draft' }));
    expect(await dialog.findByText('Enter a title.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Title' }), 'Unlock phones in Spain');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'country');
    await user.click(dialog.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Page saved as a draft')).toBeInTheDocument();
    expect(await screen.findByText('15 pages')).toBeInTheDocument();
    expect(
      (await rowOf(TABLE, 'Unlock phones in Spain')).getByText('/unlock/unlock-phones-in-spain'),
    ).toBeInTheDocument();
  });
});

describe('Generate drafts', () => {
  async function openGenerate(user: User) {
    await openLanding(user);
    await user.click(screen.getByRole('button', { name: 'Generate drafts…' }));
    return dialogOf('Generate drafts');
  }

  it('creates a draft for each brand, model and network and lists them for review', async () => {
    const user = userEvent.setup();
    const dialog = await openGenerate(user);
    await user.type(dialog.getByRole('textbox', { name: 'Brands' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Models' }), 'iPhone 13');
    await user.type(dialog.getByRole('textbox', { name: 'Networks' }), 'AT&T, Vodafone');
    await user.click(dialog.getByRole('button', { name: 'Generate drafts' }));

    const result = dialogOf('2 drafts created');
    expect(
      result.getByText('Review each one in the Landing pages list, then publish it.'),
    ).toBeInTheDocument();
    expect(result.getByText('Unlock iPhone 13 on AT&T')).toBeInTheDocument();
    expect(result.getByText('/unlock/unlock-iphone-13-on-atandt')).toBeInTheDocument();
    expect(result.getByText('Unlock iPhone 13 on Vodafone')).toBeInTheDocument();
    await user.click(result.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The drafts are in the list, and the figures count them.
    expect(await screen.findByText('16 pages')).toBeInTheDocument();
    const strip = within(screen.getByRole('region', { name: 'Landing page figures' }));
    await waitFor(() => expect(strip.getByText('Drafts').parentElement).toHaveTextContent('4'));
  });

  it('says how many combinations already had a page and were skipped', async () => {
    const user = userEvent.setup();
    let dialog = await openGenerate(user);
    await user.type(dialog.getByRole('textbox', { name: 'Brands' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Models' }), 'iPhone 13');
    await user.type(dialog.getByRole('textbox', { name: 'Networks' }), 'AT&T');
    await user.click(dialog.getByRole('button', { name: 'Generate drafts' }));
    await user.click(
      await within(await screen.findByRole('dialog', { name: '1 draft created' })).findByRole('button', {
        name: 'Done',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Generate drafts…' }));
    dialog = dialogOf('Generate drafts');
    await user.type(dialog.getByRole('textbox', { name: 'Brands' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Models' }), 'iPhone 13');
    await user.type(dialog.getByRole('textbox', { name: 'Networks' }), 'AT&T');
    await user.click(dialog.getByRole('button', { name: 'Generate drafts' }));
    const result = dialogOf('0 drafts created');
    expect(result.getByText('1 combination already has a page and was skipped.')).toBeInTheDocument();
    expect(
      result.getByText('No new drafts. Every combination you asked for already has a page.'),
    ).toBeInTheDocument();
  });
});
