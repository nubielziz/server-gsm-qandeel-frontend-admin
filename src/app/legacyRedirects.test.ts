// Tests for the old addresses and where they go: one row per case of the table (Services & pricing, the Storefront tabs that moved
// to Catalog, and the Shop content addresses that must stay), plus the checks that the answers are the addresses `catalogPath` builds.
import { describe, expect, it } from 'vitest';
import { catalogPath } from '@/features/services';
import { legacyTarget } from './legacyRedirects';

type Case = [name: string, pathname: string, search: string, target: string | null];

const SERVICES: Case[] = [
  ['the bare Services page', '/services', '', '/catalog'],
  ['an empty query', '/services', '?', '/catalog'],
  ['a trailing slash', '/services/', '', '/catalog'],
  ['another letter case', '/Services', '', '/catalog'],
  [
    'text, type and below floor',
    '/services',
    '?q=AT%26T&type=imei&belowFloor=true',
    '/catalog?q=AT%26T&type=imei&belowFloor=true',
  ],
  ['a page and a sort', '/services', '?page=2&sort=cost&dir=desc', '/catalog?page=2&sort=cost&dir=desc'],
  [
    'the disabled filter, which is the Switched off chip',
    '/services',
    '?status=disabled',
    '/catalog?chip=off',
  ],
  [
    'the disabled filter between other filters keeps their order',
    '/services',
    '?q=x&status=disabled&page=2',
    '/catalog?q=x&chip=off&page=2',
  ],
  [
    'a chip already in the address wins over the disabled filter',
    '/services',
    '?status=disabled&chip=attention',
    '/catalog?chip=attention',
  ],
  ['a status the old table did not know is dropped', '/services', '?status=sold&q=x', '/catalog?q=x'],
  ['the Services tab named by its id is the table', '/services', '?tab=services&q=x', '/catalog?q=x'],
  ['an unknown tab is the table too', '/services', '?tab=nothing&type=server', '/catalog?type=server'],
  [
    'keys only another view reads are dropped from the table',
    '/services',
    '?q=x&service=4&merchant=2&run=7',
    '/catalog?q=x',
  ],
  ['the Categories tab', '/services', '?tab=categories', '/catalog?view=settings&tab=categories'],
  ['the Rules and groups tab', '/services', '?tab=rules', '/catalog?view=settings&tab=rules'],
  ['the Price resolver tab', '/services', '?tab=resolver', '/catalog?view=settings&tab=resolver'],
  [
    'the Price resolver on a service and a merchant',
    '/services',
    '?tab=resolver&service=4&merchant=12',
    '/catalog?view=settings&tab=resolver&service=4&merchant=12',
  ],
  ['the Code inventory tab', '/services', '?tab=inventory', '/catalog?view=settings&tab=inventory'],
  [
    'the Code inventory by service, status and page',
    '/services',
    '?tab=inventory&status=sold&service=16&page=2',
    '/catalog?view=settings&tab=inventory&status=sold&service=16&page=2',
  ],
  [
    'a tab that is not the first key',
    '/services',
    '?service=16&tab=inventory',
    '/catalog?view=settings&tab=inventory&service=16',
  ],
  [
    'a view already in the address is written once',
    '/services',
    '?view=settings&tab=resolver&service=4',
    '/catalog?view=settings&tab=resolver&service=4',
  ],
];

const STOREFRONT_MOVED: Case[] = [
  ['the Publish tab', '/storefront', '?tab=publish', '/catalog?view=publish'],
  ['one publish run', '/storefront', '?tab=publish&run=7', '/catalog?view=publish&run=7'],
  [
    'a publish run with its table state',
    '/storefront',
    '?tab=publish&run=7&page=2&result=refused&state=ready',
    '/catalog?view=publish&run=7&page=2&result=refused&state=ready',
  ],
  ['the Retail pricing tab', '/storefront', '?tab=pricing', '/catalog?view=settings&tab=shop-prices'],
  [
    'the Retail pricing tab with every price change',
    '/storefront',
    '?tab=pricing&show=all',
    '/catalog?view=settings&tab=shop-prices&show=all',
  ],
  [
    'the Retail pricing tab with its page and sort',
    '/storefront',
    '?tab=pricing&show=all&page=2&sort=id&dir=desc',
    '/catalog?view=settings&tab=shop-prices&show=all&page=2&sort=id&dir=desc',
  ],
  ['the Services on sale tab', '/storefront', '?tab=listings', '/catalog?shop=on'],
  [
    'the Services on sale tab with search, page and sort',
    '/storefront',
    '?tab=listings&q=unlock&page=3&sort=title&dir=desc',
    '/catalog?shop=on&q=unlock&page=3&sort=title&dir=desc',
  ],
  [
    'the Services on sale tab drops what the table does not read',
    '/storefront',
    '?tab=listings&locked=true&q=x',
    '/catalog?shop=on&q=x',
  ],
  [
    'the default tab had no tab in its address: a search',
    '/storefront',
    '?q=unlock',
    '/catalog?shop=on&q=unlock',
  ],
  ['the default tab: a page', '/storefront', '?page=2', '/catalog?shop=on&page=2'],
  ['the default tab: a sort', '/storefront', '?sort=title&dir=asc', '/catalog?shop=on&sort=title&dir=asc'],
  ['an empty tab is no tab', '/storefront', '?tab=&q=unlock', '/catalog?shop=on&q=unlock'],
  ['a trailing slash', '/storefront/', '?tab=publish&run=7', '/catalog?view=publish&run=7'],
];

