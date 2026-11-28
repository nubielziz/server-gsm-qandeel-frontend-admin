// Tests for the All view's address state and how it becomes the question the server is asked: the strip's population, the filters, the sort,
// the page and the size in the URL, an old address that names a retired tab (Flagged, Verification, Pending approval) or a retired sort (risk
// level), the old chips, and the menus of the Quick Search box. Ported from the customers and merchants filter tests, in this layout's words.
import { describe, expect, it } from 'vitest';
import { rank } from '../../test/fixtures';
import {
  DEFAULT_LIST_SORT,
  EMPTY_LIST_ADDRESS,
  filterWords,
  hasFilters,
  legacyChipOf,
  listFilters,
  listLink,
  parseListAddress,
  stripKeyOf,
  usableSort,
  type ListAddress,
} from './listAddress';
import { countryChoices, rankChoices, rankOptions, statusOptions } from './menus';

const params = (query: string) => new URLSearchParams(query);
const address = (patch: Partial<ListAddress> = {}): ListAddress => ({ ...EMPTY_LIST_ADDRESS, ...patch });

describe('parseListAddress', () => {
  it('starts on every account with nothing filtered, sorted by name, 50 to a page', () => {
    expect(parseListAddress(params(''))).toEqual(EMPTY_LIST_ADDRESS);
    expect(EMPTY_LIST_ADDRESS).toMatchObject({ sort: 'name', dir: 'asc', page: 1, size: 50 });
  });

  it('reads the population, status, rank, country, search, sort, direction, page and size', () => {
    expect(
      parseListAddress(
        params(
          'chip=merchants&status=suspended&rank=3&country=gb&q=zain&sort=balance&dir=desc&page=4&size=100',
        ),
      ),
    ).toEqual({
      chip: 'merchants',
      status: 'suspended',
      rank: 3,
      country: 'GB',
      q: 'zain',
      sort: 'balance',
      dir: 'desc',
      page: 4,
      size: 100,
    });
    for (const chip of ['retail', 'merchants', 'guests'] as const) {
      expect(parseListAddress(params(`chip=${chip}`)).chip).toBe(chip);
    }
  });

  it('drops a chip, status, rank, country, sort or size it does not know, and keeps the rest', () => {
    expect(
      parseListAddress(
        params('chip=vip&status=pending&rank=abc&country=Germany&sort=password&size=7&q=ann&page=0'),
      ),
    ).toEqual({ ...EMPTY_LIST_ADDRESS, q: 'ann' });
    expect(parseListAddress(params('rank=-3')).rank).toBeNull();
    expect(parseListAddress(params('rank=0')).rank).toBeNull();
    expect(parseListAddress(params('page=x')).page).toBe(1);
    expect(parseListAddress(params('dir=sideways')).dir).toBe('asc');
  });

  it('reads the sorts the server offers', () => {
    for (const sort of ['name', 'rank', 'status', 'balance', 'ordersCount', 'lastOrderAt']) {
      expect(parseListAddress(params(`sort=${sort}`)).sort).toBe(sort);
    }
  });

  it('opens the plain list for an old address of the Flagged tab, and keeps the rest of the address', () => {
    expect(parseListAddress(params('tab=flagged&q=ann&country=gb'))).toEqual({
      ...EMPTY_LIST_ADDRESS,
      q: 'ann',
      country: 'GB',
    });
  });

  it('opens the default sort for an old address that sorts by the risk level, which was retired', () => {
    expect(parseListAddress(params('sort=riskLevel&dir=asc')).sort).toBe(DEFAULT_LIST_SORT);
    // Its direction goes with it: the default order is the name, A to Z.
    expect(parseListAddress(params('sort=riskLevel&dir=desc'))).toEqual(EMPTY_LIST_ADDRESS);
    expect(parseListAddress(params('dir=desc')).dir).toBe('desc');
    expect(parseListAddress(params('sort=totalSpent&dir=desc')).sort).toBe(DEFAULT_LIST_SORT);
  });

  // The Verification tab and the Pending approval tab were retired: a bookmark or a link that still names one must open the list.
  it('keeps the filters of an old address of the retired Verification or Pending approval tab', () => {
    expect(parseListAddress(params('tab=verification&kycStatus=approved&kyc=3&q=zain&page=2'))).toEqual({
      ...EMPTY_LIST_ADDRESS,
      q: 'zain',
      page: 2,
    });
    expect(parseListAddress(params('tab=pending&q=zain&group=3'))).toEqual({
      ...EMPTY_LIST_ADDRESS,
      q: 'zain',
    });
  });

  it('reads Invitation pending from the status key, writes it back, and says it in words', () => {
    expect(parseListAddress(params('status=invitation')).status).toBe('invitation');
    expect(parseListAddress(params('status=pending')).status).toBeNull();
    expect(listLink({ status: 'invitation' })).toBe('/accounts?status=invitation');
    expect(hasFilters(parseListAddress(params('status=invitation')))).toBe(true);
    expect(filterWords(parseListAddress(params('status=invitation')))).toBe('Invitation pending');
  });

  it('reads the old chips of the suspended and blocked tabs as the status filter', () => {
    expect(parseListAddress(params('chip=suspended')).status).toBe('suspended');
    expect(parseListAddress(params('chip=suspended')).chip).toBeNull();
    expect(parseListAddress(params('chip=blocked&q=a'))).toEqual({
      ...EMPTY_LIST_ADDRESS,
      status: 'blocked',
      q: 'a',
    });
    // A status the address names itself wins over the old chip.
    expect(parseListAddress(params('chip=suspended&status=blocked')).status).toBe('blocked');
    // The old chip of the data requests tab is a view, not a population.
    expect(parseListAddress(params('chip=requests')).chip).toBeNull();
    expect(legacyChipOf(params('chip=requests'))).toBe('requests');
    expect(legacyChipOf(params('chip=blocked'))).toBe('blocked');
    expect(legacyChipOf(params('chip=retail'))).toBeNull();
  });
});

