// Tests for the command palette's account search, run against the dev mock API: what a result says, how many there are, and where it goes.
// One source for every rank; it replaces the merchants and customers sources.
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { installAccountMocks } from '../test/installAccountMocks';
import { accountsPaletteSource, PALETTE_ACCOUNT_LIMIT } from './paletteSource';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  accountsPaletteSource.search(query, new AbortController().signal, go);

describe('accountsPaletteSource', () => {
  it('needs clients:read and sits under the Accounts heading', () => {
    expect(accountsPaletteSource).toMatchObject({
      id: 'accounts',
      group: 'Accounts',
      permission: 'clients:read',
    });
  });

  it('finds a merchant by name, with the rank and the email as the hint', async () => {
    const hits = await search('zain');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: 'account:1',
      label: 'Zain Mobile Hub',
      hint: 'VIP · ops@zainmobilehub.example',
      icon: 'users',
    });
  });

  it('finds a shop account by name, and by email', async () => {
    const [byName] = await search('whitmore');
    expect(byName).toMatchObject({
      id: 'account:101',
      label: 'Daniel Whitmore',
      hint: expect.stringContaining('Storefront retail'),
    });
    const hits = await search('  KARACHIUNLOCKH ');
    expect(hits.map((hit) => hit.label)).toEqual(['Karachi Unlock Hub']);
    expect((await search('sofia.alvarez@')).map((hit) => hit.label)).toEqual(['Sofia Alvarez']);
  });

  it('shows the email as the label of an account with no name, and the rank as the hint', async () => {
    const [hit] = await search('no.name@');
    expect(hit).toMatchObject({
      id: 'account:131',
      label: 'no.name@mail.example',
      hint: 'Storefront retail',
    });
  });

  it('opens the account’s page', async () => {
    const go = vi.fn();
    const [hit] = await search('tunis', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/accounts/19');
  });

  it('lists at most six accounts, by name', async () => {
    const hits = await search('example');
    expect(hits).toHaveLength(PALETTE_ACCOUNT_LIMIT);
    // An account with no name sorts first by its empty name and is labelled by its email.
    const named = hits.map((hit) => hit.label).filter((label) => !label.includes('@'));
    expect(named).toEqual([...named].sort((a, b) => a.localeCompare(b)));
  });

  it('asks the server for the first matches by name', async () => {
    const urls: URL[] = [];
    mockServer.use(
      http.get('*/admin/clients', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
      }),
    );
    await search('  whitmore ');
    expect(urls).toHaveLength(1);
    const params = urls[0].searchParams;
    expect(params.get('q')).toBe('whitmore');
    expect(params.get('_start')).toBe('0');
    expect(params.get('_end')).toBe('6');
    expect(params.get('_sort')).toBe('name');
    expect(params.get('_order')).toBe('asc');
  });

  it('finds nobody for text that matches nobody', async () => {
    expect(await search('zzzzzz')).toEqual([]);
  });
});
