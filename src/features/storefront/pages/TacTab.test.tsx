// Tests for the TAC catalogue tab (new in the map): the table, the search by prefix, brand or model kept in the address, and the
// Add TAC and Edit dialogs with the server's field messages.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openStorefront, rowOf, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const TABLE = 'TAC catalogue';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the TAC catalogue by its address and waits for the table. */
async function openTac(route = '/storefront?tab=tac') {
  const app = await openStorefront(route);
  await tableNamed(TABLE);
  return app;
}

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

describe('the table and the search', () => {
  it('lists the TACs with the brand, the phone people know, the model code, the year and the source', async () => {
    await openTac();
    const row = await rowOf(TABLE, '35389011');
    expect(row.getByText('Apple')).toBeInTheDocument();
    expect(row.getByText('iPhone 13')).toBeInTheDocument();
    expect(row.getByText('A2633')).toBeInTheDocument();
    expect(row.getByText('2021')).toBeInTheDocument();
    expect(row.getByText('import')).toBeInTheDocument();
    expect(await screen.findByText('8 TACs')).toBeInTheDocument();
  });

  it('searches by prefix, brand or model and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openTac();
    await user.type(screen.getByRole('searchbox', { name: 'Search TAC, brand or model' }), 'galaxy');
    expect(await screen.findByText('2 TACs')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=tac&q=galaxy');
    expect(await rowOf(TABLE, '35290511')).toBeTruthy();
    await user.clear(screen.getByRole('searchbox', { name: 'Search TAC, brand or model' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search TAC, brand or model' }), '35389');
    expect(await screen.findByText('1 TAC')).toBeInTheDocument();
  });

  it('says no TAC matches and offers to clear the search', async () => {
    const user = userEvent.setup();
    await openStorefront('/storefront?tab=tac&q=zzz');
    expect(await screen.findByText('No TACs match')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('8 TACs')).toBeInTheDocument();
  });

  it('sorts by brand from the header', async () => {
    const user = userEvent.setup();
    const app = await openTac();
    await user.click(screen.getByRole('button', { name: /^Brand/ }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=tac&sort=brand&dir=asc'));
  });
});

describe('Add TAC', () => {
  it('checks the form, then adds an entry and finds it in the list', async () => {
    const user = userEvent.setup();
    await openTac();
    await user.click(screen.getByRole('button', { name: 'Add TAC…' }));
    const dialog = dialogOf('Add TAC');
    await user.type(dialog.getByRole('textbox', { name: 'TAC (8 digits)' }), '3500');
    await user.click(dialog.getByRole('button', { name: 'Add TAC' }));
    expect(await dialog.findByText('Enter exactly 8 digits.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the brand.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the model code.')).toBeInTheDocument();

    await retype(user, dialog.getByRole('textbox', { name: 'TAC (8 digits)' }), '35000001');
    await user.type(dialog.getByRole('textbox', { name: 'Brand' }), 'Nokia');
    await user.type(dialog.getByRole('textbox', { name: 'Model code' }), 'TA-1400');
    await user.type(dialog.getByRole('textbox', { name: 'Name customers know' }), 'Nokia G42');
    await user.type(dialog.getByRole('textbox', { name: 'Release year' }), '2023');
    await user.click(dialog.getByRole('button', { name: 'Add TAC' }));
    expect(await screen.findByText('TAC added')).toBeInTheDocument();
    expect(screen.getByText('35000001: Nokia TA-1400')).toBeInTheDocument();
    expect(await screen.findByText('9 TACs')).toBeInTheDocument();
    const row = await rowOf(TABLE, '35000001');
    expect(row.getByText('Nokia G42')).toBeInTheDocument();
    expect(row.getByText('manual')).toBeInTheDocument();
  });

  it('shows the server’s refusal of a prefix that is already there under the TAC field', async () => {
    const user = userEvent.setup();
    await openTac();
    await user.click(screen.getByRole('button', { name: 'Add TAC…' }));
    const dialog = dialogOf('Add TAC');
    await user.type(dialog.getByRole('textbox', { name: 'TAC (8 digits)' }), '35389011');
    await user.type(dialog.getByRole('textbox', { name: 'Brand' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Model code' }), 'A0000');
    await user.click(dialog.getByRole('button', { name: 'Add TAC' }));
    expect(await dialog.findByText('The TAC 35389011 is already in the catalogue.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'TAC (8 digits)' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Edit', () => {
  it('corrects an entry and sends only what changed', async () => {
    const user = userEvent.setup();
    await openTac();
    await user.click((await rowOf(TABLE, '35925410')).getByRole('button', { name: 'Edit TAC 35925410' }));
    const dialog = dialogOf('Edit TAC 35925410');
    expect(dialog.getByRole('textbox', { name: 'Brand' })).toHaveValue('Apple');
    expect(dialog.getByRole('textbox', { name: 'Model code' })).toHaveValue('A2889');
    expect(dialog.getByRole('textbox', { name: 'Release year' })).toHaveValue('2022');
    await retype(user, dialog.getByRole('textbox', { name: 'Name customers know' }), 'iPhone 14 Pro (2022)');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('TAC saved')).toBeInTheDocument();
    expect(await (await rowOf(TABLE, '35925410')).findByText('iPhone 14 Pro (2022)')).toBeInTheDocument();
  });

  it('says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openTac();
    await user.click((await rowOf(TABLE, '35925410')).getByRole('button', { name: 'Edit TAC 35925410' }));
    await user.click(dialogOf('Edit TAC 35925410').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});
