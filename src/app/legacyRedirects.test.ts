// Tests for the old addresses and where they go: one row per case of the table (the Catalog page, Services & pricing, the Storefront tabs
// that moved to Product / Services, and the Shop content addresses that must stay), plus the checks that the answers are addresses the
// page knows (`productsPath` writes them, its views, parts and tabs are the ones named).
import { describe, expect, it } from 'vitest';
import { PRODUCTS_VIEWS, productsPath, RULES_TABS, SERVICE_PARTS } from '@/features/services';
import { legacyTarget } from './legacyRedirects';

type Case = [name: string, pathname: string, search: string, target: string | null];

const SERVICES: Case[] = [
  ['the bare Services page', '/services', '', '/products?view=all'],
  ['an empty query', '/services', '?', '/products?view=all'],
  ['a trailing slash', '/services/', '', '/products?view=all'],
  ['another letter case', '/Services', '', '/products?view=all'],
  [
    'text, type and below floor (the services that need attention)',
    '/services',
    '?q=AT%26T&type=imei&belowFloor=true',
    '/products?view=all&q=AT%26T&type=imei&show=attention',
  ],
  [
    'a page and a sort: the sort is dropped',
    '/services',
    '?page=2&sort=cost&dir=desc',
    '/products?view=all&page=2',
  ],
  [
    'the disabled filter, which is the Switched off chip',
    '/services',
    '?status=disabled',
    '/products?view=all&show=disabled',
  ],
  [
    'the disabled filter between other filters keeps their order',
    '/services',
    '?q=x&status=disabled&page=2',
    '/products?view=all&q=x&show=disabled&page=2',
  ],
  [
    'a chip already in the address wins over the disabled filter',
    '/services',
    '?status=disabled&chip=attention',
    '/products?view=all&show=attention',
  ],
  [
    'a status the old table did not know is dropped',
    '/services',
    '?status=sold&q=x',
    '/products?view=all&q=x',
  ],
  [
    'the Services tab named by its id is the list',
    '/services',
    '?tab=services&q=x',
    '/products?view=all&q=x',
  ],
  [
    'an unknown tab is the list too',
    '/services',
    '?tab=nothing&type=server',
    '/products?view=all&type=server',
  ],
  [
    'the Shop price rules were never a Services tab: the list',
    '/services',
    '?tab=shop-prices&q=x',
    '/products?view=all&q=x',
  ],
  [
    'keys only another view reads are dropped from the list',
    '/services',
    '?q=x&service=4&merchant=2&run=7',
    '/products?view=all&q=x',
  ],
  ['the Categories tab is the groups', '/services', '?tab=categories', '/products?view=groups'],
  [
    'the Rules and groups tab is the merchant price rules',
    '/services',
    '?tab=rules',
    '/products?view=rules&tab=merchant',
  ],
  [
    'the Price resolver tab is the price check',
    '/services',
    '?tab=resolver',
    '/products?view=rules&tab=check',
  ],
  [
    'the price check on a service and a merchant',
    '/services',
    '?tab=resolver&service=4&merchant=12',
    '/products?view=rules&tab=check&service=4&merchant=12',
  ],
  ['the Code inventory tab', '/services', '?tab=inventory', '/products?view=inventory'],
  [
    'the Code inventory by service, status and page',
    '/services',
    '?tab=inventory&status=sold&service=16&page=2',
    '/products?view=inventory&status=sold&service=16&page=2',
  ],
  [
    'a tab that is not the first key',
    '/services',
    '?service=16&tab=inventory',
    '/products?view=inventory&service=16',
  ],
  [
    'a view already in the address is written once',
    '/services',
    '?view=settings&tab=resolver&service=4',
    '/products?view=rules&tab=check&service=4',
  ],
];

