// Types for the payment methods (`/admin/payment-gateways`): the gateway row the Payment methods tab shows and the bodies of
// create and edit. The map gives the table, not the bodies, so these are assumed contracts built from `PaymentGatewayRow`.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { PaymentGatewayRow } from '@/lib/api/schema.gen';

/** Who may pay with the gateway: the storefront's customers (B2C), the API merchants (B2B) or both (assumed values). */
export type GatewayAudience = 'b2c' | 'b2b' | 'both';

/**
 * One payment gateway as `GET /admin/payment-gateways` sends it. `audience` is narrowed to the three values above.
 * Assumed contract: `secretHint` says only that a secret is stored (for example `••••4f2a`), never the secret itself;
 * `volume30d` is the money taken through the gateway in the last 30 days (the demo's "Volume, 30 days").
 */
export type PaymentGateway = Omit<PaymentGatewayRow, 'audience' | 'updatedAt'> & {
  audience: GatewayAudience;
  updatedAt?: IsoDateTime;
  secretHint?: string | null;
  volume30d?: Money | null;
};

/**
 * Body of `POST /admin/payment-gateways` (assumed contract). `secret` is write-only: the server stores it and never
 * sends it back, so an edit leaves it out unless a new one is typed.
 */
export type CreateGatewayBody = {
  code: string;
  driver: string;
  name: string;
  audience: GatewayAudience;
  feePercent: string;
  feeFixed: Money;
  minAmount: Money;
  maxAmount: Money;
  allowedGroupIds: Id[];
  supportsRefunds: boolean;
  supports3ds: boolean;
  isManual: boolean;
  instructions: string;
  holdHours: number;
  isActive: boolean;
  secret?: string;
};

/** Body of `PATCH /admin/payment-gateways/:id`: only the fields that change (the on/off switch sends `{ isActive }`). */
export type UpdateGatewayBody = Partial<CreateGatewayBody>;
