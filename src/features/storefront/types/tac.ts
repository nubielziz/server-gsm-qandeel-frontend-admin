// Types of the TAC catalogue tab (new in the map, not in the demo): an entry of `GET /admin/tac-catalog` and the bodies
// of its endpoints. The shapes beyond the generated row (`tac_catalog`) are assumed contracts (listed in HANDOFF.md).
import type { TacCatalogRow } from '@/lib/api/schema.gen';

/** One TAC: the first 8 digits of an IMEI, and the phone they belong to. */
export type TacEntry = Pick<
  TacCatalogRow,
  'id' | 'tac' | 'brand' | 'model' | 'marketingName' | 'releaseYear' | 'source'
>;

/** Body of `POST /admin/tac-catalog` (assumed contract). */
export type CreateTacBody = {
  tac: string;
  brand: string;
  model: string;
  marketingName?: string;
  releaseYear?: number;
};

/** Body of `PATCH /admin/tac-catalog/:id` (assumed contract): only the fields that change. */
export type UpdateTacBody = Partial<CreateTacBody>;

/** What `GET /admin/tac-catalog` filters by: `q` (prefix, brand, model) and `brand`. */
export type TacListFilters = {
  q?: string;
  brand?: string;
};