const CATALOG_LIST: Case[] = [
  ['the bare Catalog page', '/catalog', '', '/products?view=all'],
  ['an empty query', '/catalog', '?', '/products?view=all'],
  ['a trailing slash', '/catalog/', '', '/products?view=all'],
  ['another letter case', '/Catalog', '', '/products?view=all'],
  [
    'search, type and page keep their names',
    '/catalog',
    '?q=AT%26T&type=imei&page=2',
    '/products?view=all&q=AT%26T&type=imei&page=2',
  ],
  [
    'the category is the group and the supplier is the API',
    '/catalog',
    '?categoryId=3&supplierId=6',
    '/products?view=all&group=3&api=6',
  ],
  ['the Needs attention chip', '/catalog', '?chip=attention', '/products?view=all&show=attention'],
  ['the Not on the shop chip', '/catalog', '?chip=notonshop', '/products?view=all&show=offshop'],
  ['the Switched off chip', '/catalog', '?chip=off', '/products?view=all&show=disabled'],
  ['a chip the table did not know is dropped', '/catalog', '?chip=nothing&q=x', '/products?view=all&q=x'],
  [
    'below floor is a service that needs attention',
    '/catalog',
    '?belowFloor=true&type=server',
    '/products?view=all&show=attention&type=server',
  ],
  ['below floor set to false is no filter', '/catalog', '?belowFloor=false&q=x', '/products?view=all&q=x'],
  [
    'a chip wins over below floor, in the place of the first of the two',
    '/catalog',
    '?belowFloor=true&q=x&chip=off',
    '/products?view=all&show=disabled&q=x',
  ],
  [
    'the sort, the direction and the on-the-shop filter are dropped',
    '/catalog',
    '?sort=cost&dir=desc&shop=on&q=x',
    '/products?view=all&q=x',
  ],
  [
    'keys only another view reads are dropped from the list',
    '/catalog',
    '?q=x&service=4&merchant=2&run=7&tab=nothing',
    '/products?view=all&q=x',
  ],
];

const CATALOG_PANEL: Case[] = [
  ['a service panel is the edit view', '/catalog', '?open=7', '/products?view=edit&id=7'],
  [
    'the Details section is the Overview part',
    '/catalog',
    '?open=7&section=details',
    '/products?view=edit&id=7&part=overview',
  ],
  [
    'the Order form section is the Field part',
    '/catalog',
    '?open=7&section=order-form',
    '/products?view=edit&id=7&part=fields',
  ],
  [
    'the Suppliers section is the API Connection part',
    '/catalog',
    '?open=7&section=suppliers',
    '/products?view=edit&id=7&part=api',
  ],
  [
    'the Prices section is the Set Pricing part',
    '/catalog',
    '?open=7&section=prices',
    '/products?view=edit&id=7&part=pricing',
  ],
  [
    'the Shop page section is the Retail Purchase part',
    '/catalog',
    '?open=7&section=shop',
    '/products?view=edit&id=7&part=shop',
  ],
  [
    'the Activity section is the Activity part',
    '/catalog',
    '?open=7&section=activity',
    '/products?view=edit&id=7&part=activity',
  ],
  [
    'a section that is not known names no part',
    '/catalog',
    '?open=7&section=nothing',
    '/products?view=edit&id=7',
  ],
  [
    'the kind of the table is kept, the filters are dropped',
    '/catalog',
    '?chip=attention&q=unlock&type=server&page=2&open=7&section=prices',
    '/products?view=edit&type=server&id=7&part=pricing',
  ],
  ['an open that is not an id is the list', '/catalog', '?open=abc&q=x', '/products?view=all&q=x'],
  ['an open of zero is the list', '/catalog', '?open=0', '/products?view=all'],
  [
    'the Services page had the panel too',
    '/services',
    '?open=7&section=activity',
    '/products?view=edit&id=7&part=activity',
  ],
];

const CATALOG_ADD: Case[] = [
  ['the Add services flow on a supplier', '/catalog', '?add=6', '/products?view=add&supplier=6'],
  [
    'on a supplier, starting with its groups',
    '/catalog',
    '?add=6&from=groups',
    '/products?view=add&supplier=6&from=groups',
  ],
  [
    'on a supplier, starting with single services',
    '/catalog',
    '?add=6&from=services',
    '/products?view=add&supplier=6&from=services',
  ],
  ["a service of the staff member's own", '/catalog', '?add=new', '/products?view=add'],
  ['an own service has no way to start', '/catalog', '?add=new&from=groups', '/products?view=add'],
  [
    'a way to start that is not known is dropped',
    '/catalog',
    '?add=6&from=nothing',
    '/products?view=add&supplier=6',
  ],
  ['a supplier that is not an id is dropped', '/catalog', '?add=abc', '/products?view=add'],
  [
    'the kind of the table is kept',
    '/catalog',
    '?type=server&add=6',
    '/products?view=add&type=server&supplier=6',
  ],
  [
    'the add flow wins over an open panel',
    '/catalog',
    '?open=7&section=prices&add=new',
    '/products?view=add',
  ],
];

