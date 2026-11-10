// What the mock server keeps for the services feature: the demo's own numbers (a price as a number, a flag as a boolean), which the
// DTO mappers in dto.ts turn into the API's shapes. The mock plays the server, so it works out the floor, the margin and "below floor".
import type {
  InventoryStatus,
  PricingRounding,
  PricingRuleKind,
  PricingRuleScope,
  ServiceField,
  ServiceGroupPrice,
  ServiceOption,
  ServiceType,
} from '../types';

/** A service as the mock server keeps it. */
export type MockService = {
  id: number;
  code: string;
  name: string;
  type: ServiceType;
  categoryId: number;
  cost: number;
  /** What the supplier charged before its last change; null when it did not change. */
  costWas: number | null;
  price: number;
  minProfit: number;
  slaMinutes: number;
  supplierId: number | null;
  fallbackId: number | null;
  status: 'active' | 'disabled';
  auto: boolean;
  fields: ServiceField[];
  options: ServiceOption[];
  groupPrices: ServiceGroupPrice[];
};

/** A category as the mock server keeps it. */
export type MockCategory = {
  id: number;
  name: string;
  type: ServiceType;
  allowedGroupIds: number[];
  sort: number;
  isActive: boolean;
};

/** A merchant group (the demo's `GROUPS`), with its discount in percent. */
export type MockGroup = { id: number; name: string; kind: string; discountPercent: number };

/** A merchant, only as far as pricing needs it: its name and group. */
export type MockMerchant = { id: number; name: string; groupId: number };

/** A pricing rule as the mock server keeps it; amounts are numbers. */
export type MockRule = {
  id: number;
  scope: PricingRuleScope;
  targetId: number | null;
  groupId: number | null;
  kind: PricingRuleKind;
  percent: number;
  fixed: number;
  rounding: PricingRounding;
  minProfit: number;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

/** A stock code as the mock server keeps it. */
export type MockCode = {
  id: number;
  serviceId: number;
  /** The whole code; the API only ever sends it masked. */
  code: string;
  status: InventoryStatus;
  orderId: number | null;
  batchRef: string;
  createdAt: string;
};