const STOREFRONT_STAYS: Case[] = [
  ['the bare Shop content page', '/storefront', '', null],
  ['an empty query', '/storefront', '?', null],
  ['the Landing pages tab', '/storefront', '?tab=landing', null],
  ['the Landing pages tab on a page type', '/storefront', '?tab=landing&kind=carrier', null],
  ['the Landing pages tab with a search', '/storefront', '?tab=landing&q=unlock', null],
  ['the Content and legal tab', '/storefront', '?tab=content', null],
  ['the Help centre tab', '/storefront', '?tab=help', null],
  ['the TAC catalogue tab with a search and a page', '/storefront', '?tab=tac&q=3538&page=2', null],
  ['the Search tab', '/storefront', '?tab=search&section=pins&state=on', null],
  ['a tab that is not known names a tab', '/storefront', '?tab=nothing&q=x', null],
  ['a page type with no tab and no list key', '/storefront', '?kind=carrier', null],
];

const NOT_OLD: Case[] = [
  ['Catalog itself', '/catalog', '?view=publish&run=7', null],
  ['the Suppliers page', '/suppliers', '?supplier=2', null],
  ['the start page', '/', '', null],
  ['an address below the old page', '/services/5', '', null],
  ['an address that only starts with the old name', '/services-old', '', null],
  ['a Shop content address below the page', '/storefront/5', '?tab=publish', null],
];

describe('legacyTarget', () => {
  describe.each([
    ['Services & pricing', SERVICES],
    ['the Storefront tabs that moved to Catalog', STOREFRONT_MOVED],
    ['the Shop content addresses that stay', STOREFRONT_STAYS],
    ['addresses that are not old ones', NOT_OLD],
  ] as const)('%s', (_group, cases) => {
    it.each(cases)('%s: %s%s', (_name, pathname, search, target) => {
      expect(legacyTarget(pathname, search)).toBe(target);
    });
  });

  it('works without a search argument', () => {
    expect(legacyTarget('/services')).toBe('/catalog');
    expect(legacyTarget('/storefront')).toBeNull();
  });

  it('builds the same addresses as catalogPath', () => {
    expect(legacyTarget('/services', '?q=tool&type=imei')).toBe(catalogPath({ q: 'tool', type: 'imei' }));
    expect(legacyTarget('/services', '?status=disabled')).toBe(catalogPath({ chip: 'off' }));
    expect(legacyTarget('/services', '?tab=categories')).toBe(
      catalogPath({ view: 'settings', tab: 'categories' }),
    );
    expect(legacyTarget('/services', '?tab=rules')).toBe(catalogPath({ view: 'settings', tab: 'rules' }));
    expect(legacyTarget('/services', '?tab=resolver&service=4&merchant=12')).toBe(
      catalogPath({ view: 'settings', tab: 'resolver', service: 4, merchant: 12 }),
    );
    expect(legacyTarget('/services', '?tab=inventory&status=sold&service=16')).toBe(
      catalogPath({ view: 'settings', tab: 'inventory', status: 'sold', service: 16 }),
    );
    expect(legacyTarget('/storefront', '?tab=publish&run=7')).toBe(catalogPath({ view: 'publish', run: 7 }));
    expect(legacyTarget('/storefront', '?tab=pricing&show=all')).toBe(
      catalogPath({ view: 'settings', tab: 'shop-prices', show: 'all' }),
    );
    expect(legacyTarget('/storefront', '?tab=listings&q=x')).toBe(catalogPath({ shop: 'on', q: 'x' }));
  });

  it('never answers with an address that is itself an old one', () => {
    for (const [, pathname, search] of [...SERVICES, ...STOREFRONT_MOVED]) {
      const target = legacyTarget(pathname, search);
      const [path, query = ''] = (target ?? '').split('?');
      expect(legacyTarget(path, query)).toBeNull();
    }
  });
});