const CATALOG_SETTINGS: Case[] = [
  ['the settings with no tab open the groups', '/catalog', '?view=settings', '/products?view=groups'],
  ['the Categories tab', '/catalog', '?view=settings&tab=categories', '/products?view=groups'],
  [
    'a tab that is not known opens the groups',
    '/catalog',
    '?view=settings&tab=nothing',
    '/products?view=groups',
  ],
  [
    'the Merchant price rules tab',
    '/catalog',
    '?view=settings&tab=rules',
    '/products?view=rules&tab=merchant',
  ],
  [
    'the Shop price rules tab (the address in the mail about shop price changes)',
    '/catalog',
    '?view=settings&tab=shop-prices',
    '/products?view=rules&tab=shop',
  ],
  [
    'the Shop price rules tab with every price change',
    '/catalog',
    '?view=settings&tab=shop-prices&show=all',
    '/products?view=rules&tab=shop&show=all',
  ],
  [
    'the Shop price rules tab with its page and sort',
    '/catalog',
    '?view=settings&tab=shop-prices&show=all&page=2&sort=id&dir=desc',
    '/products?view=rules&tab=shop&show=all&page=2&sort=id&dir=desc',
  ],
  ['the Price resolver tab', '/catalog', '?view=settings&tab=resolver', '/products?view=rules&tab=check'],
  [
    'the Price resolver on a service and a merchant',
    '/catalog',
    '?view=settings&tab=resolver&service=4&merchant=12',
    '/products?view=rules&tab=check&service=4&merchant=12',
  ],
  ['the Code inventory tab', '/catalog', '?view=settings&tab=inventory', '/products?view=inventory'],
  [
    'the Code inventory by service, status and page',
    '/catalog',
    '?view=settings&tab=inventory&status=sold&service=16&page=2',
    '/products?view=inventory&status=sold&service=16&page=2',
  ],
  [
    'a tab with no view names the settings',
    '/catalog',
    '?tab=resolver&service=4',
    '/products?view=rules&tab=check&service=4',
  ],
  [
    'a tab that is not known, with no view, is the list',
    '/catalog',
    '?tab=nothing&q=x',
    '/products?view=all&q=x',
  ],
];

const CATALOG_PUBLISH: Case[] = [
  ['the publish view', '/catalog', '?view=publish', '/products?view=publish'],
  ['one publish run', '/catalog', '?view=publish&run=7', '/products?view=publish&run=7'],
  [
    'a publish run with its table state',
    '/catalog',
    '?view=publish&run=7&page=2&result=refused&state=ready',
    '/products?view=publish&run=7&page=2&result=refused&state=ready',
  ],
  ['the earlier runs, paged', '/catalog', '?view=publish&page=2', '/products?view=publish&page=2'],
];

const STOREFRONT_MOVED: Case[] = [
  ['the Publish tab', '/storefront', '?tab=publish', '/products?view=publish'],
  ['one publish run', '/storefront', '?tab=publish&run=7', '/products?view=publish&run=7'],
  [
    'a publish run with its table state',
    '/storefront',
    '?tab=publish&run=7&page=2&result=refused&state=ready',
    '/products?view=publish&run=7&page=2&result=refused&state=ready',
  ],
  ['the Retail pricing tab', '/storefront', '?tab=pricing', '/products?view=rules&tab=shop'],
  [
    'the Retail pricing tab with every price change',
    '/storefront',
    '?tab=pricing&show=all',
    '/products?view=rules&tab=shop&show=all',
  ],
  [
    'the Retail pricing tab with its page and sort',
    '/storefront',
    '?tab=pricing&show=all&page=2&sort=id&dir=desc',
    '/products?view=rules&tab=shop&show=all&page=2&sort=id&dir=desc',
  ],
  ['the Services on sale tab is the list', '/storefront', '?tab=listings', '/products?view=all'],
  [
    'the Services on sale tab with search, page and sort keeps the search and the page',
    '/storefront',
    '?tab=listings&q=unlock&page=3&sort=title&dir=desc',
    '/products?view=all&q=unlock&page=3',
  ],
  [
    'the Services on sale tab drops what the list does not read',
    '/storefront',
    '?tab=listings&locked=true&q=x',
    '/products?view=all&q=x',
  ],
  [
    'the default tab had no tab in its address: a search',
    '/storefront',
    '?q=unlock',
    '/products?view=all&q=unlock',
  ],
  ['the default tab: a page', '/storefront', '?page=2', '/products?view=all&page=2'],
  ['the default tab: a sort', '/storefront', '?sort=title&dir=asc', '/products?view=all'],
  ['an empty tab is no tab', '/storefront', '?tab=&q=unlock', '/products?view=all&q=unlock'],
  ['a trailing slash', '/storefront/', '?tab=publish&run=7', '/products?view=publish&run=7'],
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
  ['Product / Services itself', '/products', '?view=publish&run=7', null],
  ['the Suppliers page', '/suppliers', '?supplier=2', null],
  ['the start page', '/', '', null],
  ['an address below the old Services page', '/services/5', '', null],
  ['an address below the old Catalog page', '/catalog/5', '?open=7', null],
  ['an address that only starts with the old name', '/services-old', '', null],
  ['an address that only starts with the Catalog name', '/catalogue', '', null],
  ['a Shop content address below the page', '/storefront/5', '?tab=publish', null],
];