describe('listLink', () => {
  it('leaves the defaults out, so a clean address means "every account"', () => {
    expect(listLink()).toBe('/accounts');
    expect(listLink({ chip: null, q: '  ', page: 1, size: 50, sort: 'name', dir: 'asc' })).toBe('/accounts');
  });

  it('writes the keys in one fixed order', () => {
    expect(
      listLink({
        q: 'zain',
        chip: 'merchants',
        size: 25,
        page: 3,
        dir: 'desc',
        sort: 'balance',
        country: 'JO',
        rank: 3,
        status: 'active',
      }),
    ).toBe(
      '/accounts?chip=merchants&status=active&rank=3&country=JO&q=zain&sort=balance&dir=desc&page=3&size=25',
    );
  });

  it('writes the direction only when it is descending, also on the default sort', () => {
    expect(listLink({ sort: 'name', dir: 'desc' })).toBe('/accounts?dir=desc');
    expect(listLink({ sort: 'status', dir: 'asc' })).toBe('/accounts?sort=status');
  });

  it('trims the search text', () => {
    expect(listLink({ q: '  ann ' })).toBe('/accounts?q=ann');
  });

  it('reads back what it wrote', () => {
    for (const patch of [
      {},
      { chip: 'guests' as const },
      { status: 'blocked' as const, q: 'ann', page: 2 },
      { sort: 'lastOrderAt' as const, dir: 'desc' as const, size: 200, country: 'DE', rank: 4 },
    ]) {
      const written = listLink(patch);
      const read = parseListAddress(params(written.split('?')[1] ?? ''));
      expect(listLink(read)).toBe(written);
    }
  });
});

describe('filters on', () => {
  it('counts the search text (trimmed), the status, the rank and the country, not the population, the sort or the page', () => {
    expect(hasFilters(address({ chip: 'retail', page: 3, sort: 'status', size: 25 }))).toBe(false);
    expect(hasFilters(address({ q: '  ' }))).toBe(false);
    expect(hasFilters(address({ q: 'a' }))).toBe(true);
    expect(hasFilters(address({ status: 'active' }))).toBe(true);
    expect(hasFilters(address({ rank: 3 }))).toBe(true);
    expect(hasFilters(address({ country: 'GB' }))).toBe(true);
  });

  it('says the filters in words', () => {
    expect(filterWords(address({ q: 'ann', status: 'suspended', rank: 3, country: 'DE' }), 'VIP')).toBe(
      '“ann”, Suspended, rank VIP, country DE',
    );
    expect(filterWords(address({ rank: 9 }))).toBe('rank #9');
    expect(filterWords(address())).toBe('');
  });

  it('takes the balance sort away from a role that cannot read wallets', () => {
    expect(usableSort('balance', { wallet: false })).toBe('name');
    expect(usableSort('balance', { wallet: true })).toBe('balance');
    expect(usableSort('status', { wallet: false })).toBe('status');
  });

  it('names the strip tab of a population', () => {
    expect(stripKeyOf(null)).toBe('all');
    expect(stripKeyOf('guests')).toBe('guests');
  });
});

