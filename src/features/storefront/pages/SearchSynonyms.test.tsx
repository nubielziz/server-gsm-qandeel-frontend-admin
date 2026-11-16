// Tests for the Synonyms section of the Search tab: the seeded rules, add (multi-way and one-way), edit with only the changed
// fields, the On switch, delete behind a confirmation, the server's messages under the field, the permissions, and the address.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { READER, WRITER, openSearch } from '../test/searchTab';
import { dialogOf, openStorefront, openTab, rowOf } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
// The request recorder spies on `fetch`; put it back so one test never sees another's calls.
afterEach(() => vi.restoreAllMocks());

const TABLE = 'Search synonyms';
const FRP = 'frp = google account lock = frp lock';

describe('the Search tab', () => {
  it('opens from the tab strip on the Synonyms section', async () => {
    const user = userEvent.setup();
    const app = await openStorefront();
    await openTab(user, 'Search');
    expect(app.location()).toBe('/storefront?tab=search');
    expect(await screen.findByRole('tab', { name: 'Synonyms' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Pinned results' }));
    expect(app.location()).toBe('/storefront?tab=search&section=pins');
  });
});

describe('the rules', () => {
  it('lists the five starting rules with their terms', async () => {
    await openSearch();
    expect(await rowOf(TABLE, 'google account lock')).toBeTruthy();
    expect(await screen.findByText('5 rules')).toBeInTheDocument();
    const row = await rowOf(TABLE, 'knox guard lock');
    expect(row.getByText('Same meaning')).toBeInTheDocument();
    expect(
      row.getByRole('switch', { name: 'Switch off synonym kg lock = knox guard = knox guard lock' }),
    ).toBeChecked();
  });

  it('searches terms and notes and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openSearch();
    await user.type(await screen.findByRole('searchbox', { name: 'Search a term or a note' }), 'knox');
    expect(await screen.findByText('1 rule')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=search&q=knox');
    await user.clear(screen.getByRole('searchbox', { name: 'Search a term or a note' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search a term or a note' }), 'zzz');
    expect(await screen.findByText('No synonyms match')).toBeInTheDocument();
  });

  it('filters by on and off', async () => {
    const user = userEvent.setup();
    const app = await openSearch();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'Off');
    expect(await screen.findByText('No synonyms match')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=search&state=off');
  });
});

describe('Add synonym', () => {
  it('asks for two terms, then adds a rule from chips', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Add synonym…' }));
    const dialog = dialogOf('Add synonym');
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(
      await dialog.findByText('Add at least two words or phrases that mean the same.'),
    ).toBeInTheDocument();

    const box = dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' });
    await user.type(box, 'Bypass FRP{Enter}frp bypass,');
    expect(dialog.getByRole('button', { name: 'Remove bypass frp' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Remove frp bypass' })).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Why (optional)' }), 'Two names for the same job');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(await screen.findByText('Synonym added')).toBeInTheDocument();
    expect(requests.sent().find((r) => r.method === 'POST')?.body).toEqual({
      kind: 'multi',
      terms: ['bypass frp', 'frp bypass'],
      isEnabled: true,
      note: 'Two names for the same job',
    });
    expect(await rowOf(TABLE, 'bypass frp')).toBeTruthy();
    expect(await screen.findByText('6 rules')).toBeInTheDocument();
  });

  it('ignores a repeated term and lets a chip be removed', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Add synonym…' }));
    const dialog = dialogOf('Add synonym');
    const box = dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' });
    await user.type(box, 'FRP{Enter}frp{Enter}other{Enter}');
    expect(dialog.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    await user.click(dialog.getByRole('button', { name: 'Remove other' }));
    expect(dialog.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  });

  it('adds a one-way rule with its root', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Add synonym…' }));
    const dialog = dialogOf('Add synonym');
    await user.click(dialog.getByRole('radio', { name: /One way/ }));
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(await dialog.findByText('Enter the word that should find the others.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Searching for' }), 'verizon');
    await user.type(dialog.getByRole('textbox', { name: 'Also finds' }), 'vzw{Enter}verizon usa{Enter}');
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(await screen.findByText('Synonym added')).toBeInTheDocument();
    const row = await rowOf(TABLE, 'verizon usa');
    expect(row.getByText('One way')).toBeInTheDocument();
    expect(row.getByLabelText('also finds')).toBeInTheDocument();
  });

  it('shows the server’s message under the field it names', async () => {
    mockServer.use(
      http.post('*/admin/search/synonyms', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'terms', message: 'These words are in another rule: frp.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Add synonym…' }));
    const dialog = dialogOf('Add synonym');
    await user.type(
      dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' }),
      'frp{Enter}frp lock{Enter}',
    );
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(await dialog.findByText('These words are in another rule: frp.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('Edit synonym', () => {
  it('sends only what changed', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(
      (await rowOf(TABLE, 'google account lock')).getByRole('button', { name: `Edit synonym ${FRP}` }),
    );
    const dialog = dialogOf('Edit synonym');
    await user.type(
      dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' }),
      'frp remove{Enter}',
    );
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Synonym saved')).toBeInTheDocument();
    expect(requests.sent().find((r) => r.method === 'PATCH')?.body).toEqual({
      terms: ['frp', 'google account lock', 'frp lock', 'frp remove'],
    });
    expect(await rowOf(TABLE, 'frp remove')).toBeTruthy();
  });

  it('says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(
      (await rowOf(TABLE, 'google account lock')).getByRole('button', { name: `Edit synonym ${FRP}` }),
    );
    const dialog = dialogOf('Edit synonym');
    expect(dialog.getByRole('textbox', { name: 'Why (optional)' })).toHaveValue(
      'Visitors search for the old name and the new one.',
    );
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('the On switch', () => {
  it('switches a rule off and shows it under the Off filter', async () => {
    const user = userEvent.setup();
    await openSearch();
    const row = await rowOf(TABLE, 'google account lock');
    const requests = recordRequests();
    await user.click(row.getByRole('switch', { name: `Switch off synonym ${FRP}` }));
    expect(await screen.findByText('Synonym switched off')).toBeInTheDocument();
    expect(requests.sent().find((r) => r.method === 'PATCH')?.body).toEqual({ isEnabled: false });
    await waitFor(async () =>
      expect((await rowOf(TABLE, 'google account lock')).getByRole('switch')).not.toBeChecked(),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Off');
    expect(await screen.findByText('1 rule')).toBeInTheDocument();
  });
});

describe('Delete synonym', () => {
  it('asks first, says what happens, then deletes', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(
      (await rowOf(TABLE, 'google account lock')).getByRole('button', { name: `Delete synonym ${FRP}` }),
    );
    const dialog = dialogOf('Delete this synonym?');
    expect(dialog.getByText(FRP)).toBeInTheDocument();
    expect(dialog.getByText(/stop expanding to these terms within a minute/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('5 rules')).toBeInTheDocument();

    await user.click(
      (await rowOf(TABLE, 'google account lock')).getByRole('button', { name: `Delete synonym ${FRP}` }),
    );
    await user.click(dialogOf('Delete this synonym?').getByRole('button', { name: 'Delete synonym' }));
    expect(await screen.findByText('Synonym deleted')).toBeInTheDocument();
    expect(await screen.findByText('4 rules')).toBeInTheDocument();
    expect(
      within(await screen.findByRole('table', { name: TABLE })).queryByText('google account lock'),
    ).toBeNull();
  });

  it('shows the server’s refusal in the dialog', async () => {
    mockServer.use(
      http.delete('*/admin/search/synonyms/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'Somebody deleted this rule first.'),
      ),
    );
    const user = userEvent.setup();
    await openSearch();
    await user.click(
      (await rowOf(TABLE, 'google account lock')).getByRole('button', { name: `Delete synonym ${FRP}` }),
    );
    await user.click(dialogOf('Delete this synonym?').getByRole('button', { name: 'Delete synonym' }));
    expect(
      await dialogOf('Delete this synonym?').findByText('Somebody deleted this rule first.'),
    ).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the rules but not change them, and names the missing permission', async () => {
    await openSearch('synonyms', { permissions: READER });
    const row = await rowOf(TABLE, 'google account lock');
    for (const control of [
      row.getByRole('switch'),
      row.getByRole('button', { name: `Edit synonym ${FRP}` }),
      row.getByRole('button', { name: `Delete synonym ${FRP}` }),
      screen.getByRole('button', { name: 'Add synonym…' }),
    ]) {
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute('title', 'You need the storefront:update permission');
    }
  });

  it('lets storefront:update change them', async () => {
    await openSearch('synonyms', { permissions: WRITER });
    const row = await rowOf(TABLE, 'google account lock');
    expect(row.getByRole('switch')).toBeEnabled();
    expect(row.getByRole('button', { name: `Edit synonym ${FRP}` })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add synonym…' })).toBeEnabled();
  });
});
