// The API side of the System health mock's fixed cast: the surfaces and how a trouble hurts each, the endpoints that can
// be slow and the error groups. Plain tables; the builders turn them into the contract's DTOs. Dev and tests only.

// ---- API surfaces (calm values per minute: requests at the daily peak, latency in ms, rates in percent) ----

export type SurfaceSpec = {
  key: string;
  label: string;
  rpm: number;
  p50: number;
  p95: number;
  p99: number;
  rate4xx: number;
  rate5xx: number;
  count429: number;
};

export const SURFACES: SurfaceSpec[] = [
  {
    key: 'v1',
    label: 'Merchant API v1',
    rpm: 96,
    p50: 120,
    p95: 340,
    p99: 780,
    rate4xx: 3.1,
    rate5xx: 0.06,
    count429: 3,
  },
  {
    key: 'dhru',
    label: 'Dhru Fusion API',
    rpm: 142,
    p50: 150,
    p95: 410,
    p99: 900,
    rate4xx: 2.4,
    rate5xx: 0.09,
    count429: 2,
  },
  {
    key: 'client',
    label: 'Client app',
    rpm: 58,
    p50: 70,
    p95: 210,
    p99: 480,
    rate4xx: 4.6,
    rate5xx: 0.04,
    count429: 0,
  },
  {
    key: 'store',
    label: 'Storefront',
    rpm: 41,
    p50: 90,
    p95: 290,
    p99: 620,
    rate4xx: 5.8,
    rate5xx: 0.07,
    count429: 1,
  },
  {
    key: 'admin',
    label: 'Admin console',
    rpm: 18,
    p50: 85,
    p95: 330,
    p99: 760,
    rate4xx: 1.1,
    rate5xx: 0.03,
    count429: 0,
  },
  {
    key: 'hooks',
    label: 'Incoming webhooks',
    rpm: 24,
    p50: 60,
    p95: 180,
    p99: 420,
    rate4xx: 0.9,
    rate5xx: 0.02,
    count429: 0,
  },
];

/**
 * How a scenario hurts one surface: the median and the 95th-percentile latency are multiplied (the 99th follows the 95th),
 * `rate5xx` is the rate in percent it climbs to, `traffic` a factor on the requests.
 */
export type Stress = { p50: number; p95: number; rate5xx: number; traffic?: number };

export const SURFACE_STRESS = {
  degraded: {
    v1: { p50: 4.5, p95: 6, rate5xx: 1.1 },
    dhru: { p50: 2, p95: 2.9, rate5xx: 1.6 },
  },
  outage: {
    v1: { p50: 20, p95: 28, rate5xx: 20, traffic: 0.55 },
    dhru: { p50: 20, p95: 28, rate5xx: 22, traffic: 0.5 },
    client: { p50: 16, p95: 22, rate5xx: 16, traffic: 0.6 },
    store: { p50: 18, p95: 25, rate5xx: 18, traffic: 0.5 },
    admin: { p50: 12, p95: 12, rate5xx: 6, traffic: 0.8 },
    hooks: { p50: 22, p95: 30, rate5xx: 30, traffic: 0.7 },
  },
} as const satisfies Record<string, Record<string, Stress>>;

export type EndpointSpec = { method: string; path: string; surface: string; p95: number; rpm: number };

/** Candidates for "slowest endpoints"; the top ten by p95 are sent. */
export const ENDPOINTS: EndpointSpec[] = [
  { method: 'GET', path: '/admin/reports/finance', surface: 'admin', p95: 780, rpm: 0.4 },
  { method: 'GET', path: '/admin/ledger/transactions', surface: 'admin', p95: 610, rpm: 1.2 },
  { method: 'GET', path: '/admin/audit-logs', surface: 'admin', p95: 560, rpm: 0.8 },
  { method: 'POST', path: '/v1/orders', surface: 'v1', p95: 520, rpm: 41 },
  { method: 'GET', path: '/admin/orders', surface: 'admin', p95: 470, rpm: 3.1 },
  { method: 'POST', path: '/store/v1/checkout', surface: 'store', p95: 455, rpm: 2.6 },
  { method: 'POST', path: '/dhru/api/index.php', surface: 'dhru', p95: 430, rpm: 118 },
  { method: 'GET', path: '/client/v1/wallet/ledger', surface: 'client', p95: 380, rpm: 4.4 },
  { method: 'GET', path: '/client/v1/orders', surface: 'client', p95: 240, rpm: 12 },
  { method: 'POST', path: '/hooks/card-gateway', surface: 'hooks', p95: 235, rpm: 5.2 },
  { method: 'GET', path: '/store/v1/services', surface: 'store', p95: 210, rpm: 18 },
  { method: 'GET', path: '/v1/orders/:id', surface: 'v1', p95: 190, rpm: 33 },
];

