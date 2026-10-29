/* Data: constants and the seeded synthetic dataset. Everything here is invented demo data. */
const TYPES = ['IMEI', 'Server', 'Remote', 'File'];
const OPEN = ['queued', 'processing', 'review'];
const ORDER_STATUS = {
  queued:     { label: 'Queued',       cls: 'b-neutral', icon: 'clock' },
  processing: { label: 'Processing',   cls: 'b-neutral', icon: 'refresh' },
  review:     { label: 'Needs review', cls: 'b-serious', icon: 'alert' },
  completed:  { label: 'Completed',    cls: 'b-good',    icon: 'checkCircle' },
  rejected:   { label: 'Rejected',     cls: 'b-crit',    icon: 'xCircle' },
};
const ACCOUNTS = [
  { id: 'bank',               name: 'Bank',                 type: 'Asset' },
  { id: 'gateway_clearing',   name: 'Gateway clearing',     type: 'Asset' },
  { id: 'supplier_prepaid',   name: 'Supplier prepaid',     type: 'Asset' },
  { id: 'client_wallet',      name: 'Client wallets',       type: 'Liability' },
  { id: 'client_hold',        name: 'Client holds',         type: 'Liability' },
  { id: 'customer_funds',     name: 'Customer funds',       type: 'Liability' },
  { id: 'vat_payable',        name: 'VAT payable',          type: 'Liability' },
  { id: 'revenue',            name: 'Revenue',              type: 'Income' },
  { id: 'fee_income',         name: 'Fee income',           type: 'Income' },
  { id: 'cogs',               name: 'Cost of goods sold',   type: 'Expense' },
  { id: 'commission_expense', name: 'Commission expense',   type: 'Expense' },
  { id: 'gateway_fees',       name: 'Gateway fees',         type: 'Expense' },
  { id: 'chargeback_loss',    name: 'Chargeback losses',    type: 'Expense' },
  { id: 'adjustments',        name: 'Adjustments',          type: 'Expense' },
  { id: 'owner_capital',      name: 'Owner capital',        type: 'Equity' },
];
const GROUPS = [
  { id: 'std', name: 'Standard',  discount: 0 },
  { id: 'whl', name: 'Wholesale', discount: 0.04 },
  { id: 'vip', name: 'VIP',       discount: 0.08 },
];
const METHODS = {
  bank: { label: 'Bank transfer', fee: 0,    review: true },
  card: { label: 'Card',          fee: 0.03, review: false },
  usdt: { label: 'USDT (TRC20)',  fee: 0.01, review: true },
  wise: { label: 'Wise',          fee: 0,    review: true },
};
const KIND_LABEL = {
  opening: 'Opening balance', deposit: 'Deposit', order_hold: 'Order hold', order_settle: 'Order settled',
  order_release: 'Hold released', adjustment: 'Adjustment', commission: 'Commission', withdrawal: 'Withdrawal',
  supplier_topup: 'Supplier top-up', settlement: 'Gateway settlement',
  b2c_payment: 'Customer payment', gateway_fee: 'Gateway fee', refund: 'Customer refund', chargeback: 'Chargeback',
};
const ME = 'Rami K.';
const ACTOR_ROLE = { 'Rami K.': 'Admin', 'Lina S.': 'Support', 'Omar T.': 'Finance', System: 'System', 'Merchant API': 'API', Customer: 'Customer', 'Risk engine': 'System', 'Payment gateway': 'System' };

