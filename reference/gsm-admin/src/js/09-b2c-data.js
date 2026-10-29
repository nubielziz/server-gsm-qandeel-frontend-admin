/* B2C data: constants and the seeded storefront dataset (customers, paid orders, support, risk, settings). Everything here is invented demo data. */
const B2C_COUNTRIES = {
  GB: { name: 'United Kingdom', cur: 'GBP', vat: 0.2 }, DE: { name: 'Germany', cur: 'EUR', vat: 0.19 }, FR: { name: 'France', cur: 'EUR', vat: 0.2 },
  NL: { name: 'Netherlands', cur: 'EUR', vat: 0.21 }, IE: { name: 'Ireland', cur: 'EUR', vat: 0.23 }, ES: { name: 'Spain', cur: 'EUR', vat: 0.21 },
  IT: { name: 'Italy', cur: 'EUR', vat: 0.22 }, SE: { name: 'Sweden', cur: 'SEK', vat: 0.25 },
  US: { name: 'United States', cur: 'USD', vat: 0 }, CA: { name: 'Canada', cur: 'CAD', vat: 0 }, AE: { name: 'United Arab Emirates', cur: 'AED', vat: 0 }, SA: { name: 'Saudi Arabia', cur: 'SAR', vat: 0 },
};
const B2C_FX = { USD: 1, GBP: 0.79, EUR: 0.92, SEK: 10.6, CAD: 1.37, AED: 3.67, SAR: 3.75 };
const B2C_SYM = { USD: '$', GBP: '£', EUR: '€', SEK: 'kr ', CAD: 'CA$', AED: 'AED ', SAR: 'SAR ' };
const localMoney = (usd, cur) => (B2C_SYM[cur] || cur + ' ') + (usd * (B2C_FX[cur] || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const B2C_METHODS = {
  card:   { label: 'Card (3DS)',           pct: 0.029, fixed: 0.3 },
  wallet: { label: 'Apple / Google Pay',   pct: 0.029, fixed: 0.3 },
  crypto: { label: 'Crypto (USDT / BTC)',  pct: 0.01,  fixed: 0 },
};
const B2C_UNLISTED = ['IMEI-MDM-PRM', 'IMEI-ICL-LOST', 'IMEI-XIA-MI']; // high-risk (stolen-device) or disabled services are never shown to the public
const B2C_TAC = [
  // tac, brand, model, code, year
  ['35389011', 'Apple', 'iPhone 13', 'A2633', 2021], ['35925410', 'Apple', 'iPhone 14 Pro', 'A2889', 2022], ['01388300', 'Apple', 'iPhone 12', 'A2403', 2020],
  ['35290511', 'Samsung', 'Galaxy S23', 'SM-S911B', 2023], ['35848011', 'Samsung', 'Galaxy A54', 'SM-A546E', 2023], ['86741205', 'Xiaomi', 'Redmi Note 12', '23021RAAEG', 2023],
  ['35460711', 'Google', 'Pixel 7', 'GVU6C', 2022], ['35691211', 'Apple', 'iPhone 11', 'A2221', 2019],
];
const tacDevice = (imei) => { const t = B2C_TAC.find((x) => imei.startsWith(x[0])); return t ? t[2] + ' (' + t[3] + ')' : 'Unknown model'; };
const B2C_SIGNALS = [
  ['New customer, first order above $40', 18], ['IP country differs from card country', 25], ['Disposable email domain', 22], ['4 orders in one hour from one device', 20],
  ['Prepaid card BIN', 12], ['VPN or proxy IP', 15], ['Email on a previous chargeback', 40], ['IMEI was checked blacklisted before', 30],
];
const SUPPORT_STAFF = ['Lina S.', 'Rami K.'];
const PRIO_TARGET = { high: 2 * HOUR, normal: 8 * HOUR, low: 24 * HOUR };

function retailPriceFor(s) {
  if (s.type !== 'IMEI') return null;
  const raw = Math.max(s.price * 1.5, s.cost * 1.7 + 1, 3.99); // 3.99 floor: a fixed card fee of $0.30 would eat a cheaper check
  return raw < 5 ? 3.99 : Math.floor(raw) + 0.99;
}
function taxFor(net, country) { const r = (B2C_COUNTRIES[country] || { vat: 0 }).vat; return { rate: r, tax: round(net * r, 2) }; }
function gatewayFee(gross, method) { const m = B2C_METHODS[method]; return round(gross * m.pct + m.fixed, 2); }

function seedB2C(S, K) {
  const { pick, between, int, chance, wpick, shuffle, digits, sById, supById } = K;
  const T = (days, hours = 0) => NOW - days * DAY - hours * HOUR;

  /* ---------- catalog: retail prices, listings, TAC ---------- */
  S.retail = {};
  S.tac = B2C_TAC.map(([tac, brand, model, code, year]) => ({ tac, brand, model, code, year }));
  S.services.forEach((s) => { const p = retailPriceFor(s); if (p) S.retail[s.code] = p; });
  const slugOf = (name) => name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  S.listings = S.services.filter((s) => s.type === 'IMEI').map((s, i) => {
    const unl = B2C_UNLISTED.includes(s.code);
    return { sid: s.id, slug: slugOf(s.name), title: s.name.replace('Verizon USA Clean Unlock', 'Verizon iPhone Unlock').replace('Vodafone UK iPhone Unlock', 'Vodafone UK iPhone Unlock'), listed: !unl && s.status === 'active', locked: unl, why: unl ? (s.code === 'IMEI-XIA-MI' ? 'Service disabled' : 'High risk: removal services attract stolen devices. B2B only.') : '', featured: ['IMEI-ATT-USA', 'IMEI-TMO-USA', 'IMEI-VOD-UK', 'IMEI-ICL-CHK'].includes(s.code), langs: i % 4 === 3 ? 'EN' : 'EN, AR', seoTitle: !(i === 5 || i === 9), seoDesc: !(i === 2 || i === 5 || i === 11), views: int(180, 2600) + (s.pop > 6 ? 3000 : 0) };
  });

  /* ---------- customers ---------- */
  const defs = [
    ['Daniel Whitmore', 'GB', 1], ['Sofia Alvarez', 'ES', 0], ['Lukas Brandt', 'DE', 1], ['Emma Dubois', 'FR', 0], ['Noah van Dijk', 'NL', 1], ['Aoife Brennan', 'IE', 0],
    ['Erik Lindqvist', 'SE', 0], ['Marco Ricci', 'IT', 1], ['Jessica Moore', 'US', 1], ['Tyler Brooks', 'US', 0], ['Priya Nair', 'CA', 1], ['Omar Haddad', 'AE', 0],
    ['Fahad Al-Otaibi', 'SA', 0], ['Chloe Bennett', 'GB', 0], ['Harry Patel', 'GB', 1], ['Mia Schneider', 'DE', 0], ['Lucas Moreau', 'FR', 0], ['Hannah Weber', 'DE', 1],
    ['Jack Turner', 'GB', 0], ['Kevin Doyle', 'IE', 0], ['Samira Khan', 'GB', 0], ['Diego Fernandez', 'ES', 0], ['Ana Costa', 'ES', 0], ['Ryan Cooper', 'US', 1],
    ['Olivia Grant', 'US', 0], ['Ethan Clarke', 'CA', 0], ['Nina Petrova', 'DE', 0], ['Victor Silva', 'US', 0], ['Layla Hassan', 'AE', 0], ['Oscar Nilsson', 'SE', 1],
  ];
  const domains = ['mail.example', 'inbox.example', 'post.example', 'webmail.example'];
  S.customers = defs.map(([name, cc, acc], i) => {
    const [f, l] = name.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
    const bad = name === 'Jack Turner';
    return { id: 'c' + (i + 1), name, email: bad ? 'jt.' + digits(4) + '@tempbox.example' : f + '.' + l + '@' + domains[i % 4], country: cc, cur: B2C_COUNTRIES[cc].cur, locale: cc === 'AE' || cc === 'SA' ? 'ar' : 'en', hasAccount: !!acc, optIn: chance(0.45), risk: bad ? 'high' : name === 'Tyler Brooks' || name === 'Kevin Doyle' ? 'med' : 'low', status: bad ? 'blocked' : 'active', created: T(int(1, 34)), w: i < 12 ? 1.7 : bad ? 0.3 : 1, notes: bad ? 'Chargeback lost. Email and card fingerprint added to the blocklist.' : '' };
  });
  const DIAL = { GB: '44', DE: '49', FR: '33', NL: '31', IE: '353', ES: '34', IT: '39', SE: '46', US: '1', CA: '1', AE: '971', SA: '966' };
  S.customers.forEach((c) => {
    Object.assign(c, {
      phone: chance(0.55) ? '+' + DIAL[c.country] + ' ' + digits(9) : '',
      emailVerified: c.hasAccount ? chance(0.9) : false,
      createdBy: c.hasAccount ? 'self' : 'checkout',
      lastLogin: c.hasAccount ? T(int(0, 40)) : null,
      sessions: c.hasAccount && c.status !== 'blocked' ? int(1, 3) : 0,
      pwChangedAt: c.hasAccount ? T(int(20, 200)) : null,
      mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '',
      lastIp: pick(['203.0.113.', '198.51.100.']) + int(1, 220),
    });
  });
  S.customers.find((c) => c.name === 'Jack Turner').lastIp = '192.0.2.77';
  { const hw = S.customers.find((c) => c.name === 'Hannah Weber'); Object.assign(hw, { status: 'suspended', sessions: 0, suspendedAt: T(3), suspendedReason: 'Customer asked us to pause the account: phone lost.' }); }
  const cById = new Map(S.customers.map((c) => [c.id, c]));

  /* ---------- storefront orders ---------- */
  const listedSvcs = S.services.filter((s) => s.type === 'IMEI' && s.status === 'active' && !B2C_UNLISTED.includes(s.code));
  const svcPairs = listedSvcs.map((s) => [s, s.pop]);
  const carrierCountry = { 'IMEI-ATT-USA': [['US', 7], ['CA', 3]], 'IMEI-TMO-USA': [['US', 8], ['CA', 2]], 'IMEI-VZW-USA': [['US', 10]], 'IMEI-VOD-UK': [['GB', 8], ['IE', 2]], 'IMEI-EE-UK': [['GB', 10]], 'IMEI-ORG-FR': [['FR', 8], ['DE', 1], ['ES', 1]] };
  const dayW = Array.from({ length: 30 }, (_, d) => [d, (d === 0 ? 0.6 : 1 - d / 46) * (new Date(NOW - d * DAY).getDay() === 0 ? 0.8 : 1)]);
  const hourW = [[8, 2], [9, 3], [10, 4], [11, 4], [12, 5], [13, 5], [14, 4], [15, 4], [16, 5], [17, 5], [18, 6], [19, 7], [20, 7], [21, 6], [22, 4], [23, 2], [0, 1], [1, 0.5]];
  const methodPairs = [['card', 62], ['wallet', 20], ['crypto', 18]];

  const TOTAL = 104;
  const orders = [];
  for (let i = 0; i < TOTAL; i++) {
    const s = wpick(svcPairs);
    const cc = carrierCountry[s.code] ? wpick(carrierCountry[s.code]) : null;
    const pool = S.customers.filter((c) => (!cc || c.country === cc) && c.status !== 'blocked');
    const cu = cc && !pool.length ? S.customers[0] : wpick((pool.length ? pool : S.customers.filter((c) => c.status !== 'blocked')).map((c) => [c, c.w]));
    const d = wpick(dayW);
    let created = startOfDay(NOW - d * DAY) + wpick(hourW) * HOUR + int(0, 59) * MIN + int(0, 59) * 1000;
    if (created > NOW - 30e3) created = NOW - int(40, 900) * 1000;
    const tac = pick(B2C_TAC);
    const imei = luhn(tac[0] + digits(6));
    const method = wpick(methodPairs);
    const list = S.retail[s.code];
    const net = list;
    const { rate, tax } = taxFor(net, cu.country);
    const gross = round(net + tax, 2);
    const fee = gatewayFee(gross, method);
    const instant = s.sla <= 5;
    const dur = instant ? between(9e3, 80e3) : s.sla * MIN * between(0.35, 0.95);
    const age = NOW - created;
    let status;
    if (age < dur) status = age < 25e3 ? 'queued' : 'processing';
    else status = chance(s.category === 'Carrier unlock' ? 0.07 : 0.02) ? 'rejected' : 'completed';
    const base = int(3, 24);
    const score = base;
    orders.push({
      cid: cu.id, sid: s.id, input: imei, device: tacDevice(imei), qty: 1, created, dur, status, price: net, list, cost: s.cost, sup: s.sup, source: 'retail',
      chan: 'Storefront', by: 'System', reason: null, attempts: 1, ref: null, doneAt: null, reply: null, country: cu.country, cur: cu.cur, fx: B2C_FX[cu.cur], taxRate: rate, tax, gross, fee,
      pay: { method, status: 'captured', ref: method === 'crypto' ? 'inv_' + digits(8) : 'pi_3Q' + digits(3) + 'xK' + digits(4), threeDS: method !== 'crypto', brand: method === 'crypto' ? 'USDT TRC20' : pick(['Visa', 'Mastercard', 'Amex']) + ' ' + digits(4) },
      risk: { score, decision: 'allow', signals: [], reviewedBy: null, reviewedAt: null, outcome: null },
      token: 't_' + digits(4) + pick(['x', 'k', 'q', 'm']) + digits(5),
    });
  }
  /* forced scenarios: risk holds, a late order, refunds and a blocked customer's history */
  const used = new Set();
  const take = (arr, n) => { const out = []; for (const o of arr) { if (out.length >= n) break; if (!used.has(o)) { used.add(o); out.push(o); } } return out; };
  const recent = shuffle(orders.filter((o) => NOW - o.created < 30 * HOUR && o.status !== 'queued'));
  const holds = [
    [['Disposable email domain', 22], ['New customer, first order above $40', 18], ['VPN or proxy IP', 15], ['IP country differs from card country', 25]],
    [['IP country differs from card country', 25], ['Prepaid card BIN', 12], ['4 orders in one hour from one device', 20]],
    [['Email on a previous chargeback', 40], ['Disposable email domain', 22]],
    [['IMEI was checked blacklisted before', 30], ['New customer, first order above $40', 18], ['VPN or proxy IP', 15]],
  ];
  take(recent, 4).forEach((o, i) => {
    const sig = holds[i];
    o.status = 'review'; o.risk = { score: Math.min(97, sum(sig, (x) => x[1]) + int(2, 9)), decision: 'review', signals: sig.map((x) => x[0]), reviewedBy: null, reviewedAt: null, outcome: null };
    o.reason = 'Risk hold: score ' + o.risk.score + '. ' + sig[0][0] + (sig.length > 1 ? ' and ' + (sig.length - 1) + ' more signal' + (sig.length > 2 ? 's' : '') : '');
    o.attempts = 0;
    if (i === 3) { const t = S.customers.find((c) => c.name === 'Tyler Brooks'); o.cid = t.id; o.country = t.country; o.cur = t.cur; o.fx = B2C_FX[t.cur]; const tt = taxFor(o.price, t.country); o.taxRate = tt.rate; o.tax = tt.tax; o.gross = round(o.price + o.tax, 2); }
  });
  const longSvc = shuffle(orders.filter((o) => !used.has(o) && sById.get(o.sid).sla >= 720 && NOW - o.created < 4 * DAY));
  for (const o of take(longSvc, 1)) { const s = sById.get(o.sid); o.status = 'processing'; o.created = NOW - s.sla * MIN * between(1.1, 1.3); o.attempts = 2; }
  const fresh = shuffle(orders.filter((o) => !used.has(o) && sById.get(o.sid).sla <= 5));
  take(fresh, 3).forEach((o, i) => { o.status = i % 2 ? 'queued' : 'processing'; o.created = NOW - int(25, 480) * 1000; });
  /* risk-refunded order from the blocked customer, plus one chargeback source */
  const jt = S.customers.find((c) => c.name === 'Jack Turner');
  let disputeOrders = [];
  const oldRej = take(shuffle(orders.filter((o) => !used.has(o) && o.status === 'completed' && NOW - o.created > 3 * DAY && NOW - o.created < 20 * DAY)), 1);
  oldRej.forEach((o) => { o.status = 'rejected'; o.reason = 'Refunded after risk review: card owner did not match the IMEI buyer'; o.risk = { score: 84, decision: 'review', signals: ['IP country differs from card country', 'Prepaid card BIN', 'Email on a previous chargeback'], reviewedBy: 'Rami K.', reviewedAt: o.created + 3 * HOUR, outcome: 'refunded' }; });

  orders.sort((a, b) => a.created - b.created);
  S.seq.sf = 20400;
  orders.forEach((o, i) => {
    o.id = 'SF-' + (20400 + i);
    S.seq.sf = 20400 + i;
    if (o.status === 'completed' || o.status === 'rejected') o.doneAt = Math.min(NOW - 5e3, o.created + (o.dur || 60e3) + (o.risk.reviewedAt ? 3 * HOUR : 0));
    if (o.status === 'rejected' && !o.reason) o.reason = pick(['Carrier rejected the request: device not eligible', 'IMEI is blacklisted', 'Device already unlocked', 'Carrier rejected the request: device not eligible']);
    o.ref = supById.get(o.sup).name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() + '-' + digits(6);
  });

  /* dispute orders: the oldest dispute gets the oldest order, and the lost one belongs to the customer who is now blocked */
  const dPlan = [
    // status, reason code, note, opened (days ago), evidence due (days after opening), submitted (days after), resolved (days after)
    ['lost', 'Fraudulent (10.4)', 'Lost: 3D Secure was not used on this payment', 27, 10, 5, 18],
    ['won', 'Product unacceptable (13.3)', 'Won: delivery proof and consent records accepted', 24, 10, 6, 20],
    ['under_review', 'Fraudulent (10.4)', 'Evidence submitted, waiting for the card network', 16, 8, 5, null],
    ['needs_response', 'Fraudulent (10.4)', 'Customer says they did not make this purchase', 7, 9, null, null],
    ['needs_response', 'Product not received (13.1)', 'Customer says the service was never delivered', 5, 11, null, null],
  ];
  const dPool = orders.filter((o) => !used.has(o) && o.status === 'completed' && o.gross >= 9 && NOW - o.created > 8 * DAY).sort((a, b) => a.created - b.created);
  const disputePlan = dPlan.map((pl) => {
    let openedTs = NOW - pl[3] * DAY;
    let k = dPool.findIndex((o) => !used.has(o) && o.doneAt + 6 * HOUR < openedTs);
    if (k < 0) k = dPool.findIndex((o) => !used.has(o));
    const o = dPool[k]; used.add(o);
    return { o, pl, openedTs: Math.max(openedTs, o.doneAt + 6 * HOUR) };
  });
  disputeOrders = disputePlan.map((x) => x.o);
  { const o = disputePlan[0].o; o.cid = jt.id; o.country = jt.country; o.cur = jt.cur; o.fx = B2C_FX[jt.cur]; const tt = taxFor(o.price, jt.country); o.taxRate = tt.rate; o.tax = tt.tax; o.gross = round(o.price + o.tax, 2); o.pay.method = 'card'; o.pay.brand = 'Visa 4417'; o.fee = gatewayFee(o.gross, 'card'); o.pay.threeDS = false; o.risk = { score: 71, decision: 'review', signals: ['Email on a previous chargeback', 'Disposable email domain'], reviewedBy: 'Lina S.', reviewedAt: o.created + 2 * HOUR, outcome: 'approved' }; o.doneAt = Math.min(NOW - 5e3, o.created + (o.dur || 60e3) + 3 * HOUR); }

  const replyFor = (o, s) => {
    if (s.category === 'Carrier unlock') return 'Unlock confirmed by the carrier. Insert a SIM from another network and restart your phone.';
    if (s.category === 'Apple') return 'iCloud status: Clean. Find My iPhone: OFF. Model: ' + o.device + '.';
    return 'Status: Clean. Carrier: unlocked. Not on the GSMA blacklist.';
  };
  for (const o of orders) {
    const c = cById.get(o.cid), s = sById.get(o.sid), sp = supById.get(o.sup);
    const ev = [];
    ev.push({ ts: o.created, k: 'created', text: 'Order placed on the storefront (' + B2C_COUNTRIES[o.country].name + ', ' + B2C_METHODS[o.pay.method].label + ')', by: c.name });
    ev.push({ ts: o.created + 2000, k: 'paid', text: 'Payment captured ' + localMoney(o.gross, o.cur) + (o.cur !== 'USD' ? ' (' + money(o.gross) + ' at ' + o.fx + ')' : '') + ', ref ' + o.pay.ref, by: 'Payment gateway' });
    ev.push({ ts: o.created + 3000, k: 'risk', text: 'Risk score ' + o.risk.score + ': ' + (o.risk.decision === 'allow' ? 'allowed' : 'held for review'), by: 'Risk engine' });
    if (o.risk.decision === 'review' && o.risk.reviewedBy) ev.push({ ts: o.created + 3 * HOUR - 5 * MIN, k: 'risk', text: 'Risk review: ' + (o.risk.outcome === 'refunded' ? 'refund and block' : 'approved, sent to supplier'), by: o.risk.reviewedBy });
    if (o.status === 'review') ev.push({ ts: Math.max(o.created + 4000, NOW - int(6, 70) * MIN), k: 'review', text: o.reason, by: 'Risk engine' });
    if (o.status !== 'queued' && o.status !== 'review') ev.push({ ts: o.created + (o.risk.reviewedAt ? 3 * HOUR : 6000), k: 'dispatch', text: 'Sent to ' + sp.name + ' (' + sp.api + ')', by: 'System' });
    if (o.status !== 'queued' && o.status !== 'review') ev.push({ ts: o.created + (o.risk.reviewedAt ? 3 * HOUR : 6000) + int(5, 14) * 1000, k: 'ack', text: 'Accepted by supplier, ref ' + o.ref, by: sp.name });
    if (o.attempts > 1) ev.push({ ts: o.created + 20000, k: 'retry', text: 'Attempt 1 failed (timeout), retried', by: 'System' });
    if (o.status === 'completed') {
      o.reply = replyFor(o, s);
      ev.push({ ts: o.doneAt, k: 'completed', text: 'Completed by supplier reply', by: 'System' });
      ev.push({ ts: o.doneAt + 500, k: 'settle', text: 'Settled: revenue ' + money(o.price) + ', cost ' + money(o.cost), by: 'System' });
      ev.push({ ts: o.doneAt + 900, k: 'notify', text: 'Customer emailed the result and a receipt', by: 'System' });
    }
    if (o.status === 'rejected') {
      ev.push({ ts: o.doneAt, k: 'rejected', text: o.reason, by: o.risk.reviewedBy || 'System' });
      ev.push({ ts: o.doneAt + 500, k: 'release', text: 'Refund of ' + localMoney(o.gross, o.cur) + ' sent to the original payment method', by: 'System' });
      o.pay.status = 'refunded';
    }
    o.events = ev;
    o.updated = Math.max(...ev.map((e) => e.ts));
    const clearing = round(o.gross, 2);
    const cap = [{ acct: 'gateway_clearing', dr: o.gross }, { acct: 'customer_funds', cr: o.price }];
    if (o.tax > 0) cap.push({ acct: 'vat_payable', cr: o.tax });
    postTo(S, { ts: o.created + 2000, kind: 'b2c_payment', memo: 'Payment for ' + o.id + ' (' + B2C_METHODS[o.pay.method].label + ')', refType: 'order', refId: o.id, mid: null, by: 'System', entries: cap });
    postTo(S, { ts: o.created + 2500, kind: 'gateway_fee', memo: 'Gateway fee for ' + o.id, refType: 'order', refId: o.id, mid: null, by: 'System', entries: [{ acct: 'gateway_fees', dr: o.fee }, { acct: 'gateway_clearing', cr: o.fee }] });
    if (o.status === 'completed') postTo(S, { ts: o.doneAt + 500, kind: 'order_settle', memo: 'Settle ' + o.id, refType: 'order', refId: o.id, mid: null, by: 'System', entries: [{ acct: 'customer_funds', dr: o.price }, { acct: 'revenue', cr: o.price }, { acct: 'cogs', dr: o.cost }, { acct: 'supplier_prepaid', sid: o.sup, cr: o.cost }] });
    if (o.status === 'rejected') postTo(S, { ts: o.doneAt + 500, kind: 'refund', memo: 'Refund ' + o.id + ' to ' + c.name, refType: 'order', refId: o.id, mid: null, by: 'System', entries: [{ acct: 'customer_funds', dr: o.price }, ...(o.tax > 0 ? [{ acct: 'vat_payable', dr: o.tax }] : []), { acct: 'gateway_clearing', cr: clearing }] });
  }
  S.orders = S.orders.concat(orders).sort((a, b) => a.created - b.created);
  for (const c of S.customers) {
    const mine = orders.filter((o) => o.cid === c.id);
    c.firstOrderAt = mine.length ? mine[0].created : null;
    if (mine.length) c.created = Math.min(c.created, mine[0].created - int(1, 20) * MIN);
  }

  /* ---------- refunds ---------- */
  S.refunds = [];
  let rf = 1000;
  const after = (o, ts) => Math.min(NOW - 5 * MIN, Math.max(ts, o.doneAt + HOUR));
  const mkRefund = (o, x) => { const r = { id: 'RF-' + (++rf), oid: o.id, cid: o.cid, amount: o.gross, cur: o.cur, reason: x.reason, method: 'original', status: x.status, created: x.created, by: x.by, auto: !!x.auto, note: x.note || '', gw: x.status === 'completed' ? 're_' + digits(8) : null, partial: false }; S.refunds.push(r); return r; };
  for (const o of orders.filter((x) => x.status === 'rejected')) mkRefund(o, { reason: o.reason, status: 'completed', created: o.doneAt + 500, by: o.risk.reviewedBy || 'System', auto: !o.risk.reviewedBy });
  const doneRecent = shuffle(orders.filter((o) => o.status === 'completed' && !disputeOrders.includes(o) && NOW - o.doneAt > 2 * HOUR && NOW - o.doneAt < 12 * DAY));
  [['Unlock did not work: phone still asks for a code', T(0, 5)], ['Changed my mind, I no longer need the unlock', T(1, 3)], ['Ordered the wrong service for my carrier', T(2, 7)]].forEach(([why, ts], i) => {
    const o = doneRecent[i]; if (!o) return;
    const r = mkRefund(o, { reason: why, status: 'requested', created: after(o, ts), by: 'Customer' });
    o.events.push({ ts: r.created, k: 'refund', text: 'Customer asked for a refund: ' + why, by: cById.get(o.cid).name });
    o.updated = Math.max(o.updated, r.created);
  });
  { const o = doneRecent[3];
    if (o) {
      const f = 0.4, pn = round(o.price * f, 2), pt = round(o.tax * f, 2);
      const r = mkRefund(o, { reason: 'Goodwill: supplier replied after the promised time', status: 'completed', created: after(o, T(4)), by: 'Lina S.' });
      r.amount = round(pn + pt, 2); r.partial = true;
      postTo(S, { ts: r.created, kind: 'refund', memo: 'Goodwill refund ' + r.id + ' on ' + o.id, refType: 'order', refId: o.id, mid: null, by: 'Lina S.', entries: [{ acct: 'revenue', dr: pn }, ...(pt > 0 ? [{ acct: 'vat_payable', dr: pt }] : []), { acct: 'gateway_clearing', cr: r.amount }] });
      o.pay.status = 'partial_refund';
      o.events.push({ ts: r.created, k: 'refund', text: 'Goodwill refund of ' + localMoney(r.amount, o.cur) + ' sent to the original payment method', by: 'Lina S.' });
      o.updated = Math.max(o.updated, r.created);
    } }
  { const o = doneRecent[4];
    if (o) {
      const r = mkRefund(o, { reason: 'Duplicate payment', status: 'failed', created: after(o, T(1, 2)), by: 'Omar T.', note: 'Gateway error: the card issuer declined the credit. Retry, or refund by bank transfer.' });
      o.events.push({ ts: r.created, k: 'refund', text: 'Refund ' + r.id + ' failed at the gateway', by: 'Omar T.' });
      o.updated = Math.max(o.updated, r.created);
    } }
  S.refunds.sort((a, b) => b.created - a.created);

  /* ---------- disputes ---------- */
  S.disputes = [];
  disputePlan.forEach(({ o, pl, openedTs }, i) => {
    const [st, code, note, , dueD, subD, resD] = pl;
    const c = cById.get(o.cid);
    const at = (d) => (d == null ? null : Math.min(NOW - HOUR, openedTs + d * DAY));
    const dueTs = openedTs + dueD * DAY;
    const res = at(resD);
    S.disputes.push({ id: 'DP-' + (2001 + i), oid: o.id, cid: o.cid, amount: o.gross, cur: o.cur, fee: 15, code, note, status: st, opened: openedTs, due: dueTs, submittedAt: at(subD), resolvedAt: res });
    o.pay.status = 'disputed';
    o.events.push({ ts: openedTs, k: 'dispute', text: 'Dispute opened by the card issuer: ' + code, by: 'Payment gateway' });
    if (st === 'lost') {
      postTo(S, { ts: res, kind: 'chargeback', memo: 'Chargeback lost on ' + o.id + ' (incl. $15 dispute fee)', refType: 'order', refId: o.id, mid: null, by: 'System', entries: [{ acct: 'chargeback_loss', dr: round(o.gross + 15, 2) }, { acct: 'gateway_clearing', cr: round(o.gross + 15, 2) }] });
      o.pay.status = 'chargeback'; c.status = 'blocked'; c.risk = 'high'; c.notes = 'Chargeback lost on ' + o.id + '. Email and card fingerprint added to the blocklist.';
      o.events.push({ ts: res, k: 'dispute', text: 'Dispute lost. Customer blocked and card added to the blocklist', by: 'System' });
    }
    if (st === 'won') {
      postTo(S, { ts: res, kind: 'chargeback', memo: 'Dispute won on ' + o.id + ' (dispute fee kept by the gateway)', refType: 'order', refId: o.id, mid: null, by: 'System', entries: [{ acct: 'chargeback_loss', dr: 15 }, { acct: 'gateway_clearing', cr: 15 }] });
      o.pay.status = 'captured';
      o.events.push({ ts: res, k: 'dispute', text: 'Dispute won: the issuer accepted the delivery proof', by: 'System' });
    }
    o.updated = Math.max(o.updated, ...o.events.map((e) => e.ts));
  });
  S.disputes.sort((a, b) => b.opened - a.opened);

  /* payout of everything older than a week from the gateway to the bank */
  { const old = new Set(orders.filter((o) => NOW - o.created > 7 * DAY).map((o) => o.id));
    const net = round(sum(S.journals.filter((j) => j.refType === 'order' && old.has(j.refId) && j.ts < NOW - 7 * DAY), (j) => sum(j.entries.filter((e) => e.acct === 'gateway_clearing'), (e) => (e.dr || 0) - (e.cr || 0))), 2);
    if (net > 0) postTo(S, { ts: NOW - 7 * DAY, kind: 'settlement', memo: 'Gateway payout to bank (storefront)', refType: 'system', refId: 'gateway', mid: null, by: 'System', entries: [{ acct: 'bank', dr: net }, { acct: 'gateway_clearing', cr: net }] }); }

  /* ---------- IMEI checks and abandoned checkouts ---------- */
  S.imeiChecks = [];
  const chkKinds = [['blacklist', 40], ['basic', 34], ['icloud', 14], ['sim_lock', 12]];
  for (let i = 0; i < 920; i++) {
    const d = wpick(dayW);
    const ts = startOfDay(NOW - d * DAY) + wpick(hourW) * HOUR + int(0, 59) * MIN;
    if (ts > NOW) continue;
    const tac = pick(B2C_TAC), imei = luhn(tac[0] + digits(6));
    const kind = wpick(chkKinds);
    const st = kind === 'sim_lock' ? wpick([['locked', 70], ['clean', 25], ['unknown', 5]]) : kind === 'blacklist' ? wpick([['clean', 88], ['blacklisted', 9], ['unknown', 3]]) : kind === 'icloud' ? wpick([['clean', 80], ['locked', 17], ['unknown', 3]]) : 'clean';
    S.imeiChecks.push({ id: 'IC-' + (8000 + i), ts, imei, brand: tac[1], model: tac[2], kind, status: st, source: chance(0.22) ? 'pre_order' : 'storefront_free', country: pick(['US', 'GB', 'DE', 'FR', 'US', 'ES', 'CA', 'NL']), cost: kind === 'basic' ? 0 : 0.04, converted: null, cached: false });
  }
  S.imeiChecks.sort((a, b) => b.ts - a.ts);
  S.imeiChecks.forEach((ch, i) => { ch.id = 'IC-' + (9900 - i); });
  /* a share of the free checks turned into orders within the hour */
  shuffle(S.imeiChecks.filter((c) => c.status !== 'blacklisted')).slice(0, 96).forEach((c, i) => { c.converted = orders[i].id; c.source = 'pre_order'; });
  S.checkouts = [];
  for (let i = 0; i < 238; i++) {
    const s = wpick(svcPairs);
    const cc = pick(['US', 'GB', 'DE', 'FR', 'US', 'ES', 'CA', 'IE']);
    const net = S.retail[s.code], { tax } = taxFor(net, cc);
    const ts = NOW - (i < 6 ? int(10, 600) : int(10, 29 * 24 * 60)) * MIN;
    const recovered = i % 9 === 3;
    S.checkouts.push({ id: 'CK-' + (3000 + i), email: pick(['sam', 'alex', 'jo', 'maya', 'leo', 'ines', 'ravi', 'tom']) + digits(2) + '@' + pick(domains), country: cc, sid: s.id, gross: round(net + tax, 2), cur: B2C_COUNTRIES[cc].cur, created: ts, step: pick(['payment', 'payment', 'email', 'payment']), recovery: recovered ? 'converted' : ts < NOW - HOUR ? (chance(0.7) ? 'sent' : 'none') : 'pending', status: ts > NOW - 40 * MIN ? 'open' : 'expired', src: pick(['Google', 'Direct', 'Google', 'Blog', 'Facebook']) });
  }
  S.checkouts.sort((a, b) => b.created - a.created);

  /* ---------- support ---------- */
  S.macros = [
    { id: 'mc1', title: 'Order is in progress', cat: 'delay', body: 'Hi {name}, thanks for your patience. Your order {order} is with the carrier and the usual time for this service is {eta}. I will update you as soon as it moves. If it is not done by then, we refund you in full.' },
    { id: 'mc2', title: 'Wrong IMEI entered', cat: 'wrong_imei', body: 'Hi {name}, the IMEI on {order} does not match the phone model you selected. Please reply with the IMEI from *#06# on the phone and we will correct the order before it is sent.' },
    { id: 'mc3', title: 'How to enter the unlock code', cat: 'howto', body: 'Hi {name}, insert a SIM card from a different network, restart the phone and enter the unlock code when asked. For iPhone, no code is needed: connect to Wi-Fi and restart, then follow the prompts.' },
    { id: 'mc4', title: 'Refund approved', cat: 'refund', body: 'Hi {name}, your refund for {order} has been issued to the original payment method. It usually shows up within 5 to 10 business days, depending on your bank.' },
    { id: 'mc5', title: 'Refund not possible after delivery', cat: 'refund', body: 'Hi {name}, {order} was delivered and the service was completed, so under our terms it cannot be refunded. If the phone is still locked, send us a photo of the message on the screen and we will check it again.' },
    { id: 'mc6', title: 'Failed unlock: refund issued', cat: 'failed_unlock', body: 'Hi {name}, the carrier rejected the unlock for {order}, so we refunded the full amount. The refund is on its way to your original payment method.' },
    { id: 'mc7', title: 'Invoice request', cat: 'billing', body: 'Hi {name}, your receipt for {order} is attached. If you need a VAT invoice with your company details, reply with the company name, address and VAT number.' },
    { id: 'mc8', title: 'Eligibility question', cat: 'presale', body: 'Hi {name}, we can check the IMEI for free before you pay. Send it here, or use the checker on the website. If the device is blacklisted or not eligible, we will tell you before you order.' },
  ];
  S.tickets = [];
  let tk = 4200;
  const nameOf = (id) => (cById.get(id) || mer(id) || { name: 'Customer' }).name;
  const firstName = (id) => nameOf(id).split(' ')[0];
  const mkTicket = (who, cat, prio, channel, subject, msgs, o2 = {}) => {
    const id = 'T-' + (++tk);
    const created = o2.created;
    const t = { id, subject, channel, who, oid: o2.oid || null, cat, prio, status: o2.status || 'open', assignee: o2.assignee === undefined ? null : o2.assignee, created, updated: msgs.length ? msgs[msgs.length - 1].ts : created, slaDue: created + PRIO_TARGET[prio], firstReplyAt: null, csat: o2.csat || null, msgs };
    const fr = msgs.find((m) => m.by === 'staff');
    if (fr) t.firstReplyAt = fr.ts;
    S.tickets.push(t);
    return t;
  };
  const B = (pred, k = 0) => shuffle(orders.filter(pred))[k];
  const m = (by, name, hoursAgo, text) => ({ by, name, ts: NOW - hoursAgo * HOUR, text });
  const live = orders.filter((o) => o.status === 'processing' && sById.get(o.sid).sla >= 720);
  const doneOrders = shuffle(orders.filter((o) => o.status === 'completed' && !disputeOrders.includes(o)));
  const rejOrders = orders.filter((o) => o.status === 'rejected');
  const D1 = doneOrders[0], D2 = doneOrders[1], D3 = doneOrders[2], D4 = doneOrders[3], D5 = doneOrders[4], D6 = doneOrders[5], D7 = doneOrders[6], D8 = doneOrders[7];
  const Lv = live[0] || doneOrders[8];
  const tCust = (o, cat, prio, channel, subject, msgs, extra = {}) => mkTicket({ type: 'customer', id: o.cid }, cat, prio, channel, subject, msgs, { oid: o.id, ...extra });
  tCust(Lv, 'delay', 'high', 'email', 'Order ' + Lv.id + ' is taking longer than expected', [m('customer', firstName(Lv.cid), 3.4, 'Hi, I ordered the unlock 2 days ago and nothing has happened yet. Is something wrong?')], { created: NOW - 3.4 * HOUR, status: 'new' });
  tCust(D1, 'failed_unlock', 'high', 'web', 'Phone still locked after unlock (' + D1.id + ')', [m('customer', firstName(D1.cid), 9, 'I got the email saying completed but my phone still says SIM not supported.'), m('staff', 'Lina S.', 7.8, 'Hi, thanks for telling us. Please restart the phone with the new SIM inside and send me a photo of the message on screen.'), m('customer', firstName(D1.cid), 2.1, 'Here is the photo. Same message after restart.')], { created: NOW - 9 * HOUR, status: 'open', assignee: 'Lina S.' });
  tCust(D2, 'refund', 'normal', 'email', 'Refund request for ' + D2.id, [m('customer', firstName(D2.cid), 30, 'I would like to cancel and get a refund, I found another way to unlock.'), m('staff', 'Lina S.', 28, 'Hi, the order was already completed, so a refund is not possible under the terms. I am sorry. Let me know if anything is unclear.'), m('customer', firstName(D2.cid), 26, 'OK understood, thanks.')], { created: NOW - 30 * HOUR, status: 'pending', assignee: 'Lina S.' });
  tCust(D3, 'wrong_imei', 'normal', 'chat', 'Wrong IMEI on ' + D3.id, [m('customer', firstName(D3.cid), 51, 'I typed the IMEI of my old phone by mistake. Can you change it?'), m('staff', 'Rami K.', 50, 'Hi, the order was already sent. Can you give me the correct IMEI and I will check what can be done?'), m('note', 'Lina S.', 49, 'Supplier cannot change IMEI after dispatch. Refund and ask them to reorder.'), m('staff', 'Lina S.', 47, 'We refunded the order so you can place it again with the right IMEI. Sorry for the trouble.')], { created: NOW - 51 * HOUR, status: 'resolved', assignee: 'Lina S.', csat: 4 });
  tCust(D4, 'howto', 'low', 'web', 'How do I enter the unlock code?', [m('customer', firstName(D4.cid), 72, 'Got the result but I do not know where to type the code on a Galaxy.'), m('staff', 'Lina S.', 70.5, S.macros[2].body.replace('{name}', firstName(D4.cid)))], { created: NOW - 72 * HOUR, status: 'resolved', assignee: 'Lina S.', csat: 5 });
  tCust(D5, 'billing', 'normal', 'email', 'Charged twice for ' + D5.id, [m('customer', firstName(D5.cid), 20, 'My bank shows two payments for this order. Please check.'), m('staff', 'Omar T.', 17, 'We see one captured payment and one authorisation that was released. The extra hold should vanish in a few days.')], { created: NOW - 20 * HOUR, status: 'pending', assignee: 'Omar T.' });
  tCust(D6, 'delay', 'normal', 'telegram', 'Where is my result? ' + D6.id, [m('customer', firstName(D6.cid), 6, 'Hello, 20 minutes passed and no result yet.')], { created: NOW - 6 * HOUR, status: 'new' });
  tCust(D7, 'billing', 'low', 'email', 'VAT invoice for ' + D7.id, [m('customer', firstName(D7.cid), 40, 'Can I get an invoice with my company name?'), m('staff', 'Lina S.', 33, S.macros[6].body.replace('{name}', firstName(D7.cid)).replace('{order}', D7.id))], { created: NOW - 40 * HOUR, status: 'resolved', assignee: 'Lina S.', csat: 5 });
  if (rejOrders[0]) tCust(rejOrders[0], 'failed_unlock', 'normal', 'email', 'Order ' + rejOrders[0].id + ' was rejected', [m('customer', firstName(rejOrders[0].cid), 14, 'You rejected my order. Was I charged?'), m('staff', 'Lina S.', 12.5, S.macros[5].body.replace('{name}', firstName(rejOrders[0].cid)).replace('{order}', rejOrders[0].id))], { created: NOW - 14 * HOUR, status: 'resolved', assignee: 'Lina S.', csat: 4 });
  mkTicket({ type: 'customer', id: 'c9' }, 'presale', 'low', 'web', 'Is an iPhone 12 from AT&T eligible?', [m('customer', 'Jessica', 5, 'Before I pay: my iPhone 12 was bought on a payment plan with AT&T and I finished paying last month. Can it be unlocked?')], { created: NOW - 5 * HOUR, status: 'new' });
  mkTicket({ type: 'customer', id: 'c21' }, 'presale', 'low', 'chat', 'Do you unlock Vodafone UK Pixel phones?', [m('customer', 'Samira', 11, 'Looking for Pixel 7 on Vodafone UK.'), m('staff', 'Lina S.', 10.7, S.macros[7].body.replace('{name}', 'Samira'))], { created: NOW - 11 * HOUR, status: 'pending', assignee: 'Lina S.' });
  mkTicket({ type: 'customer', id: 'c19' }, 'refund', 'high', 'email', 'Chargeback warning from my bank', [m('customer', 'Jack', 26, 'My bank told me to contact you first, I did not authorise the payment.'), m('note', 'Rami K.', 25, 'Customer matches the lost dispute and is already blocklisted. Do not refund. Do not reopen.')], { created: NOW - 26 * HOUR, status: 'open', assignee: 'Rami K.' });
  /* merchant (B2B) tickets share the same inbox */
  mkTicket({ type: 'client', id: 'm5' }, 'billing', 'high', 'telegram', 'Deposit PAY-1037 not showing in the wallet', [m('customer', 'Cairo GSM Lab', 7, 'I sent the USDT transfer an hour ago, tx hash attached. Wallet still shows the old balance.'), m('staff', 'Omar T.', 6.2, 'We see the deposit waiting for review. I am checking the hash now.')], { created: NOW - 7 * HOUR, status: 'open', assignee: 'Omar T.' });
  mkTicket({ type: 'client', id: 'm2' }, 'delay', 'normal', 'email', 'Rapid IMEI orders replying slowly today', [m('customer', 'Al-Noor Telecom', 4, 'Our IMEI checks take 3 minutes instead of seconds. Is it on your side?')], { created: NOW - 4 * HOUR, status: 'new' });
  mkTicket({ type: 'client', id: 'm10' }, 'other', 'low', 'email', 'API returns 429 for bulk orders', [m('customer', 'Karachi Unlock Hub', 55, 'We send 40 orders in a loop and get 429 after 20.'), m('staff', 'Rami K.', 52, 'The limit is 20 requests per minute per key. Use the bulk endpoint, one call for up to 50 orders.')], { created: NOW - 55 * HOUR, status: 'resolved', assignee: 'Rami K.', csat: 5 });
  S.tickets.sort((a, b) => b.updated - a.updated);
  S.seq.tk = tk;

  /* ---------- storefront content ---------- */
  S.landing = [
    ['Unlock iPhone on AT&T', 'carrier', 'published', 5480, 21], ['Unlock iPhone on T-Mobile', 'carrier', 'published', 4310, 17], ['Vodafone UK iPhone unlock', 'carrier', 'published', 2290, 12], ['EE iPhone unlock', 'carrier', 'published', 1580, 7],
    ['Orange France iPhone unlock', 'carrier', 'published', 640, 2], ['Check if an IMEI is blacklisted', 'tool', 'published', 7210, 9], ['iCloud status check', 'tool', 'published', 3650, 11], ['Unlock Galaxy S23', 'model', 'published', 980, 3],
    ['Unlock iPhone 14 Pro', 'model', 'published', 1430, 5], ['Unlock iPhone 13', 'model', 'published', 1920, 7], ['Samsung KG lock fix', 'brand', 'draft', 0, 0], ['Unlock Redmi Note 12', 'model', 'noindex', 90, 0],
    ['Unlock phones in Germany', 'country', 'draft', 0, 0], ['Verizon iPhone unlock', 'carrier', 'published', 1740, 8],
  ].map(([title, kind, status, views, ords], i) => ({ id: 'lp' + (i + 1), title, slug: slugOf(title), kind, status, views, orders: ords, langs: i % 3 === 2 ? 'EN' : 'EN, AR', updated: NOW - int(1, 40) * DAY, note: status === 'noindex' ? 'Thin content: only 90 visits and no unique text yet' : status === 'draft' ? 'Not published' : '' }));
  S.pages = [
    { id: 'pg1', title: 'About us', kind: 'static', slug: 'about', status: 'published', langs: 'EN, AR', updated: NOW - 33 * DAY },
    { id: 'pg2', title: 'How unlocking works', kind: 'static', slug: 'how-it-works', status: 'published', langs: 'EN, AR', updated: NOW - 12 * DAY },
    { id: 'pg3', title: 'Contact and support hours', kind: 'static', slug: 'contact', status: 'published', langs: 'EN, AR', updated: NOW - 18 * DAY },
    { id: 'pg4', title: 'How to know if your iPhone is locked', kind: 'blog', slug: 'is-my-iphone-locked', status: 'published', langs: 'EN', updated: NOW - 9 * DAY },
    { id: 'pg5', title: 'Why is my phone on the blacklist?', kind: 'blog', slug: 'phone-blacklisted-why', status: 'published', langs: 'EN', updated: NOW - 21 * DAY },
    { id: 'pg6', title: 'Unlocking vs jailbreaking', kind: 'blog', slug: 'unlock-vs-jailbreak', status: 'draft', langs: 'EN', updated: NOW - 2 * DAY },
  ];
  S.legal = [
    { id: 'lg1', type: 'Terms of service', version: '3.2', lang: 'EN', effective: NOW - 40 * DAY, current: true, accepted: orders.length + 21, needs: false },
    { id: 'lg2', type: 'Terms of service', version: '3.2', lang: 'AR', effective: NOW - 40 * DAY, current: true, accepted: 14, needs: false },
    { id: 'lg3', type: 'Privacy policy', version: '2.1', lang: 'EN', effective: NOW - 75 * DAY, current: true, accepted: orders.length + 21, needs: false },
    { id: 'lg4', type: 'Refund policy', version: '1.4', lang: 'EN', effective: NOW - 40 * DAY, current: true, accepted: orders.length + 21, needs: false },
    { id: 'lg5', type: 'Cookie policy', version: '1.0', lang: 'EN', effective: NOW - 120 * DAY, current: true, accepted: 0, needs: false },
    { id: 'lg6', type: 'Terms of service', version: '3.1', lang: 'EN', effective: NOW - 160 * DAY, current: false, accepted: 38, needs: false },
  ];
  S.help = [
    ['Orders', 'How long does a carrier unlock take?', 142, 9], ['Orders', 'Can I cancel my order?', 96, 31], ['Orders', 'Where is my order?', 251, 22], ['Unlocking', 'How do I enter the unlock code?', 188, 14],
    ['Unlocking', 'My phone is still locked after unlocking', 77, 52], ['Unlocking', 'Will unlocking void my warranty?', 64, 5], ['Payments', 'Which payment methods do you accept?', 101, 6], ['Payments', 'Why was I charged VAT?', 48, 17],
    ['Payments', 'How do refunds work?', 133, 40], ['IMEI', 'How do I find my IMEI?', 301, 12], ['IMEI', 'What does blacklisted mean?', 119, 8], ['Privacy', 'How long do you keep my IMEI?', 31, 4],
  ].map(([cat, q, yes, no], i) => ({ id: 'h' + (i + 1), cat, q, yes, no, status: i === 11 ? 'draft' : 'published' }));

  /* ---------- risk ---------- */
  S.risk = {
    rules: [
      { id: 'rr1', label: 'Block blacklisted IMEIs before payment', hint: 'Looked up in the GSMA blacklist at checkout. The customer sees why and is not charged.', on: true, value: null },
      { id: 'rr2', label: 'Hold orders scoring at least', hint: 'Held orders wait in the risk queue and are not sent to a supplier.', on: true, value: 50, unit: 'points' },
      { id: 'rr3', label: 'Block orders scoring at least', hint: 'The payment is cancelled automatically.', on: true, value: 80, unit: 'points' },
      { id: 'rr4', label: 'Maximum orders per email in 24 hours', hint: 'Stops card testing and scripted abuse.', on: true, value: 3, unit: 'orders' },
      { id: 'rr5', label: 'Hold the first order of a new customer above', hint: 'First orders above this amount are held for a person to look at.', on: true, value: 40, unit: 'USD' },
      { id: 'rr6', label: 'Require 3D Secure on card payments', hint: 'Moves chargeback liability to the card issuer for most fraud disputes.', on: true, value: null },
      { id: 'rr7', label: 'Hold when the IP country differs from the card country', hint: 'Adds 25 points to the score.', on: true, value: null },
      { id: 'rr8', label: 'Block disposable email domains', hint: 'Temporary mailboxes cannot receive the result reliably.', on: false, value: null },
    ],
    block: [
      { id: 'bl1', kind: 'email', display: 'jt.****@tempbox.example', reason: 'Chargeback lost', source: 'chargeback', by: 'System', ts: T(9) },
      { id: 'bl2', kind: 'card', display: 'Visa fingerprint fp_9f2…c1a', reason: 'Chargeback lost', source: 'chargeback', by: 'System', ts: T(9) },
      { id: 'bl3', kind: 'domain', display: 'tempbox.example', reason: 'Disposable mailbox provider', source: 'manual', by: 'Rami K.', ts: T(21) },
      { id: 'bl5', kind: 'imei', display: fmtImei(luhn('35389011884201')), reason: 'Reported stolen by the previous owner', source: 'manual', by: 'Lina S.', ts: T(6) },
      { id: 'bl6', kind: 'country', display: 'Region under sanctions', reason: 'Compliance: orders and payments not accepted', source: 'manual', by: 'Rami K.', ts: T(90) },
    ],
  };

  /* ---------- admins and network access ---------- */
  const FUT = (hours) => NOW + hours * HOUR;
  S.admins = [
    { id: 'ad1', name: 'Rami K.', email: 'rami@gsm-supply.example', role: 'owner', status: 'active', twofa: true, lastLogin: NOW - 12 * MIN, lastIp: '203.0.113.24', sessions: 2, createdAt: T(36), createdBy: 'Setup', pwChangedAt: T(60), mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' },
    { id: 'ad2', name: 'Lina S.', email: 'lina@gsm-supply.example', role: 'support', status: 'active', twofa: true, lastLogin: NOW - 41 * MIN, lastIp: '203.0.113.31', sessions: 1, createdAt: T(34), createdBy: 'Rami K.', pwChangedAt: T(34), mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' },
    { id: 'ad3', name: 'Omar T.', email: 'omar@gsm-supply.example', role: 'finance', status: 'active', twofa: true, lastLogin: NOW - 3 * HOUR, lastIp: '198.51.100.77', sessions: 1, createdAt: T(30), createdBy: 'Rami K.', pwChangedAt: T(30), mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' },
    { id: 'ad4', name: 'Dana M.', email: 'dana@gsm-supply.example', role: 'admin', status: 'active', twofa: true, lastLogin: T(1, 5), lastIp: '203.0.113.31', sessions: 0, createdAt: T(22), createdBy: 'Rami K.', pwChangedAt: T(22), mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' },
    { id: 'ad5', name: 'Nadia H.', email: 'nadia@gsm-supply.example', role: 'risk', status: 'invited', twofa: false, lastLogin: null, lastIp: null, sessions: 0, createdAt: NOW - 20 * MIN, createdBy: 'Rami K.', pwChangedAt: null, mustChangePw: false, resetSentAt: NOW - 20 * MIN, suspendedAt: null, suspendedReason: '' },
    { id: 'ad6', name: 'Yusuf A.', email: 'yusuf@gsm-supply.example', role: 'viewer', status: 'suspended', twofa: true, lastLogin: T(12), lastIp: '203.0.113.90', sessions: 0, createdAt: T(33), createdBy: 'Rami K.', pwChangedAt: T(33), mustChangePw: false, resetSentAt: null, suspendedAt: T(5), suspendedReason: 'Left the team', prevStatus: 'active' },
  ];
  S.access = { restrict: true };
  S.ipRules = [
    { id: 'ip1', kind: 'allow', cidr: '203.0.113.24', scope: 'admin', label: 'Rami, Amman office', reason: '', source: 'manual', by: 'Rami K.', ts: T(36), expires: null, hits: 412, lastHit: NOW - 12 * MIN },
    { id: 'ip2', kind: 'allow', cidr: '203.0.113.31', scope: 'admin', label: 'Lina and Dana, Amman office', reason: '', source: 'manual', by: 'Rami K.', ts: T(34), expires: null, hits: 366, lastHit: NOW - 41 * MIN },
    { id: 'ip3', kind: 'allow', cidr: '198.51.100.77', scope: 'admin', label: 'Omar, working from home', reason: '', source: 'manual', by: 'Rami K.', ts: T(2), expires: FUT(24 * 5), hits: 98, lastHit: NOW - 3 * HOUR },
    { id: 'ip4', kind: 'block', cidr: '192.0.2.0/24', scope: 'store', label: '', reason: 'Card testing, 60 attempts in 10 minutes', source: 'auto', by: 'Risk engine', ts: T(14), expires: FUT(24 * 16), hits: 183, lastHit: NOW - 6 * HOUR },
    { id: 'ip5', kind: 'block', cidr: '198.51.100.200', scope: 'admin', label: '', reason: 'Repeated failed admin sign-ins, 31 in one hour', source: 'auto', by: 'Risk engine', ts: T(3), expires: FUT(24 * 4), hits: 54, lastHit: T(1) },
    { id: 'ip6', kind: 'block', cidr: '203.0.113.160/28', scope: 'api', label: '', reason: 'A merchant key scraping the price list, about 4,000 requests an hour', source: 'manual', by: 'Rami K.', ts: T(6), expires: null, hits: 1240, lastHit: NOW - 25 * MIN },
    { id: 'ip7', kind: 'block', cidr: '198.51.100.231', scope: 'all', label: '', reason: 'Account takeover attempts on customer and admin logins', source: 'manual', by: 'Rami K.', ts: T(2), expires: FUT(24 * 5), hits: 37, lastHit: T(1, 3) },
  ];
  S.seq.ad = 6; S.seq.ip = 7;

  /* ---------- settings ---------- */
  S.settings = {
    gateways: [
      { id: 'gw1', name: 'Card gateway', desc: 'Hosted checkout page, 3D Secure, Apple Pay and Google Pay', audience: 'B2C', methods: 'card, wallet', fee: '2.9% + $0.30', refunds: true, threeDS: true, on: true, mode: 'Live', volume: round(sum(orders.filter((o) => o.pay.method !== 'crypto'), (o) => o.gross), 2) },
      { id: 'gw2', name: 'Crypto gateway', desc: 'USDT and BTC invoices with confirmation tracking', audience: 'B2C and B2B', methods: 'crypto', fee: '1%', refunds: false, threeDS: false, on: true, mode: 'Live', volume: round(sum(orders.filter((o) => o.pay.method === 'crypto'), (o) => o.gross), 2) },
      { id: 'gw3', name: 'Bank transfer', desc: 'Manual review of the receipt', audience: 'B2B', methods: 'bank', fee: 'Free', refunds: false, threeDS: false, on: true, mode: 'Manual', volume: 0 },
      { id: 'gw4', name: 'Wise', desc: 'Manual review of the transfer', audience: 'B2B', methods: 'wise', fee: 'Free', refunds: false, threeDS: false, on: true, mode: 'Manual', volume: 0 },
    ],
    taxes: Object.entries(B2C_COUNTRIES).map(([cc, c], i) => ({ cc, name: c.name, rate: c.vat * 100, type: c.vat ? 'VAT' : 'None', scheme: ['GB'].includes(cc) ? 'UK VAT' : ['SE', 'DE', 'FR', 'NL', 'IE', 'ES', 'IT'].includes(cc) ? 'EU OSS' : 'Not collected', since: NOW - (200 + i * 3) * DAY })),
    currencies: Object.entries(B2C_FX).map(([code, rate]) => ({ code, rate, markup: code === 'USD' ? 0 : 1.5, updated: code === 'SEK' ? NOW - 74 * HOUR : NOW - int(1, 5) * HOUR, shown: true, charm: code !== 'USD' })),
    policies: { guestCheckout: true, require3ds: true, withdrawalWaiver: true, autoRefundFailed: true, imeiPrecheck: true, imeiRetentionDays: 180, abandonedMinutes: 60, refundHoursBeforeDispatch: 1 },
    notifs: [
      { id: 'nt1', event: 'Order received and receipt', audience: 'Customer', on: true, sent: orders.length + 8, delay: 'Immediately' },
      { id: 'nt2', event: 'Result delivered', audience: 'Customer', on: true, sent: orders.filter((o) => o.status === 'completed').length, delay: 'Immediately' },
      { id: 'nt3', event: 'Order failed, refund issued', audience: 'Customer', on: true, sent: orders.filter((o) => o.status === 'rejected').length, delay: 'Immediately' },
      { id: 'nt4', event: 'Support reply', audience: 'Customer', on: true, sent: 41, delay: 'Immediately' },
      { id: 'nt5', event: 'Abandoned checkout reminder', audience: 'Customer', on: true, sent: 17, delay: '60 minutes after leaving' },
      { id: 'nt6', event: 'Payment failed', audience: 'Customer', on: false, sent: 0, delay: 'Immediately' },
    ],
  };
  S.dsr = [
    { id: 'DSR-31', cid: 'c4', kind: 'export', status: 'done', requested: T(12), due: T(-18), done: T(10) },
    { id: 'DSR-32', cid: 'c16', kind: 'erasure', status: 'open', requested: T(3), due: T(-27), done: null },
  ];
  S.consents = null; // consent evidence is derived per order, see consentsFor()
  S.seq.rf = rf; S.seq.dp = 2005; S.seq.ck = 3237; S.seq.bl = 6;

  return {
    audit: [
      [10, 'Rami K.', 'turned on', 'setting', 'require3ds', 'Require 3D Secure on card payments', [{ field: 'require_3ds', from: 'false', to: 'true' }]],
      [9, 'System', 'blocked customer', 'customer', jt.id, jt.name, [{ field: 'status', from: 'active', to: 'blocked' }, { field: 'reason', from: '', to: 'Chargeback lost on ' + (S.disputes.find((d) => d.status === 'lost') || { oid: '' }).oid }]],
      [8, 'Lina S.', 'published listing', 'listing', 's5', 'AT&T USA Premier Unlock', [{ field: 'is_listed', from: 'false', to: 'true' }]],
      [6, 'Lina S.', 'added to blocklist', 'blocklist', 'bl5', 'IMEI ' + fmtImei(luhn('35389011884201')), [{ field: 'reason', from: '', to: 'Reported stolen by the previous owner' }]],
      [5, 'Omar T.', 'set exchange markup', 'setting', 'fx', 'GBP, EUR, SEK, CAD', [{ field: 'markup', from: '1.0%', to: '1.5%' }]],
      [4, 'Rami K.', 'unlisted from storefront', 'listing', 's11', 'MDM Removal, iPhone Premium', [{ field: 'is_listed', from: 'true', to: 'false' }, { field: 'reason', from: '', to: 'High risk: stolen devices' }]],
      [3, 'Lina S.', 'issued refund', 'refund', 'RF-1001', 'Goodwill refund on a delayed unlock', [{ field: 'status', from: 'requested', to: 'completed' }]],
      [2, 'Rami K.', 'approved after risk review', 'order', orders[orders.length - 40].id, orders[orders.length - 40].id + ' for ' + nameOf(orders[orders.length - 40].cid), [{ field: 'risk_decision', from: 'review', to: 'approved' }]],
      [1, 'System', 'published legal document', 'legal', 'lg1', 'Terms of service 3.2 (EN)', [{ field: 'version', from: '3.1', to: '3.2' }]],
    ],
  };
}
