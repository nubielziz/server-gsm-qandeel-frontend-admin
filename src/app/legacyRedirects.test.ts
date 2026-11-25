// Tests for the old addresses and where they go: one row per case of the table (the Catalog page, Services & pricing, the Storefront tabs
// that moved to Product / Services, the Shop content addresses that must stay, the retired Commissions and Abandoned checkouts pages, the
// Merchants and Customers pages that became Accounts, and the Finance and Refunds & disputes pages that became Money: one row per line of
// the redirect table), plus the checks that the answers are addresses the page knows (`productsPath` writes them, its views, parts and tabs
// are the ones named; `financePath`, `refundsPath` and `moneyPath` write the Money ones; `accountPath`, `accountsListPath`,
// `legacyAccountPath` and `ranksPath` write the Accounts ones).
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_TABS,
  accountPath,
  accountsListPath,
  legacyAccountPath,
  ranksPath,
} from '@/features/accounts';
import { financeInvoicePath, financeJournalPath, financePath, financePaymentPath } from '@/features/finance';
import { MONEY_VIEWS, moneyPath } from '@/features/money';
import { refundsPath } from '@/features/refunds';
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
  // The Landing pages and TAC catalogue tabs are retired (decision 025): their addresses still name a tab, so they stay on Shop content,
  // which opens its first tab. None of them is the old list of services on the shop, whatever list keys it carries.
  ['the retired Landing pages tab', '/storefront', '?tab=landing', null],
  ['the retired Landing pages tab on a page type', '/storefront', '?tab=landing&kind=carrier', null],
  ['the retired Landing pages tab with a search', '/storefront', '?tab=landing&q=unlock', null],
  [
    'the retired Landing pages tab with a search, a page and a sort',
    '/storefront',
    '?tab=landing&kind=model&q=unlock&page=2&sort=title&dir=asc',
    null,
  ],
  ['the retired TAC catalogue tab', '/storefront', '?tab=tac', null],
  ['the retired TAC catalogue tab with a search and a page', '/storefront', '?tab=tac&q=3538&page=2', null],
  ['the retired TAC catalogue tab with a sort', '/storefront', '?tab=tac&sort=brand&dir=asc', null],
  ['the Content and legal tab', '/storefront', '?tab=content', null],
  ['the Help centre tab', '/storefront', '?tab=help', null],
  ['the Search tab', '/storefront', '?tab=search&section=pins&state=on', null],
  ['a tab that is not known names a tab', '/storefront', '?tab=nothing&q=x', null],
  ['a page type with no tab and no list key', '/storefront', '?kind=carrier', null],
  ['an empty tab with a page type and no list key', '/storefront', '?tab=&kind=carrier', null],
];

// The Commissions page is gone; every old address of it, with any tab or filter it had, leads to the ledger of Money and carries nothing.
const COMMISSIONS: Case[] = [
  ['the bare Commissions page', '/commissions', '', '/money?view=ledger'],
  ['an empty query', '/commissions', '?', '/money?view=ledger'],
  ['a trailing slash', '/commissions/', '', '/money?view=ledger'],
  ['another letter case', '/Commissions', '', '/money?view=ledger'],
  [
    'the Accruals tab with its status filter',
    '/commissions',
    '?tab=accruals&status=accrued',
    '/money?view=ledger',
  ],
  ['the Agents tab', '/commissions', '?tab=agents', '/money?view=ledger'],
  ['the Plans tab', '/commissions', '?tab=plans', '/money?view=ledger'],
  [
    'one agent’s ready accruals',
    '/commissions',
    '?agent=3&status=accrued&page=2&sort=amount&dir=desc',
    '/money?view=ledger',
  ],
];