const SERVICE_DEFS = [
  // code, name, type, category, cost, markup, sla minutes, supplier, fallback, popularity
  ['IMEI-ICL-CHK', 'iCloud Clean / Lost Check', 'IMEI', 'Apple', 0.08, 0.60, 2, 'sup3', 'sup1', 6],
  ['IMEI-APL-WRN', 'Apple Warranty & Activation Date', 'IMEI', 'Apple', 0.05, 0.80, 1, 'sup3', 'sup1', 4],
  ['IMEI-SAM-INF', 'Samsung Info (KG / FRP / Region)', 'IMEI', 'Samsung', 0.07, 0.70, 2, 'sup3', 'sup1', 4],
  ['IMEI-BLK-CHK', 'Blacklist Status (GSMA)', 'IMEI', 'Generic', 0.04, 1.00, 1, 'sup3', 'sup1', 4],
  ['IMEI-ATT-USA', 'AT&T USA Premier Unlock', 'IMEI', 'Carrier unlock', 13.5, 0.28, 2880, 'sup1', 'sup6', 9],
  ['IMEI-TMO-USA', 'T-Mobile USA Unlock', 'IMEI', 'Carrier unlock', 9.8, 0.30, 1440, 'sup1', 'sup6', 9],
  ['IMEI-VZW-USA', 'Verizon USA Clean Unlock', 'IMEI', 'Carrier unlock', 5.6, 0.35, 720, 'sup6', 'sup1', 8],
  ['IMEI-VOD-UK', 'Vodafone UK iPhone Unlock', 'IMEI', 'Carrier unlock', 7.2, 0.30, 1440, 'sup6', 'sup1', 8],
  ['IMEI-EE-UK', 'EE UK Unlock', 'IMEI', 'Carrier unlock', 6.4, 0.31, 1440, 'sup6', 'sup1', 6],
  ['IMEI-ORG-FR', 'Orange France Unlock', 'IMEI', 'Carrier unlock', 11.2, 0.27, 2880, 'sup1', 'sup6', 3],
  ['IMEI-MDM-PRM', 'MDM Removal, iPhone Premium', 'IMEI', 'Apple', 24, 0.25, 4320, 'sup1', 'sup6', 1.5],
  ['IMEI-ICL-LOST', 'iCloud Lost Mode Removal', 'IMEI', 'Apple', 32, 0.22, 2880, 'sup1', 'sup6', 1.5],
  ['IMEI-SAM-KG', 'Samsung KG Lock Fix', 'IMEI', 'Samsung', 7.5, 0.33, 60, 'sup1', 'sup6', 4],
  ['IMEI-XIA-MI', 'Xiaomi Mi Account Clean', 'IMEI', 'Xiaomi', 4.2, 0.40, 180, 'sup6', 'sup1', 3],
  ['SRV-Z3X-10', 'Z3X Credits x10', 'Server', 'Credits', 8.5, 0.10, 5, 'sup2', null, 6],
  ['SRV-UT-1D', 'UnlockTool 1-Day License', 'Server', 'Licenses', 3.2, 0.25, 5, 'sup2', null, 7],
  ['SRV-CHM-1M', 'Chimera Tool 1 Month', 'Server', 'Licenses', 17, 0.147, 10, 'sup2', null, 3],
  ['SRV-NCK-50', 'NCK Dongle Credits x50', 'Server', 'Credits', 12.6, 0.22, 5, 'sup2', null, 3],
  ['SRV-MBX-20', 'Miracle Box Credits x20', 'Server', 'Credits', 6.1, 0.26, 5, 'sup2', null, 3],
  ['RMT-SAM-FRP', 'Samsung FRP Remote (USB)', 'Remote', 'Remote', 4.8, 0.45, 30, 'sup4', null, 7],
  ['RMT-XIA-MI', 'Xiaomi Mi Account Remote', 'Remote', 'Remote', 6.5, 0.38, 45, 'sup4', null, 4],
  ['RMT-IPH-PAS', 'iPhone Passcode Remote', 'Remote', 'Remote', 18, 0.30, 90, 'sup4', null, 2],
  ['RMT-HUA-ID', 'Huawei ID Remote', 'Remote', 'Remote', 9.2, 0.35, 60, 'sup4', null, 2],
  ['FIL-SAM-CMB', 'Samsung Combination File', 'File', 'Files', 0.9, 0.55, 3, 'sup5', null, 8],
  ['FIL-XIA-EDL', 'Xiaomi EDL Auth File', 'File', 'Files', 2.4, 0.50, 15, 'sup5', null, 4],
  ['FIL-QCM-DMP', 'Qualcomm Dump File', 'File', 'Files', 1.6, 0.60, 10, 'sup5', null, 3],
  ['FIL-HUA-UPD', 'Huawei update.app Firmware', 'File', 'Files', 1.1, 0.45, 5, 'sup5', null, 2],
];
const SUPPLIER_DEFS = [
  // id, name, api, host, status, prepaid left, success %, p50 ms
  ['sup1', 'Nordic GSM',       'Dhru Fusion 6.1', 'api.nordicgsm.example',        'up',       1850,  99.1, 310],
  ['sup2', 'Gulf Server Hub',  'Dhru Fusion 6.1', 'api.gulfserverhub.example',    'up',       38.4,  98.4, 420],
  ['sup3', 'Rapid IMEI',       'REST v2',         'api.rapidimei.example',        'degraded', 640,   61.5, 2380],
  ['sup4', 'RemoteDesk Pro',   'REST v2',         'api.remotedeskpro.example',    'up',       910,   97.6, 640],
  ['sup5', 'FileForge',        'REST v2',         'files.fileforge.example',      'up',       420,   99.4, 520],
  ['sup6', 'Bosphorus Unlock', 'Dhru Fusion 6.1', 'api.bosphorusunlock.example',  'up',       1230,  96.8, 880],
];
const MERCHANT_DEFS = [
  // name, cc, group, status, weight, credit, target balance, joined days ago, referred by (index+1), agent plan
  ['Zain Mobile Hub',      'JO', 'vip', 'active',    1.7, 2000, 1480, 410, 0, 'pl1'],
  ['Al-Noor Telecom',      'SA', 'whl', 'active',    1.3, 1500,  620, 350, 0, null],
  ['Phone Doctor FZE',     'AE', 'vip', 'active',    1.6, 2500, 2260, 300, 0, null],
  ['Basra Unlock Center',  'IQ', 'whl', 'active',    1.0,  800,  215, 260, 0, null],
  ['Cairo GSM Lab',        'EG', 'vip', 'active',    1.5, 1500, 1190, 240, 0, 'pl2'],
  ['Erbil Mobile Parts',   'IQ', 'std', 'active',    0.8,  500,  140, 210, 0, null],
  ['Tripoli Repair Group', 'LY', 'std', 'active',    0.6,  400,   38, 190, 0, null],
  ['Casablanca Unlock',    'MA', 'whl', 'active',    0.9,  800,  310, 150, 1, null],
  ['Lagos Gadget Fix',     'NG', 'std', 'active',    0.8,  500,   95, 120, 1, null],
  ['Karachi Unlock Hub',   'PK', 'whl', 'active',    1.1,  900,  480, 110, 0, null],
  ['Istanbul GSM Care',    'TR', 'whl', 'active',    1.0,  900,  265,  95, 1, null],
  ['Jeddah Tech Bar',      'SA', 'std', 'active',    0.9,  600,  175,  80, 5, null],
  ['Muscat Mobile Clinic', 'OM', 'std', 'active',    0.5,  400,   72,  22, 0, null],
  ['Kuwait SIM Center',    'KW', 'std', 'active',    0.6,  500,  130,  18, 0, null],
  ['Doha Phone Lab',       'QA', 'whl', 'active',    0.9,  800,  355,  60, 5, null],
  ['Beirut Unlock Co',     'LB', 'std', 'active',    0.5,  300,   54,  11, 0, null],
  ["Sana'a Repair",        'YE', 'std', 'active',    0.5,  300,  -85,   9, 0, null],
  ['Algiers Service Plus', 'DZ', 'std', 'pending',   0,    300,    0,   2, 0, null],
  ['Tunis Fix Point',      'TN', 'std', 'suspended', 0.4,  300,   20, 140, 0, null],
  ['Accra Devices',        'GH', 'std', 'pending',   0,    300,    0,   1, 0, null],
];
const DEVICES = ['iPhone 13 (A2633)', 'iPhone 14 Pro (A2889)', 'iPhone 12 (A2403)', 'Galaxy S23 (SM-S911B)', 'Galaxy A54 (SM-A546E)', 'Redmi Note 12 (23021RAAEG)', 'Huawei P40 (ELS-NX9)', 'Pixel 7 (GVU6C)', 'Xiaomi 13 (2211133G)', 'Galaxy A14 (SM-A145F)'];
const REVIEW_REASONS = {
  timeout: 'Supplier timed out after 3 attempts',
  notfound: 'Supplier returned "IMEI not found in carrier database"',
  dup: 'Duplicate order: same IMEI ordered within 24 hours',
  mismatch: 'Model mismatch: TAC says SM-A546E, merchant sent a different model',
  empty: 'Supplier returned an empty reply',
  limit: 'Order exceeds the merchant daily limit',
  manual: 'Manual service: operator dispatch required',
};
const REJECT_REASONS = ['IMEI is blacklisted', 'Carrier not supported for this model', 'Device already unlocked', 'Invalid IMEI (failed Luhn check)', 'Account not found', 'Requested file not available for this model'];
const CITIES = { JO: 'Amman', SA: 'Riyadh', AE: 'Dubai', IQ: 'Baghdad', EG: 'Cairo', LY: 'Tripoli', MA: 'Casablanca', NG: 'Lagos', PK: 'Karachi', TR: 'Istanbul', OM: 'Muscat', KW: 'Kuwait City', QA: 'Doha', LB: 'Beirut', YE: "Sana'a", DZ: 'Algiers', TN: 'Tunis', GH: 'Accra' };

