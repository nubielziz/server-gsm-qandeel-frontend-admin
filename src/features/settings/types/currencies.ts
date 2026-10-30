// Types for the currencies (`/admin/currencies`) and the exchange-rate refresh. Assumed contracts built from `CurrencyRow`.
import type { Decimal, IsoDateTime } from '@/lib/api';
import type { CurrencyRow } from '@/lib/api/schema.gen';

/**
 * One currency as `GET /admin/currencies` sends it. `rateToBase` is read as "units of this currency for 1 US dollar"
 * (the demo's "Per $1"). Assumed contract: the server may add `isStale`, its own call on an old rate; without it the
 * console uses the dashboard's rule (older than 24 hours).
 */
export type Currency = CurrencyRow & { isStale?: boolean };

/** Body of `POST /admin/currencies` (assumed contract). */
export type CreateCurrencyBody = {
  code: string;
  name: string;
  rateToBase: Decimal;
  markupPercent: Decimal;
  charmRounding: boolean;
  isStorefront: boolean;
  decimals: number;
};

/** Body of `PATCH /admin/currencies/:id`: only the fields that change (the "Offered" switch sends `{ isStorefront }`). */
export type UpdateCurrencyBody = Partial<CreateCurrencyBody> & { isActive?: boolean };

/** One currency the refresh updated. */
export type RefreshedRate = { code: string; rateToBase: Decimal; rateUpdatedAt: IsoDateTime };

/** One currency the refresh could not update, with the server's reason. */
export type FailedRate = { code: string; message: string };

/**
 * Answer of `POST /admin/currencies/refresh-fx` (assumed contract): what changed and what did not. `source` names where the
 * rates came from. Every part may be missing; the dialog shows what the server sent.
 */
export type RefreshFxResult = {
  refreshed?: RefreshedRate[];
  failed?: FailedRate[];
  source?: string;
};