const CHECKOUTS: Case[] = [
  ['the bare Abandoned checkouts page', '/checkouts', '', '/money?view=funnel'],
  ['an empty query', '/checkouts', '?', '/money?view=funnel'],
  ['a trailing slash', '/checkouts/', '', '/money?view=funnel'],
  ['another letter case', '/Checkouts', '', '/money?view=funnel'],
  [
    'the list’s filter, search, page and sort are dropped',
    '/checkouts',
    '?filter=all&q=sam&page=2&sort=grossAmount&dir=desc',
    '/money?view=funnel',
  ],
  ['the funnel period of 90 days', '/checkouts', '?days=90', '/money?view=funnel&range=90'],
  ['the funnel period of 7 days', '/checkouts', '?days=7', '/money?view=funnel&range=7'],
  ['the default period of 30 days leaves no trace', '/checkouts', '?days=30', '/money?view=funnel'],
  ['a period the report does not offer is dropped', '/checkouts', '?days=5', '/money?view=funnel'],
  [
    'the period is kept and the list’s keys are not',
    '/checkouts',
    '?filter=all&days=90&q=x',
    '/money?view=funnel&range=90',
  ],
];

// ---- Finance and Refunds & disputes, which are one Money page (decision 026) ----

// `/finance`: the tab (and a report's `report`) is the view; every other key is carried in its order, because each view reads the keys its
// old tab read.
const FINANCE: Case[] = [
  ['the bare Finance page is the ledger, its first tab', '/finance', '', '/money?view=ledger'],
  ['an empty query', '/finance', '?', '/money?view=ledger'],
  ['a trailing slash', '/finance/', '', '/money?view=ledger'],
  ['another letter case', '/Finance', '', '/money?view=ledger'],
  ['the Ledger tab by name', '/finance', '?tab=ledger', '/money?view=ledger'],
  [
    'the ledger’s search and kind',
    '/finance',
    '?q=hold&kind=order_hold',
    '/money?view=ledger&q=hold&kind=order_hold',
  ],
  ['the ledger filtered to an account kind', '/finance', '?account=bank', '/money?view=ledger&account=bank'],
  ['an open journal entry', '/finance', '?journal=25', '/money?view=ledger&journal=25'],
  [
    'the ledger’s page and sort',
    '/finance',
    '?page=2&sort=id&dir=asc',
    '/money?view=ledger&page=2&sort=id&dir=asc',
  ],
  ['the Deposits tab', '/finance', '?tab=payments', '/money?view=deposits'],
  [
    'the Deposits tab’s status filter',
    '/finance',
    '?tab=payments&status=pending',
    '/money?view=deposits&status=pending',
  ],
  [
    'the Deposits tab with the owner and an open deposit',
    '/finance',
    '?tab=payments&status=all&owner=customer&payment=1048',
    '/money?view=deposits&status=all&owner=customer&payment=1048',
  ],
  ['the Trial balance tab', '/finance', '?tab=accounts', '/money?view=trial-balance'],
  ['the Store balances tab', '/finance', '?tab=wallets', '/money?view=store-balances'],
  [
    'the Store balances tab’s state',
    '/finance',
    '?tab=wallets&state=negative',
    '/money?view=store-balances&state=negative',
  ],
  ['the Invoices tab', '/finance', '?tab=invoices', '/money?view=invoices'],
  [
    'the Invoices tab with a filter and an open invoice',
    '/finance',
    '?tab=invoices&status=void&invoice=7',
    '/money?view=invoices&status=void&invoice=7',
  ],
  ['the Reports tab is the Profit report, its first', '/finance', '?tab=reports', '/money?view=profit'],
  [
    'the Profit report with its range and grouping',
    '/finance',
    '?tab=reports&report=profit&by=client&range=7',
    '/money?view=profit&by=client&range=7',
  ],
  ['the Wallet exposure report', '/finance', '?tab=reports&report=exposure', '/money?view=exposure'],
  [
    'the VAT report with its period',
    '/finance',
    '?tab=reports&report=vat&period=last-quarter',
    '/money?view=vat&period=last-quarter',
  ],
  [
    'the Sales funnel report with its range',
    '/finance',
    '?tab=reports&report=funnel&range=90',
    '/money?view=funnel&range=90',
  ],
  [
    'a report that does not exist is the first report',
    '/finance',
    '?tab=reports&report=nothing',
    '/money?view=profit',
  ],
  ['a tab that does not exist is the ledger', '/finance', '?tab=nothing', '/money?view=ledger'],
  [
    'a report key on a tab that has no reports is dropped',
    '/finance',
    '?tab=payments&report=vat',
    '/money?view=deposits',
  ],
];