const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ---------- ledger core ---------- */
function postTo(S, j) {
  const dr = round(sum(j.entries, (e) => e.dr || 0), 2);
  const cr = round(sum(j.entries, (e) => e.cr || 0), 2);
  if (Math.abs(dr - cr) > 0.005) throw new Error('Unbalanced journal: ' + j.kind + ' ' + dr + ' vs ' + cr);
  if (S.numbered) j.id = 'JRN-' + String(++S.seq.jrn).padStart(5, '0');
  j.amount = dr;
  for (const e of j.entries) {
    const d = (e.dr || 0) - (e.cr || 0);
    S.acct[e.acct] = round((S.acct[e.acct] || 0) + d, 4);
    if (e.acct === 'client_wallet' && e.mid) S.wallet[e.mid] = round((S.wallet[e.mid] || 0) - d, 4);
    if (e.acct === 'client_hold' && e.mid) S.hold[e.mid] = round((S.hold[e.mid] || 0) - d, 4);
    if (e.acct === 'supplier_prepaid' && e.sid) S.prepaid[e.sid] = round((S.prepaid[e.sid] || 0) + d, 4);
  }
  S.journals.push(j);
  return j;
}

/* ---------- price resolver (pure) ---------- */
function resolveWith(S, m, s) {
  const floor = round(s.cost + s.minProfit, 2);
  const co = S.clientPrices[m.id + '|' + s.code];
  const gp = S.groupPrices[m.group + '|' + s.code];
  const grp = GROUPS.find((g) => g.id === m.group);
  const cat = S.categoryRules[s.category] || 0;
  const steps = [];
  let p;
  steps.push({ id: 'client', label: 'Client override', state: co != null ? 'win' : 'none', value: co, note: co != null ? 'Fixed price set for this merchant' : 'None for this merchant' });
  steps.push({ id: 'group', label: 'Group service price', state: co != null ? 'skip' : gp != null ? 'win' : 'none', value: gp, note: co != null ? 'Skipped, client override wins' : gp != null ? grp.name + ' price for this service' : 'None for the ' + grp.name + ' group' });
  const fixed = co != null || gp != null;
  if (fixed) p = co != null ? co : gp;
  else p = s.price;
  steps.push({ id: 'base', label: 'Base price', state: fixed ? 'skip' : 'apply', value: s.price, note: fixed ? 'Skipped, a fixed price applies' : 'Cost ' + money(s.cost) + ' plus ' + pct(s.markup * 100, 1) + ' markup' });
  if (!fixed && cat) p = p * (1 + cat);
  steps.push({ id: 'category', label: 'Category rule', state: fixed ? 'skip' : cat ? 'apply' : 'none', value: cat, note: fixed ? 'Skipped, a fixed price applies' : cat ? s.category + ' ' + (cat > 0 ? '+' : '') + pct(cat * 100, 0) : 'No rule for ' + s.category });
  if (!fixed && grp.discount) p = p * (1 - grp.discount);
  steps.push({ id: 'discount', label: 'Group discount', state: fixed ? 'skip' : grp.discount ? 'apply' : 'none', value: grp.discount, note: fixed ? 'Skipped, a fixed price applies' : grp.discount ? grp.name + ' group -' + pct(grp.discount * 100, 0) : grp.name + ' group has no discount' });
  p = round(p, 2);
  let after = p;
  const clamped = p < floor;
  if (clamped) after = floor;
  steps.forEach((st, i) => { st.after = null; });
  // running price after each step (for display)
  let run = fixed ? (co != null ? co : gp) : s.price;
  steps[0].after = co != null ? co : null;
  steps[1].after = co == null && gp != null ? gp : null;
  steps[2].after = fixed ? null : round(s.price, 2);
  if (!fixed) { run = s.price * (1 + cat); steps[3].after = cat ? round(run, 2) : null; run = run * (1 - grp.discount); steps[4].after = grp.discount ? round(run, 2) : null; }
  return { price: round(after, 2), raw: p, floor, clamped, source: co != null ? 'client' : gp != null ? 'group' : 'base', steps, margin: round(after - s.cost, 2) };
}