const MOVED = [
  ...SERVICES,
  ...CATALOG_LIST,
  ...CATALOG_PANEL,
  ...CATALOG_ADD,
  ...CATALOG_SETTINGS,
  ...CATALOG_PUBLISH,
  ...STOREFRONT_MOVED,
];

describe('legacyTarget', () => {
  describe.each([
    ['Services & pricing', SERVICES],
    ['the Catalog table', CATALOG_LIST],
    ['the Catalog service panel', CATALOG_PANEL],
    ['the Catalog Add services flow', CATALOG_ADD],
    ['the Catalog settings', CATALOG_SETTINGS],
    ['the Catalog publish view', CATALOG_PUBLISH],
    ['the Storefront tabs that moved to Product / Services', STOREFRONT_MOVED],
    ['the Shop content addresses that stay', STOREFRONT_STAYS],
    ['addresses that are not old ones', NOT_OLD],
  ] as const)('%s', (_group, cases) => {
    it.each(cases)('%s: %s%s', (_name, pathname, search, target) => {
      expect(legacyTarget(pathname, search)).toBe(target);
    });
  });

  it('works without a search argument', () => {
    expect(legacyTarget('/services')).toBe('/products?view=all');
    expect(legacyTarget('/catalog')).toBe('/products?view=all');
    expect(legacyTarget('/storefront')).toBeNull();
  });

  it('answers with the same addresses as productsPath (the order of the keys aside)', () => {
    // The keys are compared sorted: the redirect keeps the order of the old address, `productsPath` writes one fixed order.
    const sorted = (address: string | null) => {
      const [path, query = ''] = (address ?? '').split('?');
      const pairs = [...new URLSearchParams(query)].sort(([a], [b]) => a.localeCompare(b));
      return `${path}?${new URLSearchParams(pairs).toString()}`;
    };
    const pairs: [string | null, string][] = [
      [legacyTarget('/catalog', '?q=tool&type=imei'), productsPath({ view: 'all', q: 'tool', type: 'imei' })],
      [
        legacyTarget('/catalog', '?categoryId=3&supplierId=6&page=2'),
        productsPath({ view: 'all', group: 3, api: 6, page: 2 }),
      ],
      [legacyTarget('/catalog', '?chip=notonshop'), productsPath({ view: 'all', show: 'offshop' })],
      [legacyTarget('/services', '?status=disabled'), productsPath({ view: 'all', show: 'disabled' })],
      [
        legacyTarget('/catalog', '?open=7&section=prices'),
        productsPath({ view: 'edit', id: 7, part: 'pricing' }),
      ],
      [
        legacyTarget('/catalog', '?add=6&from=groups'),
        productsPath({ view: 'add', supplier: 6, from: 'groups' }),
      ],
      [legacyTarget('/catalog', '?view=settings&tab=categories'), productsPath({ view: 'groups' })],
      [
        legacyTarget('/catalog', '?view=settings&tab=rules'),
        productsPath({ view: 'rules', tab: 'merchant' }),
      ],
      [
        legacyTarget('/catalog', '?view=settings&tab=resolver'),
        productsPath({ view: 'rules', tab: 'check' }),
      ],
      [
        legacyTarget('/catalog', '?view=settings&tab=shop-prices&show=all'),
        productsPath({ view: 'rules', tab: 'shop', show: 'all' }),
      ],
      [legacyTarget('/catalog', '?view=settings&tab=inventory'), productsPath({ view: 'inventory' })],
      [legacyTarget('/storefront', '?tab=publish&run=7'), productsPath({ view: 'publish', run: 7 })],
      [legacyTarget('/storefront', '?tab=listings&q=x'), productsPath({ view: 'all', q: 'x' })],
    ];
    for (const [target, built] of pairs) expect(sorted(target)).toBe(sorted(built));
  });

  it('only answers with views, parts and tabs the page has', () => {
    for (const [, pathname, search] of MOVED) {
      const target = legacyTarget(pathname, search) ?? '';
      const params = new URLSearchParams(target.split('?')[1]);
      expect(target.startsWith('/products?')).toBe(true);
      expect(PRODUCTS_VIEWS).toContain(params.get('view'));
      if (params.has('part')) expect(SERVICE_PARTS).toContain(params.get('part'));
      if (params.get('view') === 'rules') expect(RULES_TABS).toContain(params.get('tab'));
    }
  });

  it('never answers with an address that is itself an old one', () => {
    for (const [, pathname, search] of MOVED) {
      const target = legacyTarget(pathname, search);
      const [path, query = ''] = (target ?? '').split('?');
      expect(legacyTarget(path, query)).toBeNull();
    }
  });
});