// `/refunds`: the tab is the view (Refunds, Card disputes, and the Payments tab is Shop payments); status, method, page, sort and an open
// order are carried.
const REFUNDS: Case[] = [
  ['the bare Refunds page is the Refunds view', '/refunds', '', '/money?view=refunds'],
  ['an empty query', '/refunds', '?', '/money?view=refunds'],
  ['a trailing slash', '/refunds/', '', '/money?view=refunds'],
  ['another letter case', '/Refunds', '', '/money?view=refunds'],
  ['the Refunds tab by name', '/refunds', '?tab=refunds', '/money?view=refunds'],
  [
    'the Refunds tab’s status, from the dashboard and the palette',
    '/refunds',
    '?tab=refunds&status=requested',
    '/money?view=refunds&status=requested',
  ],
  [
    'the Refunds tab’s status and page',
    '/refunds',
    '?tab=refunds&status=failed&page=2',
    '/money?view=refunds&status=failed&page=2',
  ],
  [
    'a status with no tab, and an open order',
    '/refunds',
    '?status=requested&order=20467',
    '/money?view=refunds&status=requested&order=20467',
  ],
  ['the Card disputes tab', '/refunds', '?tab=disputes', '/money?view=disputes'],
  [
    'the Card disputes tab’s sort',
    '/refunds',
    '?tab=disputes&sort=evidenceDueAt&dir=desc',
    '/money?view=disputes&sort=evidenceDueAt&dir=desc',
  ],
  ['the Payments tab is Shop payments', '/refunds', '?tab=payments', '/money?view=shop-payments'],
  [
    'the Payments tab’s method and page',
    '/refunds',
    '?tab=payments&method=card&page=3',
    '/money?view=shop-payments&method=card&page=3',
  ],
  ['a tab that does not exist is the Refunds view', '/refunds', '?tab=nothing', '/money?view=refunds'],
];

// ---- Merchants and Customers, which are one Accounts page ----

// `/merchants`: the Merchants chip. `group` is `rank`; the search, the page and the two sorts stay.
const MERCHANTS_LIST: Case[] = [
  ['the bare Merchants page', '/merchants', '', '/accounts?chip=merchants'],
  ['an empty query', '/merchants', '?', '/accounts?chip=merchants'],
  ['a trailing slash', '/merchants/', '', '/accounts?chip=merchants'],
  ['another letter case', '/Merchants', '', '/accounts?chip=merchants'],
  ['the search', '/merchants', '?q=acme', '/accounts?chip=merchants&q=acme'],
  ['an empty search is no search', '/merchants', '?q=', '/accounts?chip=merchants'],
  ['the group is the rank', '/merchants', '?group=3', '/accounts?chip=merchants&rank=3'],
  ['a group that is not a number is dropped', '/merchants', '?group=abc&q=x', '/accounts?chip=merchants&q=x'],
  ['a page', '/merchants', '?page=2', '/accounts?chip=merchants&page=2'],
  ['the first page leaves no trace', '/merchants', '?page=1', '/accounts?chip=merchants'],
  ['a page that is not a number is dropped', '/merchants', '?page=abc', '/accounts?chip=merchants'],
  ['the sort by status, ascending', '/merchants', '?sort=status', '/accounts?chip=merchants&sort=status'],
  [
    'the sort by status, descending',
    '/merchants',
    '?sort=status&dir=desc',
    '/accounts?chip=merchants&sort=status&dir=desc',
  ],
  ['the sort by name, descending', '/merchants', '?sort=name&dir=desc', '/accounts?chip=merchants&dir=desc'],
  ['the default sort leaves no trace', '/merchants', '?sort=name&dir=asc', '/accounts?chip=merchants'],
  [
    'a sort the old table did not have is dropped, and its direction',
    '/merchants',
    '?sort=spent&dir=desc',
    '/accounts?chip=merchants',
  ],
  ['a direction with no sort is dropped', '/merchants', '?dir=desc', '/accounts?chip=merchants'],
  [
    'the search, the group, the page and the sort together, in the order the page writes them',
    '/merchants',
    '?sort=status&dir=desc&page=2&q=acme&group=3',
    '/accounts?chip=merchants&rank=3&q=acme&sort=status&dir=desc&page=2',
  ],
  [
    'keys only another page reads are dropped',
    '/merchants',
    '?q=x&service=4&run=7&country=JO',
    '/accounts?chip=merchants&q=x',
  ],
  ['the All tab', '/merchants', '?tab=all&q=x', '/accounts?chip=merchants&q=x'],
  ['the Active tab', '/merchants', '?tab=active', '/accounts?chip=merchants'],
  // The Suspended tab lists the suspended merchants: the Merchants population stays and the status is named, so no suspended shop customer appears.
  ['the Suspended tab', '/merchants', '?tab=suspended', '/accounts?chip=merchants&status=suspended'],
  [
    'the Suspended tab keeps the search, the group and the page',
    '/merchants',
    '?tab=suspended&q=acme&group=3&page=2',
    '/accounts?chip=merchants&status=suspended&rank=3&q=acme&page=2',
  ],
  ['the Groups tab is the Ranks view', '/merchants', '?tab=groups', '/accounts?view=ranks'],
  [
    'the Ranks view carries nothing of the merchant table',
    '/merchants',
    '?tab=groups&q=x&group=3&page=2&sort=status',
    '/accounts?view=ranks',
  ],
  ['the retired Pending tab', '/merchants', '?tab=pending', '/accounts?chip=merchants'],
  [
    'the retired Verification tab drops its own keys',
    '/merchants',
    '?tab=verification&kyc=pending&kycStatus=submitted&q=x',
    '/accounts?chip=merchants&q=x',
  ],
  ['a tab that is not known', '/merchants', '?tab=nothing', '/accounts?chip=merchants'],
];

