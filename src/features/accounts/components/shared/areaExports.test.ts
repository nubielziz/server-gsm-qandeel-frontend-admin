// Tests for what each area folder exports. The part registry, the view registry and the dialog host import these names, so an area never
// renames an export.
import { describe, expect, it } from 'vitest';

const AREAS: Record<string, string[]> = {
  overview: ['OverviewPart'],
  profile: ['ProfilePart'],
  status: ['SuspendDialog', 'ReactivateDialog'],
  rank: ['RankChangeDialog'],
  wallet: [
    'FinancialPart',
    'StatementPart',
    'AdjustWalletDialog',
    'FreezeWalletDialog',
    'UnfreezeWalletDialog',
    'CreditLimitDialog',
  ],
  billing: ['InvoicesPart', 'PaymentsPart'],
  apikeys: ['ApiPart'],
  prices: ['PricesPart'],
  security: ['SecurityPart', 'PasswordDialog', 'SignOutDialog', 'Reset2faDialog', 'MakeAccountDialog'],
  create: ['AddAccountView'],
  privacy: ['PrivacyPart', 'BlockDialog', 'UnblockDialog', 'ExportDialog', 'AnonymizeDialog'],
  requests: ['DataRequestsView'],
  ranks: ['RanksView', 'AddRankView', 'EditRankView'],
  orders: ['OrdersPart'],
  support: ['SupportPart'],
  audit: ['ActivityPart'],
};

// The folders are imported by path from this file's folder.
const LOADERS: Record<string, () => Promise<Record<string, unknown>>> = {
  overview: () => import('../overview'),
  profile: () => import('../profile'),
  status: () => import('../status'),
  rank: () => import('../rank'),
  wallet: () => import('../wallet'),
  billing: () => import('../billing'),
  apikeys: () => import('../apikeys'),
  prices: () => import('../prices'),
  security: () => import('../security'),
  create: () => import('../create'),
  privacy: () => import('../privacy'),
  requests: () => import('../requests'),
  ranks: () => import('../ranks'),
  orders: () => import('../orders'),
  support: () => import('../support'),
  audit: () => import('../audit'),
};

describe('the area folders', () => {
  it('are the sixteen of the layout', () => {
    expect(Object.keys(LOADERS).sort()).toEqual(Object.keys(AREAS).sort());
    expect(Object.keys(AREAS)).toHaveLength(16);
  });

  it.each(Object.entries(AREAS))('%s exports %j', async (area, names) => {
    const loaded = await LOADERS[area]!();
    for (const name of names) expect(typeof loaded[name], `${area}/${name}`).toBe('function');
  });
});
