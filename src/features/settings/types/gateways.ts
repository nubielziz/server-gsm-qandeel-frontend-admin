// Types for the payment methods (`/admin/payment-gateways`): the gateway row the Payment methods tab shows and the bodies of
// create and edit. The map gives the table, not the bodies, so these are assumed contracts built from `PaymentGatewayRow`.
// The ready-made methods (`/admin/payment-gateway-presets`) and the logo keys are a backend addition (B232, MISMATCHES M266).
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { PaymentGatewayRow } from '@/lib/api/schema.gen';

/** Who may pay with the gateway: the storefront's customers (B2C), the API merchants (B2B) or both (assumed values). */
export type GatewayAudience = 'b2c' | 'b2b' | 'both';

/**
 * One payment gateway as `GET /admin/payment-gateways` sends it. `audience` is narrowed to the three values above.
 * Contract (backend `gateways.contracts.ts`): `secretHint`, `webhookSecretHint` and `secondaryWebhookSecretHint` say only that a secret is stored (for example `••••4f2a`), never the secret itself;
 * `volume30d` is the money taken through the gateway in the last 30 days (the demo's "Volume, 30 days").
 * Backend addition (B232): `preset` is the key of the ready-made method it was made from (`null` for a custom one), and `logoUrl` the
 * public path of the logo staff uploaded (`/store/v1/media/<name>`, `null` when none).
 */
export type PaymentGateway = Omit<PaymentGatewayRow, 'audience' | 'updatedAt'> & {
  audience: GatewayAudience;
  updatedAt?: IsoDateTime;
  secretHint?: string | null;
  /** `••••` and the last 4 characters of the first webhook signing secret; `null` when none is stored (the gateway's confirmations are then refused). */
  webhookSecretHint?: string | null;
  /** The same for the second webhook secret (a second endpoint, or the new secret while rotating); `null` when none. */
  secondaryWebhookSecretHint?: string | null;
  volume30d?: Money | null;
  preset: string | null;
  logoUrl: string | null;
};

/** Manual (a person checks each payment) or automatic (a gateway confirms it). */
export type GatewayPresetKind = 'manual' | 'automatic';

/** The top-up word a method stands for (the backend's top-up vocabulary). */
export type GatewayMethodType = 'bank' | 'card' | 'usdt' | 'wise';

/**
 * One entry of the catalog of ready-made methods, as `GET /admin/payment-gateway-presets` sends it (backend addition, B232).
 * `available` is false for an entry that is shown but cannot be added yet; `instructions` is the template of the transfer details,
 * with blanks for the account (empty for an automatic entry).
 */
export type GatewayPreset = {
  key: string;
  name: string;
  kind: GatewayPresetKind;
  available: boolean;
  driver: string;
  methodType: GatewayMethodType;
  instructions: string;
};

/**
 * Body of `POST /admin/payment-gateways` (assumed contract). `code` is left out by the console (decision 036; backend decision 077): the
 * server makes it, from the name of a custom method (lower-case letters, digits and underscores) or from the key of a ready-made one,
 * with `_2`, `_3` when taken, and sends it back; it is optional here, and an older client may still send one. `secret` is write-only: the server stores it and never
 * sends it back, so an edit leaves it out unless a new one is typed. `webhookSecret` (the key the gateway signs its webhooks with)
 * is write-only too and replaces the first stored one; `secondaryWebhookSecret` sets the second one (a second endpoint or rotation),
 * `null` removes it, and the server answers 422 on that field when no first secret exists or is sent.
 */
export type CreateGatewayBody = {
  code?: string;
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
  webhookSecret?: string;
  secondaryWebhookSecret?: string | null;
  /** The key of the ready-made method this one is made from (backend addition, B232); left out for a custom method. */
  preset?: string;
};

/** Body of `PATCH /admin/payment-gateways/:id`: only the fields that change (the on/off switch sends `{ isActive }`). A preset never changes. */
export type UpdateGatewayBody = Partial<Omit<CreateGatewayBody, 'preset'>>;