export type ErrorSpec = {
  code: string;
  status: number;
  method: string;
  endpoint: string;
  surface: string;
  /** Steady groups: how many in 24 hours (scaled to the range). */
  per24h?: number;
  /** Trouble groups: how many per minute since the trouble began. */
  perMin?: number;
  /** The Sentry issue number of a server error. */
  sentry?: number;
  /** Only while this part of the story is on. */
  when?: 'slow' | 'outage' | 'maintenance';
};

export const ERRORS: ErrorSpec[] = [
  {
    code: 'INSUFFICIENT_FUNDS',
    status: 402,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    per24h: 142,
  },
  { code: 'RATE_LIMITED', status: 429, method: 'POST', endpoint: '/v1/orders', surface: 'v1', per24h: 88 },
  {
    code: 'INVALID_IMEI',
    status: 422,
    method: 'POST',
    endpoint: '/dhru/api/index.php',
    surface: 'dhru',
    per24h: 71,
  },
  {
    code: 'VALIDATION_FAILED',
    status: 422,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    per24h: 64,
  },
  {
    code: 'UNAUTHORIZED',
    status: 401,
    method: 'GET',
    endpoint: '/client/v1/me',
    surface: 'client',
    per24h: 41,
  },
  {
    code: 'PAYMENT_DECLINED',
    status: 402,
    method: 'POST',
    endpoint: '/store/v1/checkout',
    surface: 'store',
    per24h: 33,
  },
  {
    code: 'NOT_FOUND',
    status: 404,
    method: 'GET',
    endpoint: '/store/v1/services/:slug',
    surface: 'store',
    per24h: 26,
  },
  {
    code: 'WEBHOOK_SIGNATURE_INVALID',
    status: 400,
    method: 'POST',
    endpoint: '/hooks/card-gateway',
    surface: 'hooks',
    per24h: 6,
  },
  {
    code: 'SUPPLIER_TIMEOUT',
    status: 504,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    per24h: 4,
    sentry: 4821,
  },
  {
    code: 'INTERNAL_ERROR',
    status: 500,
    method: 'GET',
    endpoint: '/admin/reports/finance',
    surface: 'admin',
    per24h: 2,
    sentry: 4790,
  },
  // The slow supplier: its timeouts reach the merchants who order through it.
  {
    code: 'SUPPLIER_TIMEOUT',
    status: 504,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    perMin: 6.5,
    sentry: 4821,
    when: 'slow',
  },
  {
    code: 'SUPPLIER_TIMEOUT',
    status: 504,
    method: 'POST',
    endpoint: '/dhru/api/index.php',
    surface: 'dhru',
    perMin: 9.5,
    sentry: 4822,
    when: 'slow',
  },
  {
    code: 'SUPPLIER_UNAVAILABLE',
    status: 502,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    perMin: 2.5,
    sentry: 4903,
    when: 'slow',
  },
  // The database is down: nearly everything fails.
  {
    code: 'DATABASE_UNAVAILABLE',
    status: 503,
    method: 'POST',
    endpoint: '/v1/orders',
    surface: 'v1',
    perMin: 310,
    sentry: 4977,
    when: 'outage',
  },
  {
    code: 'DATABASE_UNAVAILABLE',
    status: 503,
    method: 'POST',
    endpoint: '/dhru/api/index.php',
    surface: 'dhru',
    perMin: 420,
    sentry: 4978,
    when: 'outage',
  },
  {
    code: 'DATABASE_UNAVAILABLE',
    status: 503,
    method: 'GET',
    endpoint: '/client/v1/orders',
    surface: 'client',
    perMin: 150,
    sentry: 4979,
    when: 'outage',
  },
  {
    code: 'DATABASE_UNAVAILABLE',
    status: 503,
    method: 'POST',
    endpoint: '/store/v1/checkout',
    surface: 'store',
    perMin: 66,
    sentry: 4980,
    when: 'outage',
  },
  {
    code: 'INTERNAL_ERROR',
    status: 500,
    method: 'POST',
    endpoint: '/hooks/card-gateway',
    surface: 'hooks',
    perMin: 58,
    sentry: 4981,
    when: 'outage',
  },
  // Checkout maintenance answers 503 MAINTENANCE on purpose.
  {
    code: 'MAINTENANCE',
    status: 503,
    method: 'POST',
    endpoint: '/store/v1/checkout',
    surface: 'store',
    perMin: 1.5,
    when: 'maintenance',
  },
];
