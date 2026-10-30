// Types for the tax rates (`/admin/tax-rates`): a rate per country with the dates it applies. Assumed contracts built from `TaxRateRow`.
import type { TaxRateRow } from '@/lib/api/schema.gen';

/** One tax rate row as `GET /admin/tax-rates` sends it. A country can have several rows (its history); `validTo` null means no end. */
export type TaxRate = TaxRateRow;

/** Body of `POST /admin/tax-rates` (assumed contract): the row's own fields, ids and dates of creation left out. */
export type CreateTaxRateBody = Pick<
  TaxRateRow,
  | 'country'
  | 'region'
  | 'ratePercent'
  | 'taxType'
  | 'appliesTo'
  | 'validFrom'
  | 'validTo'
  | 'label'
  | 'ossScheme'
>;

/** Body of `PATCH /admin/tax-rates/:id`: only the fields that change. The map offers no delete for tax rates. */
export type UpdateTaxRateBody = Partial<CreateTaxRateBody>;