// `/merchants/:id`: a merchant keeps its number; the tab becomes the part of the account's record that has its content.
const MERCHANT_RECORDS: Case[] = [
  ['one merchant', '/merchants/12', '', '/accounts/12'],
  ['an empty query', '/merchants/12', '?', '/accounts/12'],
  ['a trailing slash', '/merchants/12/', '', '/accounts/12'],
  ['another letter case', '/Merchants/12', '', '/accounts/12'],
  ['the Orders tab', '/merchants/12', '?tab=orders', '/accounts/12?tab=orders'],
  ['the Wallet ledger tab', '/merchants/12', '?tab=wallet', '/accounts/12?tab=wallet'],
  ['the Billing tab is the Invoices part', '/merchants/12', '?tab=billing', '/accounts/12?tab=invoices'],
  ['the Pricing tab is the Prices part', '/merchants/12', '?tab=pricing', '/accounts/12?tab=prices'],
  ['the API access tab is the API part', '/merchants/12', '?tab=api', '/accounts/12?tab=api'],
  ['the Profile tab is the Profile part', '/merchants/12', '?tab=profile', '/accounts/12?tab=profile'],
  ['the Security tab', '/merchants/12', '?tab=security', '/accounts/12?tab=security'],
  ['the Audit tab', '/merchants/12', '?tab=audit', '/accounts/12?tab=audit'],
  ['the retired Verification tab opens the first part', '/merchants/12', '?tab=verification', '/accounts/12'],
  ['a tab that is not known opens the first part', '/merchants/12', '?tab=nothing', '/accounts/12'],
  ['a tab of the new record is not an old tab', '/merchants/12', '?tab=invoices', '/accounts/12'],
  [
    'an open order stays open on the Orders part',
    '/merchants/12',
    '?tab=orders&order=48100',
    '/accounts/12?tab=orders&order=48100',
  ],
  ['an open order with no tab', '/merchants/12', '?order=48100', '/accounts/12?order=48100'],
  [
    'an order that is not a number is dropped',
    '/merchants/12',
    '?tab=orders&order=abc',
    '/accounts/12?tab=orders',
  ],
  [
    'the number of a merchant that is not small',
    '/merchants/4021',
    '?tab=billing',
    '/accounts/4021?tab=invoices',
  ],
];

