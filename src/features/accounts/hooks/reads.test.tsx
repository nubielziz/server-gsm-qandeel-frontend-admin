// Tests for the reads of the accounts feature, run through the app's providers against the dev mock API: the record (and its 404), the list
// with its filters and sort, the counts, the ranks, the wallet and its statement, and the open count of the data requests. A hook never
// shows one account's data under another's id.
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { SEED } from '../test/apiSupport';
import { AppWrapper } from '../test/AppWrapper';
import { installAccountMocks } from '../test/installAccountMocks';
import { useAccount } from './useAccount';
import { useAccountCounts } from './useAccountCounts';
import { useAccountsList } from './useAccountsList';
import { useAccountStatement, useAccountWallet } from './useAccountWallet';
import { useOpenRequestCount } from './useDataRequests';
import { useRanks } from './useRanks';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

describe('useAccount', () => {
  it('reads one account, and says not found for a 404', async () => {
    const found = renderHook(() => useAccount(SEED.ZAIN), { wrapper: AppWrapper });
    await waitFor(() => expect(found.result.current.account?.name).toBe('Zain Mobile Hub'));
    expect(found.result.current.notFound).toBe(false);
    const missing = renderHook(() => useAccount(9999), { wrapper: AppWrapper });
    await waitFor(() => expect(missing.result.current.notFound).toBe(true));
    expect(missing.result.current.account).toBeUndefined();
  });

  it('reads nothing while the address holds no usable id', () => {
    const { result } = renderHook(() => useAccount(undefined), { wrapper: AppWrapper });
    expect(result.current.account).toBeUndefined();
    expect(result.current.notFound).toBe(false);
  });
});

describe('useAccountsList', () => {
  it('reads one page of the accounts that match the filters, in the order asked for, with the total', async () => {
    const { result } = renderHook(
      () =>
        useAccountsList({
          filters: { rankKind: 'merchant', status: 'active' },
          page: 1,
          pageSize: 5,
          sort: { field: 'name', order: 'asc' },
        }),
      { wrapper: AppWrapper },
    );
    await waitFor(() => expect(result.current.accounts).toHaveLength(5));
    expect(result.current.total).toBe(18);
    expect(result.current.accounts.map((account) => account.name)).toEqual([
      'Al-Noor Telecom',
      'Algiers Service Plus',
      'Basra Unlock Center',
      'Beirut Unlock Co',
      'Cairo GSM Lab',
    ]);
  });
});

describe('useAccountCounts', () => {
  it('reads the counts once, and not before it is allowed', async () => {
    const waiting = renderHook(() => useAccountCounts(false), { wrapper: AppWrapper });
    expect(waiting.result.current.data).toBeUndefined();
    const { result } = renderHook(() => useAccountCounts(), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.data?.all).toBe(51));
  });
});

describe('useRanks', () => {
  it('reads every rank in the server’s order', async () => {
    const { result } = renderHook(() => useRanks(), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.ranks).toHaveLength(4));
    expect(result.current.ranks.map((rank) => rank.name)).toEqual([
      'Standard',
      'Wholesale',
      'VIP',
      'Storefront retail',
    ]);
    expect(result.current.total).toBe(4);
  });
});

describe('useAccountWallet and useAccountStatement', () => {
  it('reads the live wallet and a page of the statement', async () => {
    const wallet = renderHook(() => useAccountWallet(SEED.DANIEL), { wrapper: AppWrapper });
    await waitFor(() => expect(wallet.result.current.data?.balance).toBe('50.0000'));
    const statement = renderHook(
      () =>
        useAccountStatement({
          accountId: SEED.DANIEL,
          page: 1,
          pageSize: 10,
          sort: { field: 'createdAt', order: 'desc' },
        }),
      { wrapper: AppWrapper },
    );
    await waitFor(() => expect(statement.result.current.data?.total).toBe(1));
  });

  it('does not ask while it is not enabled', () => {
    const { result } = renderHook(() => useAccountWallet(SEED.DANIEL, false), { wrapper: AppWrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useOpenRequestCount', () => {
  it('counts the requests still to do', async () => {
    const { result } = renderHook(() => useOpenRequestCount(), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.data).toBe(1));
  });
});
