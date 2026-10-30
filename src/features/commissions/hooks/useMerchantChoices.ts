// The merchants the assign dialog offers, by name. It reads the merchants feature's list (`listClients`) once and keeps it for a few
// minutes, so the dialog opens with its menu filled. Needs `clients:read`; pass `enabled: false` without it.
import { listClients } from '@/features/merchants';
import { useApiQuery } from '@/lib/query';
import { LOOKUP_STALE_MS, MERCHANT_CAP, MERCHANT_CHOICES_KEY } from './keys';

/** The merchants, alphabetical, up to the menu's cap. */
export function useMerchantChoices(enabled = true) {
  return useApiQuery({
    queryKey: [...MERCHANT_CHOICES_KEY],
    queryFn: ({ signal }) =>
      listClients({ start: 0, end: MERCHANT_CAP, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result) => result.data,
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}
