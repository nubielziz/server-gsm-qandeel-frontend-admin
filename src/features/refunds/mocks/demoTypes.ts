// The demo objects the refunds mocks read from the demo seed (`S.refunds`, `S.disputes`, `S.orders`, `S.customers`, `S.tickets`,
// `S.legal`), typed for the fields the mocks use. Shapes are the demo's, not the API's: `seed.ts` maps them to DTOs.

export type DemoRefund = {
  id: string;
  oid: string;
  cid: string;
  amount: number;
  cur: string;
  reason: string;
  method: 'original' | 'manual';
  status: 'requested' | 'completed' | 'failed' | 'rejected';
  created: number;
  by: string;
  auto: boolean;
  note: string;
  gw: string | null;
  partial: boolean;
};

export type DemoDispute = {
  id: string;
  oid: string;
  cid: string;
  amount: number;
  cur: string;
  fee: number;
  code: string;
  note: string;
  status: 'needs_response' | 'under_review' | 'won' | 'lost';
  opened: number;
  due: number;
  submittedAt: number | null;
  resolvedAt: number | null;
};

/** An order of the demo; the storefront ones (`cid`) carry the payment, the gross and the gateway fee. */
export type DemoOrder = {
  id: string;
  cid?: string;
  created: number;
  status: string;
  price: number;
  cost: number;
  tax?: number;
  gross?: number;
  fee?: number;
  cur?: string;
  fx?: number;
  doneAt: number | null;
  reply: string | null;
  token: string;
  pay: {
    method: 'card' | 'wallet' | 'crypto';
    status: 'captured' | 'refunded' | 'partial_refund' | 'disputed' | 'chargeback';
    ref: string;
    threeDS: boolean;
    brand: string;
  };
};

export type DemoCustomer = { id: string; name: string; email: string; optIn: boolean };

export type DemoTicket = {
  id: string;
  subject: string;
  oid: string | null;
  created: number;
  who: { type: string; id: string };
};

export type DemoLegal = { type: string; version: string; lang: string; current: boolean };
