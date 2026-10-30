// Types of the Categories tab and of the two private lookups the pricing screens need (merchant groups and merchants).
// The map gives the tables but no bodies (MISMATCHES M10), so every shape here is an assumed contract.
import type { Id } from '@/lib/api';
import type { ClientGroupRow, ServiceCategoryRow } from '@/lib/api/schema.gen';
import type { NamedRef, ServiceType } from './service';

/**
 * A service category (`GET /admin/service-categories`, assumed contract). `allowedGroupIds` lists the merchant groups
 * that can see it; an empty list is read as "every group". `serviceCount` is optional: when the server counts the
 * services in the category, the table shows it.
 */
export type ServiceCategory = Pick<
  ServiceCategoryRow,
  'id' | 'name' | 'allowedGroupIds' | 'sort' | 'isActive'
> & {
  type: ServiceType;
  serviceCount?: number;
};

/** Body of `POST /admin/service-categories` (assumed contract). */
export type CreateCategoryBody = {
  name: string;
  type: ServiceType;
  allowedGroupIds: Id[];
  sort: number;
  isActive: boolean;
};

/** Body of `PATCH /admin/service-categories/:id` (assumed contract): only the fields that change. */
export type UpdateCategoryBody = Partial<CreateCategoryBody>;

/**
 * A merchant group as the pricing screens need it (assumed contract; the merchants feature owns `GET /admin/client-groups`).
 * `kind` is `b2c_retail` for the storefront's single retail group. `merchantCount` is optional.
 */
export type ClientGroup = Pick<ClientGroupRow, 'id' | 'name' | 'kind' | 'discountPercent'> & {
  merchantCount?: number;
};

/** A merchant as the price resolver's menu needs it (assumed contract; the merchants feature owns `GET /admin/clients`). */
export type MerchantOption = NamedRef & { status?: string; group?: NamedRef | null };