// `/customers`: the Retail chip. The search, the country and the page stay; the old sort has no counterpart and is dropped.
const CUSTOMERS_LIST: Case[] = [
  ['the bare Customers page', '/customers', '', '/accounts?chip=retail'],
  ['an empty query', '/customers', '?', '/accounts?chip=retail'],
  ['a trailing slash', '/customers/', '', '/accounts?chip=retail'],
  ['another letter case', '/Customers', '', '/accounts?chip=retail'],
  ['the search', '/customers', '?q=sam', '/accounts?chip=retail&q=sam'],
  ['the country', '/customers', '?country=JO', '/accounts?chip=retail&country=JO'],
  ['the country in lower case', '/customers', '?country=jo', '/accounts?chip=retail&country=JO'],
  [
    'a country that is not two letters is dropped',
    '/customers',
    '?country=jordan&q=x',
    '/accounts?chip=retail&q=x',
  ],
  ['a page', '/customers', '?page=3', '/accounts?chip=retail&page=3'],
  [
    'the search, the country and the page together, in the order the page writes them',
    '/customers',
    '?page=3&q=sam&country=JO',
    '/accounts?chip=retail&country=JO&q=sam&page=3',
  ],
  [
    'the sort and its direction are dropped',
    '/customers',
    '?sort=totalSpent&dir=desc&q=x',
    '/accounts?chip=retail&q=x',
  ],
  ['the All tab', '/customers', '?tab=all', '/accounts?chip=retail'],
  ['the Active tab', '/customers', '?tab=active', '/accounts?chip=retail'],
  ['the retired Flagged tab', '/customers', '?tab=flagged', '/accounts?chip=retail'],
  ['a tab that is not known', '/customers', '?tab=nothing&q=x', '/accounts?chip=retail&q=x'],
  ['the Suspended tab', '/customers', '?tab=suspended', '/accounts?chip=retail&status=suspended'],
  [
    'the Suspended tab keeps the search, the country and the page',
    '/customers',
    '?tab=suspended&q=sam&country=jo&page=2',
    '/accounts?chip=retail&status=suspended&country=JO&q=sam&page=2',
  ],
  ['the Blocked tab', '/customers', '?tab=blocked', '/accounts?chip=retail&status=blocked'],
  [
    'the Blocked tab keeps the search',
    '/customers',
    '?tab=blocked&q=sam',
    '/accounts?chip=retail&status=blocked&q=sam',
  ],
  ['the Data requests tab', '/customers', '?tab=requests', '/accounts?chip=requests'],
  [
    'the Data requests tab keeps its page and nothing of the customer table',
    '/customers',
    '?tab=requests&status=completed&page=2&q=sam&country=JO&sort=dueAt',
    '/accounts?chip=requests&page=2',
  ],
];

// `/customers/:id`: a customer's number is not an account number, so every record address says `from=customer` and the page asks the server.
const CUSTOMER_RECORDS: Case[] = [
  ['one customer', '/customers/5', '', '/accounts/5?from=customer'],
  ['an empty query', '/customers/5', '?', '/accounts/5?from=customer'],
  ['a trailing slash', '/customers/5/', '', '/accounts/5?from=customer'],
  ['another letter case', '/Customers/5', '', '/accounts/5?from=customer'],
  ['the Orders tab', '/customers/5', '?tab=orders', '/accounts/5?from=customer&tab=orders'],
  [
    'the Account tab is the Security part',
    '/customers/5',
    '?tab=account',
    '/accounts/5?from=customer&tab=security',
  ],
  ['the Wallet tab', '/customers/5', '?tab=wallet', '/accounts/5?from=customer&tab=wallet'],
  ['the Support tab', '/customers/5', '?tab=support', '/accounts/5?from=customer&tab=support'],
  [
    'the Consents tab is the Privacy and risk part',
    '/customers/5',
    '?tab=consents',
    '/accounts/5?from=customer&tab=privacy',
  ],
  [
    'the Risk tab is the Privacy and risk part',
    '/customers/5',
    '?tab=risk',
    '/accounts/5?from=customer&tab=privacy',
  ],
  [
    'a tab that is not known opens the first part',
    '/customers/5',
    '?tab=nothing',
    '/accounts/5?from=customer',
  ],
  ['a tab of the new record is not an old tab', '/customers/5', '?tab=security', '/accounts/5?from=customer'],
  [
    'a customer whose number is also a merchant’s',
    '/customers/12',
    '?tab=wallet',
    '/accounts/12?from=customer&tab=wallet',
  ],
];

