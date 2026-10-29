// Mock of the ledger routes (`/admin/ledger/transactions*`): journal entries with their lines, filtered by `refType` and `refId`.
import type { HttpHandler } from 'msw';
import { ledgerStore } from '../ledger';
import { readHandlers } from './accessShared';

export const ledgerHandlers: HttpHandler[] = readHandlers({
  base: '/admin/ledger/transactions',
  what: 'journal entry',
  searchFields: ['memo', 'kind'],
  source: async () => ({ rows: (await ledgerStore()).list(), toDto: (row) => row }),
});