/* ---------- seed ---------- */
function seed() {
  const rnd = mulberry32(20261027);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const between = (a, b) => a + rnd() * (b - a);
  const int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const wpick = (pairs) => { let r = rnd() * sum(pairs, (p) => p[1]); for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; } return pairs[0][0]; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');

  const S = {
    numbered: false, seq: { order: 0, jrn: 0, pay: 1040, wd: 198, ca: 0, aud: 0, log: 0 },
    suppliers: [], services: [], merchants: [], orders: [], journals: [], payments: [], withdrawals: [], plans: [], accruals: [], audit: [], apiLog: [],
    groupPrices: { 'vip|IMEI-ATT-USA': 15.9, 'whl|IMEI-TMO-USA': 12.1 },
    clientPrices: { 'm1|IMEI-ICL-CHK': 0.1, 'm3|RMT-SAM-FRP': 5.5, 'm5|IMEI-ATT-USA': 15.2 },
    categoryRules: { 'Carrier unlock': -0.02 },
    acct: {}, wallet: {}, hold: {}, prepaid: {}, monthly: [],
  };

  /* suppliers */
  S.suppliers = SUPPLIER_DEFS.map(([id, name, api, host, status, left, succ, p50]) => {
    const hist = Array.from({ length: 24 }, (_, i) => {
      /* a degraded supplier was healthy until the last few hours, so the chart shows a fall rather than a flat bad line */
      const recent = i >= 20;
      const bad = status === 'degraded' && recent;
      const okBase = status === 'degraded' ? 96.2 : succ, msBase = status === 'degraded' ? 900 : p50;
      return {
        t: NOW - (23 - i) * HOUR,
        ok: bad ? round(between(34, 62), 1) : round(Math.min(100, between(okBase - 2.5, okBase + 1.4)), 1),
        ms: bad ? Math.round(between(2000, 4200)) : Math.round(between(msBase * 0.8, msBase * 1.25)),
      };
    });
    return { id, name, api, host, status, left, enabled: true, successRate: succ, p50, p95: Math.round(p50 * 2.6), minBalance: 150, hist, lastSync: NOW - int(1, 9) * MIN, key: 'sk_' + digits(2) + 'x' + digits(2) };
  });

  /* services */
  S.services = SERVICE_DEFS.map(([code, name, type, category, cost, markup, sla, sup, fb, pop], i) => {
    const price = Math.max(round(cost * (1 + markup), 2), round(cost + 0.05, 2));
    return { id: 's' + (i + 1), code, name, type, category, cost, costWas: null, markup, price, minProfit: Math.max(0.02, round(cost * 0.06, 2)), sla, sup, fb, status: 'active', auto: true, pop };
  });
  const svcByCode = (c) => S.services.find((s) => s.code === c);
  { const s = svcByCode('SRV-CHM-1M'); s.costWas = 17; s.cost = 19.8; s.price = 19.5; s.markup = round(19.5 / 17 - 1, 3); s.minProfit = 1.19; }
  { const s = svcByCode('SRV-Z3X-10'); s.minProfit = 0.68; }
  svcByCode('IMEI-XIA-MI').status = 'disabled';
  svcByCode('IMEI-MDM-PRM').auto = false;
  svcByCode('IMEI-ICL-LOST').auto = false;

  /* merchants */
  S.merchants = MERCHANT_DEFS.map(([name, cc, group, status, weight, credit, target, joined, ref, plan], i) => {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '');
    return {
      id: 'm' + (i + 1), name, cc, city: CITIES[cc], group, status, weight, credit, target, joined, referredBy: ref ? 'm' + ref : null, plan,
      isAgent: !!plan, email: 'ops@' + slug.slice(0, 14) + '.example', key: 'gsm_live_' + digits(2) + 'xx' + digits(2),
      ips: status === 'pending' ? [] : ['203.0.113.' + int(10, 240), '198.51.100.' + int(10, 240)].slice(0, int(1, 2)),
      kyc: status === 'pending' ? 'In review' : 'Verified', lastSeen: null,
    };
  });
  S.plans = [
    { id: 'pl1', name: 'Referral', basis: 'Order revenue of referred merchants', rate: 0.03, minPayout: 50, note: 'Standard partner plan' },
    { id: 'pl2', name: 'Partner', basis: 'Order revenue of referred merchants', rate: 0.05, minPayout: 100, note: 'For agents who refer 3+ active merchants' },
  ];

  const mById = new Map(S.merchants.map((m) => [m.id, m]));
  const sById = new Map(S.services.map((s) => [s.id, s]));
  const supById = new Map(S.suppliers.map((s) => [s.id, s]));

  /* orders: generate */
  const buyers = S.merchants.filter((m) => m.status !== 'pending');
  const buyerPairs = buyers.map((m) => [m, m.weight]);
  const svcPairs = S.services.map((s) => [s, s.pop]);
  const dayW = Array.from({ length: 30 }, (_, d) => {
    const wd = new Date(NOW - d * DAY).getDay();
    return [d, (d === 0 ? 0.55 : 0.55 + 0.45 * (1 - d / 30)) * (wd === 5 || wd === 6 ? 0.5 : 1)];
  });
  const hourW = [[7, 1], [8, 3], [9, 5], [10, 6], [11, 7], [12, 6], [13, 5], [14, 6], [15, 6], [16, 5], [17, 5], [18, 4], [19, 4], [20, 4], [21, 3], [22, 2], [23, 1], [0, 0.3], [2, 0.3], [4, 0.3]];
  const imeiTac = ['35389011', '35925410', '86741205', '35290511', '01388300', '35848011', '35460711'];
  const genInput = (s) => {
    if (s.type === 'IMEI') return luhn(pick(imeiTac) + digits(6));
    if (s.type === 'Server') return pick(['amir', 'dev', 'tech', 'lab', 'gsm', 'fix']) + int(10, 99) + '@' + pick(['mail.example', 'inbox.example', 'gsm.example']);
    if (s.type === 'Remote') return 'SN ' + digits(3) + pick(['R', 'K', 'A']) + digits(5);
    return pick(['SM-A546E', 'SM-S911B', '23021RAAEG', 'ELS-NX9', 'SM-A145F', '2211133G']);
  };
  const orders = [];
  const TOTAL = 760;
  for (let i = 0; i < TOTAL; i++) {
    const m = wpick(buyerPairs);
    const s = wpick(svcPairs);
    let d = wpick(dayW);
    if (m.status === 'suspended') d = Math.max(d, int(13, 29));
    let tries = 0;
    while (d >= m.joined && tries++ < 8) d = Math.floor(d / 2);
    if (d >= m.joined) d = 0;
    let created = startOfDay(NOW - d * DAY) + wpick(hourW) * HOUR + int(0, 59) * MIN + int(0, 59) * 1000;
    if (created > NOW - 30e3) created = NOW - int(40, 900) * 1000;
    if (created < NOW - m.joined * DAY + HOUR) created = NOW - m.joined * DAY + int(2, 20) * HOUR;
    const q = resolveWith(S, m, s);
    const qty = s.type === 'Server' ? wpick([[1, 55], [2, 20], [5, 15], [10, 10]]) : 1;
    const instant = s.sla <= 5;
    const dur = instant ? between(6e3, 70e3) : s.sla * MIN * between(0.3, 0.95);
    const age = NOW - created;
    let status;
    if (age < dur) status = age < 25e3 ? 'queued' : 'processing';
    else status = chance(instant ? 0.025 : 0.06) ? 'rejected' : 'completed';
    orders.push({
      mid: m.id, sid: s.id, input: genInput(s), device: s.type === 'IMEI' || s.type === 'Remote' ? pick(DEVICES) : null, qty,
      created, dur, status, price: round(q.price * qty, 2), cost: round(s.cost * qty, 2), sup: s.sup, source: q.source,
      chan: wpick([['Dhru API', 70], ['Portal', 25], ['REST API', 5]]), by: chance(0.14) ? 'Lina S.' : 'System', reason: null,
      attempts: 1, ref: null, doneAt: null, reply: null,
    });
  }
  /* forced scenarios so the queue has real work in it */
  const used = new Set();
  const take = (arr, n) => { const out = []; for (const o of arr) { if (out.length >= n) break; if (!used.has(o)) { used.add(o); out.push(o); } } return out; };
  const recent = shuffle(orders.filter((o) => NOW - o.created < 40 * HOUR && o.status !== 'queued'));
  const onSup3 = recent.filter((o) => o.sup === 'sup3');
  const reviewSet = [
    ...take(onSup3, 3).map((o) => [o, 'timeout']),
    ...take(recent.filter((o) => sById.get(o.sid).type === 'IMEI'), 1).map((o) => [o, 'notfound']),
    ...take(recent.filter((o) => sById.get(o.sid).type === 'IMEI'), 1).map((o) => [o, 'dup']),
    ...take(recent.filter((o) => sById.get(o.sid).type === 'IMEI' && o.device), 1).map((o) => [o, 'mismatch']),
    ...take(recent.filter((o) => sById.get(o.sid).type === 'Server'), 1).map((o) => [o, 'empty']),
    ...take(recent, 1).map((o) => [o, 'limit']),
  ];
  for (const [o, why] of reviewSet) { o.status = 'review'; o.reason = REVIEW_REASONS[why]; o.attempts = why === 'timeout' ? 3 : 1; }
  const breachPool = shuffle(orders.filter((o) => { const s = sById.get(o.sid); return s.sla >= 30 && s.sla <= 1440 && !used.has(o) && NOW - o.created < 4 * DAY; }));
  for (const o of take(breachPool, 5)) { const s = sById.get(o.sid); o.status = 'processing'; o.created = NOW - s.sla * MIN * between(1.12, 1.7); o.attempts = int(1, 2); }
  const freshPool = shuffle(orders.filter((o) => !used.has(o) && sById.get(o.sid).sla <= 5));
  const freshSup3 = freshPool.filter((o) => o.sup === 'sup3');
  const fresh = [...take(freshSup3, 4), ...take(freshPool, 5)];
  fresh.forEach((o, i) => { o.status = i % 3 === 0 ? 'processing' : 'queued'; o.created = NOW - int(25, 640) * 1000; });
  for (const o of orders) {
    const s = sById.get(o.sid);
    if (!s.auto && o.status !== 'review' && NOW - o.created < 20 * HOUR && !used.has(o)) { o.status = 'review'; o.reason = REVIEW_REASONS.manual; used.add(o); }
  }
  /* done times, ids */
  orders.sort((a, b) => a.created - b.created);
  orders.forEach((o, i) => {
    o.id = 'ORD-' + (48100 + i);
    S.seq.order = 48100 + i;
    if (o.status === 'completed' || o.status === 'rejected') o.doneAt = Math.min(NOW - 5e3, o.created + o.dur);
    if (o.status === 'rejected') o.reason = pick(REJECT_REASONS);
    o.ref = supById.get(o.sup).name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() + '-' + digits(6);
  });
  S.orders = orders;

  const replyFor = (o, s) => {
    if (s.type === 'IMEI' && s.category === 'Carrier unlock') return 'Unlock confirmed by carrier. Insert a non-supported SIM to verify.';
    if (s.type === 'IMEI' && s.category === 'Apple') return 'iCloud: Clean. Find My: OFF. Model: ' + (o.device || 'iPhone') + '.';
    if (s.type === 'IMEI') return 'Status: Clean. Carrier: unlocked. Region: EU.';
    if (s.type === 'Server') return 'Delivered to ' + o.input + '. Activation takes under 2 minutes.';
    if (s.type === 'Remote') return 'Remote session finished (' + int(4, 14) + ' min). Device rebooted normally.';
    return 'File delivered: ' + o.input.replace(/[^A-Za-z0-9]/g, '') + '.zip (' + (int(8, 140) / 10).toFixed(1) + ' MB).';
  };

  /* finalize orders: events and journals */
  for (const o of orders) {
    const m = mById.get(o.mid), s = sById.get(o.sid), sp = supById.get(o.sup);
    const ev = [];
    ev.push({ ts: o.created, k: 'created', text: 'Order received via ' + o.chan, by: o.chan === 'Portal' ? m.name : 'Merchant API' });
    ev.push({ ts: o.created + 1000, k: 'hold', text: money(o.price) + ' held from ' + m.name + ' wallet', by: 'System' });
    if (o.status !== 'queued') ev.push({ ts: o.created + 3000, k: 'dispatch', text: 'Sent to ' + sp.name + ' (' + sp.api + ')', by: 'System' });
    if (o.status !== 'queued') ev.push({ ts: o.created + int(5, 14) * 1000, k: 'ack', text: 'Accepted by supplier, ref ' + o.ref, by: sp.name });
    if (o.attempts > 1) ev.splice(3, 0, { ts: o.created + 20000, k: 'retry', text: 'Attempt 2 failed (timeout), retried', by: 'System' });
    if (o.status === 'review') ev.push({ ts: Math.max(o.created + 30e3, NOW - int(4, 90) * MIN), k: 'review', text: o.reason, by: o.reason === REVIEW_REASONS.manual ? 'System' : sp.name });
    if (o.status === 'completed') {
      o.reply = replyFor(o, s);
      ev.push({ ts: o.doneAt, k: 'completed', text: o.by === 'System' ? 'Completed by supplier reply' : 'Completed manually', by: o.by });
      ev.push({ ts: o.doneAt + 500, k: 'settle', text: 'Settled: revenue ' + money(o.price) + ', cost ' + money(o.cost), by: 'System' });
    }
    if (o.status === 'rejected') {
      ev.push({ ts: o.doneAt, k: 'rejected', text: o.reason, by: o.by });
      ev.push({ ts: o.doneAt + 500, k: 'release', text: money(o.price) + ' released back to wallet', by: 'System' });
    }
    o.events = ev;
    o.updated = ev[ev.length - 1].ts;
    postTo(S, { ts: o.created + 1000, kind: 'order_hold', memo: 'Hold for ' + o.id, refType: 'order', refId: o.id, mid: o.mid, by: 'System', entries: [{ acct: 'client_wallet', mid: o.mid, dr: o.price }, { acct: 'client_hold', mid: o.mid, cr: o.price }] });
    if (o.status === 'completed') postTo(S, { ts: o.doneAt + 500, kind: 'order_settle', memo: 'Settle ' + o.id, refType: 'order', refId: o.id, mid: o.mid, by: 'System', entries: [{ acct: 'client_hold', mid: o.mid, dr: o.price }, { acct: 'revenue', cr: o.price }, { acct: 'cogs', dr: o.cost }, { acct: 'supplier_prepaid', sid: o.sup, cr: o.cost }] });
    if (o.status === 'rejected') postTo(S, { ts: o.doneAt + 500, kind: 'order_release', memo: 'Release ' + o.id, refType: 'order', refId: o.id, mid: o.mid, by: 'System', entries: [{ acct: 'client_hold', mid: o.mid, dr: o.price }, { acct: 'client_wallet', mid: o.mid, cr: o.price }] });
  }
  for (const m of S.merchants) { const last = orders.filter((o) => o.mid === m.id).pop(); m.lastSeen = last ? last.created : null; }

  /* B2C storefront: customers, paid orders, refunds, disputes, support, risk, settings */
  const b2c = seedB2C(S, { pick, between, int, chance, wpick, shuffle, digits, sById, supById });

  /* opening bank capital */
  postTo(S, { ts: NOW - 36 * DAY, kind: 'opening', memo: 'Opening balance (owner capital)', refType: 'system', refId: 'opening', by: 'Rami K.', entries: [{ acct: 'bank', dr: 25000 }, { acct: 'owner_capital', cr: 25000 }] });

  /* supplier top-ups sized so each supplier ends at its target balance */
  for (const sp of S.suppliers) {
    const cogs = sum(S.orders.filter((o) => o.sup === sp.id && o.status === 'completed'), (o) => o.cost);
    const total = round(cogs + sp.left, 2);
    const first = round(total * 0.62, 2);
    postTo(S, { ts: NOW - 35 * DAY, kind: 'supplier_topup', memo: 'Prepaid top-up, ' + sp.name, refType: 'supplier', refId: sp.id, by: 'Omar T.', entries: [{ acct: 'supplier_prepaid', sid: sp.id, dr: first }, { acct: 'bank', cr: first }] });
    postTo(S, { ts: NOW - 13 * DAY, kind: 'supplier_topup', memo: 'Prepaid top-up, ' + sp.name, refType: 'supplier', refId: sp.id, by: 'Omar T.', entries: [{ acct: 'supplier_prepaid', sid: sp.id, dr: round(total - first, 2) }, { acct: 'bank', cr: round(total - first, 2) }] });
  }

  /* deposits per merchant */
  const payments = [];
  const methodPairs = [['bank', 40], ['card', 30], ['usdt', 20], ['wise', 10]];
  for (const m of S.merchants) {
    if (m.status === 'pending') continue;
    const spend = sum(orders.filter((o) => o.mid === m.id && o.status !== 'rejected'), (o) => o.price);
    const totalNet = Math.max(0, Math.ceil((spend + m.target) / 5) * 5);
    if (!totalNet) continue;
    const n = Math.min(5, Math.max(2, Math.round(totalNet / 400)));
    const shares = Array.from({ length: n }, (_, i) => (i === 0 ? 2.2 : between(0.6, 1.6)));
    const sh = sum(shares);
    let left = totalNet;
    const first = NOW - Math.min(m.joined, 34) * DAY + int(1, 6) * HOUR;
    const times = [first, ...Array.from({ length: n - 1 }, () => between(first + DAY, NOW - 8 * HOUR)).sort((a, b) => a - b)];
    shares.forEach((w, i) => {
      let net = i === n - 1 ? left : Math.max(5, Math.round(((totalNet * w) / sh) / 5) * 5);
      if (i < n - 1 && net >= left) net = Math.max(5, left - 5);
      left = round(left - net, 2);
      if (net <= 0) return;
      const mk = i === 0 && chance(0.6) ? 'bank' : wpick(methodPairs);
      const fee = METHODS[mk].fee;
      const gross = fee ? round(net / (1 - fee), 2) : net;
      payments.push({ mid: m.id, method: mk, gross, fee: round(gross - net, 2), net, status: 'approved', created: times[i], reviewedAt: times[i] + (METHODS[mk].review ? int(10, 240) * MIN : 20e3), reviewedBy: METHODS[mk].review ? 'Omar T.' : 'System', ref: null, note: '' });
    });
  }
  const pendingSeeds = [['m2', 'bank', 1200], ['m5', 'usdt', 850], ['m7', 'bank', 150], ['m11', 'wise', 600], ['m14', 'bank', 300], ['m3', 'usdt', 2500]];
  pendingSeeds.forEach(([mid, mk, amt], i) => {
    const fee = METHODS[mk].fee;
    payments.push({ mid, method: mk, gross: amt, fee: round(amt * fee, 2), net: round(amt - amt * fee, 2), status: 'pending', created: NOW - (i * 5 + int(1, 4)) * HOUR - int(0, 50) * MIN, reviewedAt: null, reviewedBy: null, ref: null, note: i === 5 ? 'Large deposit. Check the tx hash on-chain before approving.' : '' });
  });
  payments.push({ mid: 'm4', method: 'bank', gross: 90, fee: 0, net: 90, status: 'rejected', created: NOW - 9 * DAY, reviewedAt: NOW - 9 * DAY + 3 * HOUR, reviewedBy: 'Omar T.', ref: null, note: 'Receipt amount does not match the transfer ($60 on receipt)' });
  payments.push({ mid: 'm10', method: 'usdt', gross: 500, fee: 5, net: 495, status: 'rejected', created: NOW - 17 * DAY, reviewedAt: NOW - 17 * DAY + 2 * HOUR, reviewedBy: 'Omar T.', ref: null, note: 'Transaction hash not found on-chain' });
  payments.sort((a, b) => a.created - b.created);
  payments.forEach((p, i) => {
    p.id = 'PAY-' + (1000 + i);
    S.seq.pay = 1000 + i;
    p.ref = p.method === 'card' ? 'pi_3Q' + digits(3) + 'xK' + digits(4) : p.method === 'usdt' ? digits(2) + 'a' + digits(1) + 'f…' + digits(2) + 'c' + digits(1) : p.method === 'wise' ? 'WISE-' + digits(8) : 'TRX-' + digits(7);
    p.receipt = p.method === 'bank' || p.method === 'wise' ? 'receipt-' + (1000 + i) + '.pdf' : null;
    if (p.status === 'approved') postDeposit(S, p, p.reviewedAt, p.reviewedBy);
  });
  S.payments = payments;

  /* gateway settlements to bank for card/usdt gross older than 7 days */
  const settleBefore = (from, to, ts) => {
    const g = sum(payments.filter((p) => p.status === 'approved' && METHODS[p.method].fee && p.created >= from && p.created < to), (p) => p.gross);
    if (g > 0) postTo(S, { ts, kind: 'settlement', memo: 'Gateway payout to bank', refType: 'system', refId: 'gateway', by: 'System', entries: [{ acct: 'bank', dr: round(g, 2) }, { acct: 'gateway_clearing', cr: round(g, 2) }] });
  };
  settleBefore(0, NOW - 21 * DAY, NOW - 21 * DAY);
  settleBefore(NOW - 21 * DAY, NOW - 7 * DAY, NOW - 7 * DAY);

  /* commissions */
  S.accruals = [];
  for (const o of orders) {
    if (o.status !== 'completed') continue;
    const m = mById.get(o.mid);
    if (!m.referredBy) continue;
    const agent = mById.get(m.referredBy);
    const plan = S.plans.find((p) => p.id === agent.plan);
    const base = o.price;
    const amount = round(base * plan.rate, 2);
    if (amount <= 0) continue;
    const a = { id: 'CA-' + String(++S.seq.ca).padStart(4, '0'), agent: agent.id, mid: m.id, orderId: o.id, base, rate: plan.rate, amount, created: o.doneAt, status: 'accrued', approvedAt: null };
    if (NOW - o.doneAt > 7 * DAY) {
      a.status = 'approved'; a.approvedAt = o.doneAt + 7 * DAY;
      postTo(S, { ts: a.approvedAt, kind: 'commission', memo: 'Commission ' + a.id + ' to ' + agent.name, refType: 'accrual', refId: a.id, mid: agent.id, by: 'Omar T.', entries: [{ acct: 'commission_expense', dr: amount }, { acct: 'client_wallet', mid: agent.id, cr: amount }] });
    }
    S.accruals.push(a);
  }

  /* withdrawals */
  const wd = [
    ['m1', 300, 'Bank transfer', 'paid', NOW - 6 * DAY], ['m1', 400, 'Bank transfer', 'pending', NOW - 20 * HOUR],
    ['m5', 650, 'USDT (TRC20)', 'pending', NOW - 9 * HOUR], ['m3', 1200, 'Bank transfer', 'pending', NOW - 3 * HOUR],
  ];
  S.withdrawals = wd.map(([mid, amount, method, status, created], i) => {
    const w = { id: 'WD-' + (199 + i), mid, amount, method, status, created, reviewedBy: status === 'paid' ? 'Omar T.' : null, reviewedAt: status === 'paid' ? created + 4 * HOUR : null };
    if (status === 'paid') postTo(S, { ts: w.reviewedAt, kind: 'withdrawal', memo: 'Withdrawal ' + w.id, refType: 'withdrawal', refId: w.id, mid, by: 'Omar T.', entries: [{ acct: 'client_wallet', mid, dr: amount }, { acct: 'bank', cr: amount }] });
    return w;
  });
  S.seq.wd = 202;

  /* numbered, chronological ledger */
  S.journals.sort((a, b) => a.ts - b.ts);
  S.journals.forEach((j, i) => { j.id = 'JRN-' + String(i + 1).padStart(5, '0'); });
  S.seq.jrn = S.journals.length;
  S.numbered = true;

  /* api log */
  const codes = (st) => (st === 'degraded' ? [[200, 56], [504, 30], [429, 10], [500, 4]] : [[200, 96], [429, 1.5], [500, 1.5], [504, 1]]);
  const calls = [['POST', '/placeorder'], ['POST', '/getorder'], ['POST', '/getorder'], ['GET', '/balance'], ['POST', '/cancelorder']];
  for (const sp of S.suppliers) {
    const mine = orders.filter((o) => o.sup === sp.id).slice(-30);
    for (let i = 0; i < 26; i++) {
      const o = mine.length ? pick(mine) : null;
      const [method, path] = pick(calls);
      const code = wpick(codes(sp.status));
      S.apiLog.push({ id: ++S.seq.log, sid: sp.id, ts: NOW - (i * int(35, 110) + int(1, 30)) * 1000, method, path, code, ms: code === 504 ? int(8000, 12000) : Math.round(sp.p50 * between(0.6, 1.6)), ref: o ? o.id : null, msg: code === 200 ? 'OK' : code === 504 ? 'Gateway timeout' : code === 429 ? 'Rate limited, retry after 5s' : 'Upstream error' });
    }
  }
  S.apiLog.sort((a, b) => b.ts - a.ts);

  /* audit log */
  const ips = ['203.0.113.24', '203.0.113.31', '198.51.100.77'];
  const aud = [];
  const A = (daysAgo, actor, verb, type, id, label, diff = []) => aud.push({ ts: NOW - daysAgo * DAY - int(0, 600) * MIN, actor, verb, type, eid: id, label, diff, ip: actor === 'System' ? null : pick(ips) });
  S.services.slice(0, 6).forEach((s, i) => A(11 - i, ME, 'changed price of', 'service', s.id, s.name, [{ field: 'price', from: money(s.price * 0.97), to: money(s.price) }]));
  A(13, ME, 'created API key for', 'merchant', 'm13', 'Muscat Mobile Clinic', [{ field: 'api_key', from: 'none', to: 'gsm_live_••••' + digits(2) }]);
  A(12, ME, 'changed group of', 'merchant', 'm10', 'Karachi Unlock Hub', [{ field: 'group', from: 'Standard', to: 'Wholesale' }]);
  A(9, 'Omar T.', 'rejected deposit', 'payment', 'PAY-' + payments.find((p) => p.status === 'rejected' && p.mid === 'm4').id.slice(4), 'Basra Unlock Center, $90.00', [{ field: 'status', from: 'pending', to: 'rejected' }, { field: 'reason', from: '', to: 'Receipt amount does not match' }]);
  A(8, ME, 'enabled fallback on', 'supplier', 'sup1', 'Nordic GSM', [{ field: 'fallback_for', from: '[]', to: '[Rapid IMEI]' }]);
  A(7, 'Omar T.', 'adjusted wallet of', 'merchant', 'm9', 'Lagos Gadget Fix', [{ field: 'wallet', from: '$41.20', to: '$66.20' }, { field: 'reason', from: '', to: 'Duplicate charge refund' }]);
  A(6, 'Lina S.', 'suspended', 'merchant', 'm19', 'Tunis Fix Point', [{ field: 'status', from: 'active', to: 'suspended' }, { field: 'reason', from: '', to: 'Chargeback dispute' }]);
  A(6, 'Omar T.', 'paid withdrawal', 'withdrawal', 'WD-199', 'Zain Mobile Hub, $300.00', [{ field: 'status', from: 'pending', to: 'paid' }]);
  A(5, ME, 'disabled service', 'service', svcByCode('IMEI-XIA-MI').id, 'Xiaomi Mi Account Clean', [{ field: 'status', from: 'active', to: 'disabled' }]);
  A(4, ME, 'changed commission plan of', 'merchant', 'm5', 'Cairo GSM Lab', [{ field: 'plan', from: 'Referral 3%', to: 'Partner 5%' }]);
  A(3, 'Omar T.', 'recorded top-up for', 'supplier', 'sup6', 'Bosphorus Unlock', [{ field: 'prepaid', from: '$760.00', to: '$1,260.00' }]);
  A(2, 'Lina S.', 'logged in', 'session', 'sess', 'Lina S.', []);
  A(2, ME, 'set client price for', 'merchant', 'm5', 'Cairo GSM Lab, AT&T USA Premier', [{ field: 'price', from: 'group 15.90', to: '15.20' }]);
  A(1, 'System', 'flagged supplier degraded', 'supplier', 'sup3', 'Rapid IMEI', [{ field: 'status', from: 'up', to: 'degraded' }, { field: 'success_1h', from: '97%', to: '48%' }]);
  A(1, 'System', 'synced supplier costs', 'supplier', 'sup2', 'Gulf Server Hub', [{ field: 'SRV-CHM-1M cost', from: '$17.00', to: '$19.80' }]);
  const doneMan = orders.filter((o) => o.status === 'completed' && o.by !== 'System').slice(-9);
  doneMan.forEach((o) => A((NOW - o.doneAt) / DAY, o.by, 'completed order', 'order', o.id, o.id + ' for ' + mById.get(o.mid).name, [{ field: 'status', from: 'processing', to: 'completed' }]));
  const rejMan = orders.filter((o) => o.status === 'rejected' && o.by !== 'System').slice(-4);
  rejMan.forEach((o) => A((NOW - o.doneAt) / DAY, o.by, 'rejected order', 'order', o.id, o.id + ' for ' + mById.get(o.mid).name, [{ field: 'status', from: 'processing', to: 'rejected' }, { field: 'reason', from: '', to: o.reason }]));
  b2c.audit.forEach((a) => A(...a));
  aud.forEach((a) => { a.ts = Math.min(a.ts, NOW - MIN); });
  aud.sort((a, b) => a.ts - b.ts);
  aud.forEach((a, i) => { a.id = 'AUD-' + String(i + 1).padStart(4, '0'); S.seq.aud = i + 1; });
  S.audit = aud.reverse();

  /* 12 months of order history (older months are synthetic aggregates; the last month equals the live 30 days) */
  const last30 = (t) => orders.filter((o) => sById.get(o.sid).type === t && NOW - o.created < 30 * DAY).length;
  const mix = { IMEI: last30('IMEI'), Server: last30('Server'), Remote: last30('Remote'), File: last30('File') };
  for (let i = 0; i < 12; i++) {
    const f = i === 11 ? 1 : 0.16 + 0.84 * Math.pow(i / 11, 1.5);
    const row = { ts: new Date(new Date(NOW).getFullYear(), new Date(NOW).getMonth() - (11 - i), 1).getTime() };
    for (const t of TYPES) row[t] = i === 11 ? mix[t] : Math.round(mix[t] * f * between(0.9, 1.1));
    S.monthly.push(row);
  }
  return S;
}

function postDeposit(S, p, ts, by) {
  const gw = METHODS[p.method].fee > 0;
  const entries = [{ acct: gw ? 'gateway_clearing' : 'bank', dr: p.gross }, { acct: 'client_wallet', mid: p.mid, cr: p.net }];
  if (p.fee > 0) entries.push({ acct: 'fee_income', cr: p.fee });
  return postTo(S, { ts, kind: 'deposit', memo: 'Deposit ' + p.id + ' (' + METHODS[p.method].label + ')', refType: 'payment', refId: p.id, mid: p.mid, by, entries });
}