// Addresses below the old pages, and ids that are not whole numbers, are not old addresses: the not-found page answers them.
const ACCOUNTS_NOT_OLD: Case[] = [
  ['Accounts itself', '/accounts', '?chip=merchants', null],
  ['one account', '/accounts/12', '?tab=wallet', null],
  ['an old customer number already on the Accounts page', '/accounts/5', '?from=customer', null],
  ['a merchant id that is not a number', '/merchants/abc', '', null],
  ['a merchant id of zero', '/merchants/0', '', null],
  ['a merchant id with a sign', '/merchants/-3', '', null],
  ['a merchant id with letters after the digits', '/merchants/12abc', '', null],
  ['a merchant id with a leading zero', '/merchants/012', '', null],
  ['a merchant id that is too big to be exact', '/merchants/99999999999999999999', '', null],
  ['a customer id that is not a number', '/customers/abc', '', null],
  ['a customer id of zero', '/customers/0', '', null],
  ['an address below a merchant record', '/merchants/12/wallet', '', null],
  ['an address below a customer record', '/customers/5/orders', '?tab=orders', null],
  ['an address that only starts with the Merchants name', '/merchants-old', '', null],
  ['an address that only starts with the Customers name', '/customersx', '', null],
];

const NOT_OLD: Case[] = [
  ['Product / Services itself', '/products', '?view=publish&run=7', null],
  ['the Suppliers page', '/suppliers', '?supplier=2', null],
  ['the start page', '/', '', null],
  ['an address below the old Services page', '/services/5', '', null],
  ['an address below the old Catalog page', '/catalog/5', '?open=7', null],
  ['an address below the old checkouts page', '/checkouts/5', '', null],
  ['an address that only starts with the old checkouts name', '/checkouts-old', '', null],
  ['the Money page itself, with a view', '/money', '?view=vat&period=last-quarter', null],
  ['an address that only starts with the old name', '/services-old', '', null],
  ['an address that only starts with the Catalog name', '/catalogue', '', null],
  ['a Shop content address below the page', '/storefront/5', '?tab=publish', null],
  ['an address below the retired Commissions page', '/commissions/5', '', null],
  ['an address that only starts with the retired name', '/commissions-old', '', null],
  ['the Money overview, which is the page itself', '/money', '', null],
  ['an address below the old Finance page', '/finance/5', '?tab=payments', null],
  ['an address that only starts with the old Finance name', '/finance-old', '', null],
  ['an address below the old Refunds page', '/refunds/5', '', null],
  ['an address that only starts with the old Refunds name', '/refundsx', '', null],
];

const ACCOUNTS_MOVED = [...MERCHANTS_LIST, ...MERCHANT_RECORDS, ...CUSTOMERS_LIST, ...CUSTOMER_RECORDS];

