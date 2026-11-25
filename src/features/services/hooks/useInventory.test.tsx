// Tests of what the import and the void keep and drop: the pasted codes are the call's variables, in plain text, so once the dialog lets go
// of the mutation they must be gone (`gcTime: 0`), not kept for the default five minutes; and a change of the stock makes the service
// lists, records and menus stale, because a row carries `stockAvailable`.
import { useList } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { listInventoryCodes } from '../api';
import { AppWrapper } from '../test/AppWrapper';
import type { Service } from '../types';
import { useStockServiceChoices } from './useChoices';
import { useImportCodes, useVoidCodes } from './useInventory';
import { useServiceDetail } from './useServiceDetail';

setupMockApi();

const SECRET = 'UT-8001-SECRET';
const UT = 16; // UnlockTool 1-Day License: seven codes available, four sold, one void

describe('useImportCodes', () => {
  it('drops the plaintext codes from the mutation cache when the dialog lets go of it', async () => {
    await signInAs();
    const { result, unmount } = renderHook(
      () => ({ importCodes: useImportCodes(), client: useQueryClient() }),
      { wrapper: AppWrapper },
    );
    const { client } = result.current;
    const answer = await act(() =>
      result.current.importCodes.mutateAsync({ serviceId: 16, body: { codes: [SECRET] } }),
    );
    expect(answer).toMatchObject({ imported: 1 });
    // While the dialog holds it, the mutation is there with its variables.
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state.variables),
      ),
    ).toContain(SECRET);
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });
});

describe('the services after a change of the stock', () => {
  // The three reads a row of stock is on: a Refine list, the Refine record the editor reads, and the stock menu.
  function rig() {
    return renderHook(
      () => ({
        list: useList<Service>({
          resource: 'services',
          pagination: { currentPage: 1, pageSize: 50 },
          errorNotification: false,
        }),
        one: useServiceDetail(UT),
        menu: useStockServiceChoices(true),
        importCodes: useImportCodes(),
        voidCodes: useVoidCodes(),
      }),
      { wrapper: AppWrapper },
    );
  }
  type Rig = ReturnType<typeof rig>['result'];
  const inList = (result: Rig) =>
    result.current.list.result.data.find((row) => row.id === UT)?.stockAvailable;
  const inRecord = (result: Rig) => result.current.one.detail?.stockAvailable;
  const inMenu = (result: Rig) =>
    result.current.menu.data?.services.find((row) => row.id === UT)?.stockAvailable;

  async function settled(result: Rig, count: number) {
    await waitFor(() => expect(inList(result)).toBe(count));
    await waitFor(() => expect(inRecord(result)).toBe(count));
    await waitFor(() => expect(inMenu(result)).toBe(count));
  }

  it('read the count of available codes again after an import', async () => {
    await signInAs();
    const { result } = rig();
    await settled(result, 7);
    await act(() =>
      result.current.importCodes.mutateAsync({
        serviceId: UT,
        body: { codes: ['UT-9001-AAAA', 'UT-9002-BBBB'] },
      }),
    );
    await settled(result, 9);
  });

  it('read it again after a void, for the services the caller names', async () => {
    await signInAs();
    const { result } = rig();
    await settled(result, 7);
    const ids = (await listInventoryCodes({ filters: { serviceId: UT, status: 'available' } })).data
      .slice(0, 3)
      .map((code) => code.id);
    await act(() => result.current.voidCodes.mutateAsync({ ids, serviceIds: [UT] }));
    await settled(result, 4);
  });
});