describe('what the server is asked', () => {
  it('maps each population to its filter: every account is none, retail and merchants are the rank kind, guests have no login', () => {
    expect(listFilters(address())).toEqual({});
    expect(listFilters(address({ chip: 'retail' }))).toEqual({ rankKind: 'retail' });
    expect(listFilters(address({ chip: 'merchants' }))).toEqual({ rankKind: 'merchant' });
    expect(listFilters(address({ chip: 'guests' }))).toEqual({ hasAccount: false });
  });

  it('adds the status, the rank, the country and the trimmed search text', () => {
    expect(
      listFilters(address({ chip: 'merchants', status: 'suspended', rank: 3, country: 'JO', q: '  zain  ' })),
    ).toEqual({ rankKind: 'merchant', status: 'suspended', rankId: 3, country: 'JO', q: 'zain' });
    expect(listFilters(address({ q: '   ' }))).toEqual({});
  });

  it('asks for the unused invitations with their own flag, never as a status', () => {
    expect(listFilters(address({ status: 'invitation' }))).toEqual({ invitationPending: true });
    expect(listFilters(address({ chip: 'merchants', status: 'invitation', q: 'zain' }))).toEqual({
      rankKind: 'merchant',
      invitationPending: true,
      q: 'zain',
    });
  });
});

describe('the menus of the Quick Search box', () => {
  const ranks = [
    rank({ id: 1, name: 'Standard', accountCount: 7 }),
    rank({ id: 3, name: 'VIP', accountCount: 2 }),
    rank({ id: 4, name: 'Storefront retail', kind: 'b2c_retail', rankKind: 'retail', accountCount: 31 }),
  ];

  it('offers every rank for All accounts with the retail rank first, the retail rank for Retail and Guests, the merchant ranks for Merchants', () => {
    expect(rankChoices(ranks, null).map((r) => r.id)).toEqual([4, 1, 3]);
    expect(rankChoices(ranks, 'retail').map((r) => r.id)).toEqual([4]);
    expect(rankChoices(ranks, 'guests').map((r) => r.id)).toEqual([4]);
    expect(rankChoices(ranks, 'merchants').map((r) => r.id)).toEqual([1, 3]);
  });

  it('writes each rank with its number of accounts, after "All ranks"', () => {
    expect(rankOptions(rankChoices(ranks, 'merchants'), null).map((option) => option.label)).toEqual([
      'All ranks',
      'Standard (7)',
      'VIP (2)',
    ]);
    expect(
      rankOptions([rank({ id: 5, name: 'New', accountCount: undefined })], null).map(
        (option) => option.label,
      ),
    ).toEqual(['All ranks', 'New']);
  });

  it('keeps a rank of the address that the list lacks selectable, by number', () => {
    expect(rankOptions([], 9).map((option) => [option.value, option.label])).toEqual([
      ['', 'All ranks'],
      [9, 'Rank #9'],
    ]);
    expect(rankOptions(ranks, 3)).toHaveLength(4);
  });

  it('writes the statuses with the counts of the exceptions, and none while they are unknown', () => {
    const counts = {
      all: 51,
      retail: 31,
      merchant: 20,
      guests: 21,
      active: 46,
      suspended: 3,
      blocked: 1,
      anonymized: 0,
      invitationPending: 1,
    };
    expect(statusOptions(counts).map((option) => option.label)).toEqual([
      'Any status',
      'Active',
      'Suspended (3)',
      'Blocked (1)',
      'Anonymized (0)',
      'Invitation pending (1)',
    ]);
    expect(statusOptions(undefined).map((option) => option.label)).toEqual([
      'Any status',
      'Active',
      'Suspended',
      'Blocked',
      'Anonymized',
      'Invitation pending',
    ]);
  });

  it('lists every country by name, and shows a code the list lacks as "Country XX"', () => {
    expect(countryChoices('')[0]).toEqual({ value: '', label: 'Any country' });
    expect(countryChoices('')).toHaveLength(250);
    expect(countryChoices('DE').find((option) => option.value === 'DE')?.label).toBe('Germany');
    expect(countryChoices('PL').find((option) => option.value === 'PL')?.label).toBe('Poland');
    expect(countryChoices('PL')).toHaveLength(250);
    expect(countryChoices('XK').at(-1)).toEqual({ value: 'XK', label: 'Country XK' });
  });
});