const MONEY_MOVED = [...FINANCE, ...REFUNDS, ...COMMISSIONS, ...CHECKOUTS];

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
    ['the Abandoned checkouts page, which is the Sales funnel view of Money now', CHECKOUTS],
    ['the Shop content addresses that stay', STOREFRONT_STAYS],
    ['the retired Commissions page, which is the ledger of Money now', COMMISSIONS],
    ['the Finance page, which is the Money page now', FINANCE],
    ['the Refunds & disputes page, which is the Money page now', REFUNDS],
    ['the Merchants list, which is the Merchants chip of Accounts', MERCHANTS_LIST],
    ['one merchant, whose number is the account number', MERCHANT_RECORDS],
    ['the Customers list, which is the Retail chip of Accounts', CUSTOMERS_LIST],
    ['one customer, whose number is not an account number', CUSTOMER_RECORDS],
    ['addresses that look like old Merchants and Customers ones and are not', ACCOUNTS_NOT_OLD],
    ['addresses that are not old ones', NOT_OLD],
  ] as const)('%s', (_group, cases) => {
    it.each(cases)('%s: %s%s', (_name, pathname, search, target) => {
      expect(legacyTarget(pathname, search)).toBe(target);
    });
  });

  it.each(['landing', 'tac'])(
    'never reads the retired Shop content tab %s as an old link to the list of services, whatever else the address says',
    (tab) => {
      for (const more of [
        '',
        '&q=x',
        '&page=2',
        '&sort=title&dir=asc',
        '&kind=carrier',
        '&q=x&page=3&sort=tac&dir=desc',
      ]) {
        expect(legacyTarget('/storefront', `?tab=${tab}${more}`)).toBeNull();
      }
    },
  );

  it('works without a search argument', () => {
    expect(legacyTarget('/services')).toBe('/products?view=all');
    expect(legacyTarget('/catalog')).toBe('/products?view=all');
    expect(legacyTarget('/storefront')).toBeNull();
    expect(legacyTarget('/commissions')).toBe('/money?view=ledger');
    expect(legacyTarget('/finance')).toBe('/money?view=ledger');
    expect(legacyTarget('/refunds')).toBe('/money?view=refunds');
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

  it('builds the same funnel addresses as financePath and moneyPath', () => {
    expect(legacyTarget('/checkouts')).toBe(financePath('reports', { report: 'funnel' }));
    expect(legacyTarget('/checkouts', '?days=90')).toBe(
      financePath('reports', { report: 'funnel', range: 90 }),
    );
    expect(legacyTarget('/checkouts', '?days=7')).toBe(
      financePath('reports', { report: 'funnel', range: 7 }),
    );
    expect(legacyTarget('/checkouts', '?days=90')).toBe(moneyPath('funnel', { range: 90 }));
    expect(legacyTarget('/commissions')).toBe(moneyPath('ledger'));
  });

  it('answers the Finance and Refunds addresses with the same addresses as the builders the other pages link with', () => {
    // The keys are written by `moneyPath` in the order the old address had them, so the rows below use the same order.
    expect(legacyTarget('/finance')).toBe(financePath());
    expect(legacyTarget('/finance', '?tab=payments&status=pending')).toBe(
      financePath('payments', { status: 'pending' }),
    );
    expect(legacyTarget('/finance', '?tab=payments&status=all&payment=1048')).toBe(financePaymentPath(1048));
    expect(legacyTarget('/finance', '?journal=25')).toBe(financeJournalPath(25));
    expect(legacyTarget('/finance', '?tab=invoices&invoice=7')).toBe(financeInvoicePath(7));
    expect(legacyTarget('/finance', '?tab=reports&report=vat&period=last-quarter')).toBe(
      financePath('reports', { report: 'vat', period: 'last-quarter' }),
    );
    expect(legacyTarget('/refunds')).toBe(refundsPath());
    expect(legacyTarget('/refunds', '?tab=disputes')).toBe(refundsPath({ tab: 'disputes' }));
    expect(legacyTarget('/refunds', '?tab=refunds&status=requested')).toBe(
      refundsPath({ tab: 'refunds', status: 'requested' }),
    );
    expect(legacyTarget('/refunds', '?tab=payments&method=card')).toBe(
      refundsPath({ tab: 'payments', method: 'card' }),
    );
  });

  it('only answers with views the Money page has, and never with the old tab or report keys', () => {
    const views = MONEY_VIEWS.map((spec) => spec.id);
    for (const [, pathname, search] of MONEY_MOVED) {
      const target = legacyTarget(pathname, search) ?? '';
      expect(target.startsWith('/money?')).toBe(true);
      const params = new URLSearchParams(target.split('?')[1]);
      expect(views).toContain(params.get('view'));
      expect(params.has('tab')).toBe(false);
      expect(params.has('report')).toBe(false);
      expect([...params.keys()].filter((key) => key === 'view')).toHaveLength(1);
    }
  });

  it('answers the Merchants and Customers addresses with the same addresses as the builders of the Accounts feature', () => {
    // The keys are written by `accountsListPath` in its one order, so these are equal as strings, not only as sets.
    expect(legacyTarget('/merchants')).toBe(accountsListPath({ chip: 'merchants' }));
    expect(legacyTarget('/merchants', '?group=3&q=acme&page=2&sort=status&dir=desc')).toBe(
      accountsListPath({ chip: 'merchants', rank: 3, q: 'acme', page: 2, sort: 'status', dir: 'desc' }),
    );
    expect(legacyTarget('/merchants', '?tab=groups')).toBe(ranksPath());
    expect(legacyTarget('/customers')).toBe(accountsListPath({ chip: 'retail' }));
    expect(legacyTarget('/customers', '?q=sam&country=jo&page=3')).toBe(
      accountsListPath({ chip: 'retail', q: 'sam', country: 'JO', page: 3 }),
    );
    expect(legacyTarget('/merchants/12')).toBe(accountPath(12));
    expect(legacyTarget('/merchants/12', '?tab=billing')).toBe(accountPath(12, 'invoices'));
    expect(legacyTarget('/merchants/12', '?tab=orders&order=7')).toBe(
      accountPath(12, 'orders', { order: 7 }),
    );
    expect(legacyTarget('/customers/5')).toBe(legacyAccountPath('customer', 5));
    expect(legacyTarget('/customers/5', '?tab=account')).toBe(legacyAccountPath('customer', 5, 'security'));
  });

  it('only answers with parts the account record has', () => {
    for (const [, pathname, search] of [...MERCHANT_RECORDS, ...CUSTOMER_RECORDS]) {
      const params = new URLSearchParams((legacyTarget(pathname, search) ?? '').split('?')[1]);
      if (params.has('tab')) expect(ACCOUNT_TABS).toContain(params.get('tab'));
    }
  });

  it('lands the merchant tabs that moved on the part with their content: Billing, Pricing and API access get parts of their own', () => {
    const part = (tab: string) =>
      new URLSearchParams((legacyTarget('/merchants/12', `?tab=${tab}`) ?? '').split('?')[1]).get('tab');
    expect([
      part('orders'),
      part('wallet'),
      part('billing'),
      part('pricing'),
      part('api'),
      part('profile'),
      part('security'),
      part('audit'),
    ]).toEqual(['orders', 'wallet', 'invoices', 'prices', 'api', 'profile', 'security', 'audit']);
  });

  it('never sends an old customer number to the account that has the same number', () => {
    // The customers were copied after the merchants, so customer 7 and merchant 7 are two people: the record address of a customer always
    // carries `from=customer`, and the page resolves it. Only a merchant address is a plain account address.
    for (const [, pathname, search] of CUSTOMER_RECORDS) {
      const target = legacyTarget(pathname, search) ?? '';
      expect(new URLSearchParams(target.split('?')[1]).get('from')).toBe('customer');
    }
    for (const [, pathname, search] of MERCHANT_RECORDS) {
      const target = legacyTarget(pathname, search) ?? '';
      expect(new URLSearchParams(target.split('?')[1]).has('from')).toBe(false);
    }
  });

  it('answers a list address with a chip the list page reads and a record address on the Accounts page', () => {
    // The page reads `chip` = retail, merchants, guests, and the first design's suspended, blocked and requests (still read for old bookmarks); and the view `ranks`.
    const readable = new Set(['retail', 'merchants', 'guests', 'suspended', 'blocked', 'requests']);
    for (const [, pathname, search] of [...MERCHANTS_LIST, ...CUSTOMERS_LIST]) {
      const target = legacyTarget(pathname, search) ?? '';
      expect(target.startsWith('/accounts?')).toBe(true);
      const params = new URLSearchParams(target.split('?')[1]);
      if (params.get('view')) expect(params.get('view')).toBe('ranks');
      else expect(readable).toContain(params.get('chip'));
      expect([...params.keys()].sort()).toEqual([...new Set(params.keys())].sort());
    }
    for (const [, pathname, search] of [...MERCHANT_RECORDS, ...CUSTOMER_RECORDS]) {
      expect(legacyTarget(pathname, search)).toMatch(/^\/accounts\/[1-9]\d*(\?|$)/);
    }
  });

  it('never answers with an address that is itself an old one', () => {
    for (const [, pathname, search] of [...MOVED, ...ACCOUNTS_MOVED, ...MONEY_MOVED]) {
      const target = legacyTarget(pathname, search);
      const [path, query = ''] = (target ?? '').split('?');
      expect(legacyTarget(path, query)).toBeNull();
    }
  });
});
