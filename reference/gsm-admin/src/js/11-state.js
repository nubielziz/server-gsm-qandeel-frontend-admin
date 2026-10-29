/* State: the store, UI state, selectors and mutations. Every mutation posts to the ledger and the audit log. */
let S = seed();
const IDX = {};
function reindex() {
  IDX.m = new Map(S.merchants.map((x) => [x.id, x]));
  IDX.s = new Map(S.services.map((x) => [x.id, x]));
  IDX.sup = new Map(S.suppliers.map((x) => [x.id, x]));
  IDX.o = new Map(S.orders.map((x) => [x.id, x]));
  IDX.p = new Map(S.payments.map((x) => [x.id, x]));
  IDX.w = new Map(S.withdrawals.map((x) => [x.id, x]));
  IDX.c = new Map(S.customers.map((x) => [x.id, x]));
  IDX.t = new Map(S.tickets.map((x) => [x.id, x]));
}
reindex();
const mer = (id) => IDX.m.get(id);
const svc = (id) => IDX.s.get(id);
const sup = (id) => IDX.sup.get(id);
const ord = (id) => IDX.o.get(id);
const pay = (id) => IDX.p.get(id);
const cus = (id) => IDX.c.get(id);
const tkt = (id) => IDX.t.get(id);
const isB2C = (o) => !!o.cid;
/* who bought it: a merchant on the API or portal, or a storefront customer */
const buyerOf = (o) => {
  if (o.cid) { const c = cus(o.cid); return { kind: 'b2c', id: c.id, name: c.name, sub: B2C_COUNTRIES[c.country].name, tag: 'Retail' }; }
  const m = mer(o.mid); return { kind: 'b2b', id: m.id, name: m.name, sub: m.cc + ' · ' + GROUPS.find((g) => g.id === m.group).name, tag: GROUPS.find((g) => g.id === m.group).name };
};
const inScope = (o, scope) => (scope === 'b2c' ? isB2C(o) : scope === 'b2b' ? !isB2C(o) : true);

const ui = {
  mode: 'normal', // normal | loading | empty | error
  period: 7, // days for the stat strip
  chartRange: '30D', chartView: 'chart',
  scope: 'all', // dashboard only: all | b2b | b2c
  orders: { tab: 'all', flag: '', q: '', type: '', sup: '', mer: '', chan: '', sort: 'created', dir: -1, page: 1, sel: new Set() },
  merchants: { tab: 'all', q: '', sort: 'spend', dir: -1, page: 1, detailTab: 'orders' },
  services: { q: '', type: '', flag: '', sort: 'type', dir: 1, rm: 'm1', rs: 's5' },
  suppliers: { sel: 'sup3', paused: false },
  finance: { tab: 'ledger', kind: '', q: '', open: new Set(), page: 1, payTab: 'pending' },
  commissions: { tab: 'accruals', status: 'accrued', agent: '', sel: new Set() },
  audit: { q: '', actor: '', type: '' },
  customers: { q: '', tab: 'all', country: '', sort: 'spent', dir: -1, page: 1, detailTab: 'orders' },
  support: { sel: null, filter: 'open', who: 'all', q: '', draft: {}, internal: false },
  storefront: { tab: 'listings', lpKind: '', pv: { step: 1, imei: '', sid: '', email: '', country: 'GB', method: 'card', consent: false, waiver: false, order: null, err: '' } },
  checkouts: { cf: 'remind' },
  refunds: { tab: 'refunds', status: '', page: 1 },
  risk: { tab: 'queue', q: '', kind: '' },
  settings: { tab: 'payments' },
  access: { tab: 'admins', scope: 'all', test: { ip: '', scope: 'admin', res: null } },
  acA: { sort: 'name', dir: 1, page: 1 },
  acB: { sort: 'ts', dir: -1, page: 1 },
  acL: { sort: 'ts', dir: -1, page: 1 },
};
const D = (arr) => (ui.mode === 'empty' ? [] : arr);
const bus = [];
const onChange = (f) => bus.push(f);
const changed = () => bus.forEach((f) => f());

/* ---------- selectors ---------- */
const isOpen = (o) => OPEN.includes(o.status);
const walletOf = (mid) => S.wallet[mid] || 0;
const holdOf = (mid) => S.hold[mid] || 0;
const slaMs = (o) => svc(o.sid).sla * MIN;
const isBreach = (o) => (o.status === 'processing' || o.status === 'queued') && Date.now() - o.created > slaMs(o);
const ageMs = (o) => (isOpen(o) ? Date.now() : o.doneAt || o.updated) - o.created;
function statsFor(from, to, scope = 'all') {
  const os = S.orders.filter((o) => o.created >= from && o.created < to && inScope(o, scope));
  const done = os.filter((o) => o.status === 'completed');
  const rej = os.filter((o) => o.status === 'rejected');
  const revenue = sum(done, (o) => o.price);
  const cost = sum(done, (o) => o.cost);
  const turn = done.map((o) => o.doneAt - o.created).sort((a, b) => a - b);
  return { orders: os.length, revenue, profit: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0, success: done.length + rej.length ? (done.length / (done.length + rej.length)) * 100 : 0, median: turn.length ? turn[Math.floor(turn.length / 2)] : 0 };
}
const periodStats = (days, scope = 'all') => ({ cur: statsFor(NOW - days * DAY, Date.now() + 1, scope), prev: statsFor(NOW - 2 * days * DAY, NOW - days * DAY, scope) });
function daily(days, scope = 'all') {
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const t0 = startOfDay(NOW - i * DAY);
    const row = { ts: t0, label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(t0), IMEI: 0, Server: 0, Remote: 0, File: 0 };
    rows.push(row);
  }
  const first = rows[0].ts;
  for (const o of S.orders) {
    if (o.created < first || !inScope(o, scope)) continue;
    const idx = Math.floor((startOfDay(o.created) - first) / DAY + 0.5);
    if (rows[idx]) rows[idx][svc(o.sid).type]++;
  }
  return rows;
}
/* completed revenue per day, split by channel (B2B API and portal vs B2C storefront) */
function dailyRevenue(days) {
  const rows = [];
  for (let i = days - 1; i >= 0; i--) { const t0 = startOfDay(NOW - i * DAY); rows.push({ ts: t0, label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(t0), B2B: 0, B2C: 0 }); }
  const first = rows[0].ts;
  for (const o of S.orders) {
    if (o.status !== 'completed' || o.doneAt < first) continue;
    const idx = Math.floor((startOfDay(o.doneAt) - first) / DAY + 0.5);
    if (rows[idx]) rows[idx][isB2C(o) ? 'B2C' : 'B2B'] += o.price;
  }
  rows.forEach((r) => { r.B2B = Math.round(r.B2B); r.B2C = Math.round(r.B2C); });
  return rows;
}
const monthly = () => S.monthly.map((r) => ({ ...r, label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(r.ts) }));
function queueByType(scope = 'all') {
  return TYPES.map((t) => {
    const os = S.orders.filter((o) => isOpen(o) && svc(o.sid).type === t && inScope(o, scope));
    const oldest = os.reduce((a, o) => Math.max(a, Date.now() - o.created), 0);
    return { type: t, open: os.length, review: os.filter((o) => o.status === 'review').length, breach: os.filter(isBreach).length, oldest };
  });
}
function supMetrics(sid) {
  const sp = sup(sid);
  const open = S.orders.filter((o) => o.sup === sid && isOpen(o));
  const cogs7 = sum(S.orders.filter((o) => o.sup === sid && o.status === 'completed' && Date.now() - o.doneAt < 7 * DAY), (o) => o.cost);
  const burn = cogs7 / 7;
  const bal = S.prepaid[sid] || 0;
  return { queue: open.length, review: open.filter((o) => o.status === 'review').length, services: S.services.filter((s) => s.sup === sid).length, fallbackFor: S.services.filter((s) => s.fb === sid).length, balance: bal, burn, runway: burn > 0 ? bal / burn : Infinity, low: bal < sp.minBalance || (burn > 0 && bal / burn < 2) };
}
function merStats(mid, days = 30) {
  const os = S.orders.filter((o) => o.mid === mid && Date.now() - o.created < days * DAY);
  const done = os.filter((o) => o.status === 'completed'), rej = os.filter((o) => o.status === 'rejected');
  return { orders: os.length, spend: sum(os.filter((o) => o.status !== 'rejected'), (o) => o.price), profit: sum(done, (o) => o.price - o.cost), success: done.length + rej.length ? (done.length / (done.length + rej.length)) * 100 : null };
}
const belowFloor = () => S.services.filter((s) => s.status === 'active' && s.price < s.cost + s.minProfit - 0.004);
const walletLow = (m) => walletOf(m.id) < 0;
const pendingPayments = () => S.payments.filter((p) => p.status === 'pending');
const pendingWithdrawals = () => S.withdrawals.filter((w) => w.status === 'pending');
const accrued = () => S.accruals.filter((a) => a.status === 'accrued');

function attention(scope = 'all') {
  const items = [];
  const want = (k) => scope === 'all' || k === scope; // 'b2b' and 'b2c' items; shared items are always included
  const open = S.orders.filter((o) => isOpen(o) && inScope(o, scope));
  const breach = open.filter(isBreach).sort((a, b) => a.created - b.created);
  if (breach.length) {
    const w = breach[0];
    items.push({ id: 'sla', sev: 'crit', icon: 'clock', title: breach.length + (breach.length === 1 ? ' order is' : ' orders are') + ' past SLA', meta: 'Oldest ' + w.id + ', ' + ageText(Date.now() - w.created - slaMs(w)) + ' over its ' + ageText(slaMs(w)) + ' target', cta: 'Open orders', go: { route: 'orders', tab: 'open', flag: 'sla' } });
  }
  const rev = open.filter((o) => o.status === 'review' && !isB2C(o));
  if (rev.length) {
    const counts = {};
    rev.forEach((o) => { const k = o.reason; counts[k] = (counts[k] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    items.push({ id: 'review', sev: 'serious', icon: 'alert', title: rev.length + (rev.length === 1 ? ' order needs' : ' orders need') + ' manual review', meta: 'Most common: ' + top[0].replace(/^Supplier returned /, 'supplier returned ').replace(/^Supplier /, 'supplier ') + ' (' + top[1] + ')', cta: 'Review queue', go: { route: 'orders', tab: 'review' } });
  }
  for (const sp of S.suppliers) {
    if (!sp.enabled) continue;
    const mt = supMetrics(sp.id);
    if (sp.status !== 'up') {
      const last = sp.hist[sp.hist.length - 1];
      items.push({ id: 'sup-' + sp.id, sev: sp.status === 'down' ? 'crit' : 'serious', icon: 'server', title: sp.name + (sp.status === 'down' ? ' is down' : ' is degraded'), meta: pct(last.ok, 0) + ' success in the last hour, ' + mt.queue + ' open orders depend on it', cta: 'Open supplier', go: { route: 'suppliers', sel: sp.id } });
    }
    if (mt.low) items.push({ id: 'bal-' + sp.id, sev: 'warn', icon: 'wallet', title: sp.name + ' prepaid balance is ' + money(mt.balance), meta: isFinite(mt.runway) ? 'About ' + (mt.runway < 1 ? 'less than a day' : mt.runway.toFixed(1) + ' days') + ' of volume left at the 7-day rate' : 'Below the ' + money0(sp.minBalance) + ' minimum', cta: 'Record top-up', act: 'topup', id2: sp.id });
  }
  const bf = belowFloor();
  if (bf.length) items.push({ id: 'floor', sev: 'serious', icon: 'tag', title: bf.length + (bf.length === 1 ? ' service is' : ' services are') + ' priced below cost plus minimum profit', meta: bf.map((s) => s.name).slice(0, 2).join(', ') + ' (supplier cost changed). Orders are charged the floor price until you update it', cta: 'Fix pricing', go: { route: 'services', flag: 'floor' } });
  if (want('b2b')) {
    const pp = pendingPayments();
    if (pp.length) items.push({ id: 'pay', sev: 'warn', icon: 'receipt', title: pp.length + (pp.length === 1 ? ' deposit is' : ' deposits are') + ' waiting for review', meta: money0(sum(pp, (p) => p.net)) + ' total, oldest ' + ago(Math.min(...pp.map((p) => p.created))), cta: 'Review deposits', go: { route: 'finance', tab: 'payments' } });
    const pw = pendingWithdrawals();
    if (pw.length) items.push({ id: 'wd', sev: 'warn', icon: 'upload', title: pw.length + ' withdrawal ' + (pw.length === 1 ? 'request' : 'requests') + ' to approve', meta: money0(sum(pw, (w) => w.amount)) + ' total', cta: 'Review', go: { route: 'finance', tab: 'withdrawals' } });
    const neg = S.merchants.filter(walletLow);
    if (neg.length) items.push({ id: 'neg', sev: 'warn', icon: 'users', title: neg.length + (neg.length === 1 ? ' merchant has' : ' merchants have') + ' a negative wallet', meta: neg.map((m) => m.name + ' ' + money(walletOf(m.id))).join(', '), cta: 'Open merchant', go: { route: 'merchants', id: neg[0].id } });
    const pm = S.merchants.filter((m) => m.status === 'pending');
    if (pm.length) items.push({ id: 'pend', sev: 'info', icon: 'user', title: pm.length + ' merchant ' + (pm.length === 1 ? 'account' : 'accounts') + ' waiting for approval', meta: pm.map((m) => m.name).join(', '), cta: 'Review', go: { route: 'merchants', tab: 'pending' } });
    const ac = accrued();
    if (ac.length) items.push({ id: 'comm', sev: 'info', icon: 'percent', title: ac.length + ' commission accruals ready to approve', meta: money(sum(ac, (a) => a.amount)) + ' across ' + new Set(ac.map((a) => a.agent)).size + ' agents', cta: 'Review', go: { route: 'commissions' } });
  }
  if (want('b2c')) items.push(...attentionB2C());
  const rank = { crit: 0, serious: 1, warn: 2, info: 3 };
  return items.sort((a, b) => rank[a.sev] - rank[b.sev]);
}

/* ---------- mutations ---------- */
function logAudit(actor, verb, type, id, label, diff) {
  S.audit.unshift({ id: 'AUD-' + String(++S.seq.aud).padStart(4, '0'), ts: Date.now(), actor, verb, type, eid: id, label, diff: diff || [], ip: actor === 'System' ? null : '203.0.113.24' });
}
function post(j) { j.ts = j.ts || Date.now(); return postTo(S, j); }
function defaultReply(o) {
  const s = svc(o.sid);
  if (s.category === 'Carrier unlock') return 'Unlock confirmed by carrier. Insert a non-supported SIM to verify.';
  if (s.type === 'IMEI') return 'Status: Clean. Carrier: unlocked.';
  if (s.type === 'Server') return 'Delivered to ' + o.input + '. Activation takes under 2 minutes.';
  if (s.type === 'Remote') return 'Remote session finished. Device rebooted normally.';
  return 'File delivered. Check your downloads.';
}
function settleOrder(o, by, reply) {
  const t = Date.now();
  o.status = 'completed'; o.doneAt = t; o.reply = reply || defaultReply(o); o.by = by; o.updated = t;
  o.events.push({ ts: t, k: 'completed', text: by === 'System' ? 'Completed by supplier reply' : 'Completed manually', by });
  o.events.push({ ts: t + 1, k: 'settle', text: 'Settled: revenue ' + money(o.price) + ', cost ' + money(o.cost), by: 'System' });
  if (isB2C(o)) {
    post({ kind: 'order_settle', memo: 'Settle ' + o.id, refType: 'order', refId: o.id, mid: null, by, entries: [{ acct: 'customer_funds', dr: o.price }, { acct: 'revenue', cr: o.price }, { acct: 'cogs', dr: o.cost }, { acct: 'supplier_prepaid', sid: o.sup, cr: o.cost }] });
    o.events.push({ ts: t + 2, k: 'notify', text: 'Customer emailed the result and a receipt', by: 'System' });
    return; // storefront orders earn no agent commission
  }
  post({ kind: 'order_settle', memo: 'Settle ' + o.id, refType: 'order', refId: o.id, mid: o.mid, by, entries: [{ acct: 'client_hold', mid: o.mid, dr: o.price }, { acct: 'revenue', cr: o.price }, { acct: 'cogs', dr: o.cost }, { acct: 'supplier_prepaid', sid: o.sup, cr: o.cost }] });
  const buyer = mer(o.mid);
  if (buyer && buyer.referredBy) {
    const agent = mer(buyer.referredBy), plan = S.plans.find((p) => p.id === agent.plan);
    const amount = plan ? round(o.price * plan.rate, 2) : 0;
    if (amount > 0) S.accruals.push({ id: 'CA-' + String(++S.seq.ca).padStart(4, '0'), agent: agent.id, mid: buyer.id, orderId: o.id, base: o.price, rate: plan.rate, amount, created: t, status: 'accrued', approvedAt: null });
  }
}
function releaseOrder(o, by, reason) {
  const t = Date.now();
  o.status = 'rejected'; o.doneAt = t; o.reason = reason; o.by = by; o.updated = t;
  o.events.push({ ts: t, k: 'rejected', text: reason, by });
  if (isB2C(o)) {
    /* the customer paid first, so a rejected storefront order is a real refund to their card or wallet */
    const rf = { id: 'RF-' + (++S.seq.rf), oid: o.id, cid: o.cid, amount: o.gross, cur: o.cur, reason, method: 'original', status: 'completed', created: t, by, auto: by === 'System', note: '', gw: o.pay.method === 'crypto' ? 'tx_' + Math.floor(Math.random() * 1e8) : 're_' + Math.floor(Math.random() * 1e8), partial: false };
    S.refunds.unshift(rf);
    o.pay.status = 'refunded';
    o.events.push({ ts: t + 1, k: 'refund', text: 'Refund of ' + localMoney(o.gross, o.cur) + ' sent to the original payment method', by: 'System' });
    post({ kind: 'refund', memo: 'Refund ' + o.id + ' to ' + cus(o.cid).name, refType: 'order', refId: o.id, mid: null, by, entries: [{ acct: 'customer_funds', dr: o.price }, ...(o.tax > 0 ? [{ acct: 'vat_payable', dr: o.tax }] : []), { acct: 'gateway_clearing', cr: o.gross }] });
    return rf;
  }
  o.events.push({ ts: t + 1, k: 'release', text: money(o.price) + ' released back to wallet', by: 'System' });
  post({ kind: 'order_release', memo: 'Release ' + o.id, refType: 'order', refId: o.id, mid: o.mid, by, entries: [{ acct: 'client_hold', mid: o.mid, dr: o.price }, { acct: 'client_wallet', mid: o.mid, cr: o.price }] });
}
function completeOrders(ids, reply) {
  let n = 0;
  for (const id of ids) {
    const o = ord(id);
    if (!o || !isOpen(o)) continue;
    settleOrder(o, ME, typeof reply === 'function' ? reply(o) : reply);
    logAudit(ME, 'completed order', 'order', o.id, o.id + ' for ' + buyerOf(o).name, [{ field: 'status', from: 'open', to: 'completed' }]);
    n++;
  }
  changed();
  return n;
}
function rejectOrders(ids, reason) {
  let n = 0;
  for (const id of ids) {
    const o = ord(id);
    if (!o || !isOpen(o)) continue;
    releaseOrder(o, ME, reason);
    logAudit(ME, 'rejected order', 'order', o.id, o.id + ' for ' + buyerOf(o).name, [{ field: 'status', from: 'open', to: 'rejected' }, { field: 'reason', from: '', to: reason }]);
    n++;
  }
  changed();
  return n;
}
function retryOrders(ids, supId) {
  let n = 0;
  for (const id of ids) {
    const o = ord(id);
    if (!o || !isOpen(o)) continue;
    const t = Date.now();
    const from = o.sup;
    if (supId && supId !== o.sup) o.sup = supId;
    o.status = 'processing'; o.attempts++; o.reason = null; o.updated = t;
    o.events.push({ ts: t, k: 'retry', text: 'Re-sent to ' + sup(o.sup).name + (from !== o.sup ? ' (rerouted from ' + sup(from).name + ')' : ''), by: ME });
    logAudit(ME, from !== o.sup ? 'rerouted order' : 'retried order', 'order', o.id, o.id + ' to ' + sup(o.sup).name, [{ field: 'supplier', from: sup(from).name, to: sup(o.sup).name }]);
    n++;
  }
  changed();
  return n;
}
function adjustWallet(mid, amount, dir, reason) {
  const m = mer(mid);
  const before = walletOf(mid);
  const entries = dir === 'credit' ? [{ acct: 'adjustments', dr: amount }, { acct: 'client_wallet', mid, cr: amount }] : [{ acct: 'client_wallet', mid, dr: amount }, { acct: 'adjustments', cr: amount }];
  const j = post({ kind: 'adjustment', memo: 'Manual ' + dir + ': ' + reason, refType: 'merchant', refId: mid, mid, by: ME, entries });
  logAudit(ME, 'adjusted wallet of', 'merchant', mid, m.name, [{ field: 'wallet', from: money(before), to: money(walletOf(mid)) }, { field: 'reason', from: '', to: reason }]);
  changed();
  return j;
}
function reviewPayment(id, approve, note) {
  const p = pay(id);
  if (!p || p.status !== 'pending') return;
  p.reviewedBy = ME; p.reviewedAt = Date.now();
  if (approve) { p.status = 'approved'; postDeposit(S, p, Date.now(), ME); }
  else { p.status = 'rejected'; p.note = note || 'Rejected'; }
  logAudit(ME, approve ? 'approved deposit' : 'rejected deposit', 'payment', p.id, mer(p.mid).name + ', ' + money(p.gross), [{ field: 'status', from: 'pending', to: p.status }].concat(approve ? [] : [{ field: 'reason', from: '', to: p.note }]));
  changed();
}
function reviewWithdrawal(id, approve) {
  const w = IDX.w.get(id);
  if (!w || w.status !== 'pending') return;
  if (approve && walletOf(w.mid) < w.amount) return { error: 'Wallet balance (' + money(walletOf(w.mid)) + ') is below the request.' };
  w.reviewedBy = ME; w.reviewedAt = Date.now();
  if (approve) {
    w.status = 'paid';
    post({ kind: 'withdrawal', memo: 'Withdrawal ' + w.id, refType: 'withdrawal', refId: w.id, mid: w.mid, by: ME, entries: [{ acct: 'client_wallet', mid: w.mid, dr: w.amount }, { acct: 'bank', cr: w.amount }] });
  } else w.status = 'rejected';
  logAudit(ME, approve ? 'paid withdrawal' : 'rejected withdrawal', 'withdrawal', w.id, mer(w.mid).name + ', ' + money(w.amount), [{ field: 'status', from: 'pending', to: w.status }]);
  changed();
}
function approveAccruals(ids) {
  const byAgent = new Map();
  for (const id of ids) {
    const a = S.accruals.find((x) => x.id === id);
    if (!a || a.status !== 'accrued') continue;
    a.status = 'approved'; a.approvedAt = Date.now();
    byAgent.set(a.agent, (byAgent.get(a.agent) || []).concat(a));
  }
  let total = 0;
  for (const [agent, list] of byAgent) {
    const amt = round(sum(list, (a) => a.amount), 2);
    total += amt;
    post({ kind: 'commission', memo: 'Commission batch, ' + list.length + ' accruals to ' + mer(agent).name, refType: 'accrual', refId: list[0].id, mid: agent, by: ME, entries: [{ acct: 'commission_expense', dr: amt }, { acct: 'client_wallet', mid: agent, cr: amt }] });
    logAudit(ME, 'approved commissions for', 'merchant', agent, mer(agent).name + ', ' + list.length + ' accruals, ' + money(amt), [{ field: 'status', from: 'accrued', to: 'approved' }]);
  }
  changed();
  return { count: sum([...byAgent.values()], (l) => l.length), total: round(total, 2) };
}
function setPrice(sid, value) {
  const s = svc(sid);
  const v = round(parseFloat(value), 2);
  if (!isFinite(v) || v <= 0) return { error: 'Enter a price greater than zero.' };
  const floor = round(s.cost + s.minProfit, 2);
  if (v < floor) return { error: 'Below the floor. Cost ' + money(s.cost) + ' plus minimum profit ' + money(s.minProfit) + ' is ' + money(floor) + '.' };
  const was = s.price;
  s.price = v; s.markup = round(v / s.cost - 1, 3);
  logAudit(ME, 'changed price of', 'service', s.id, s.name, [{ field: 'price', from: money(was), to: money(v) }]);
  changed();
  return { ok: true };
}
function setServiceField(sid, field, value) {
  const s = svc(sid);
  const was = s[field];
  s[field] = value;
  logAudit(ME, (field === 'status' ? (value === 'active' ? 'enabled' : 'disabled') + ' service' : (value ? 'turned on' : 'turned off') + ' automation of'), 'service', s.id, s.name, [{ field, from: String(was), to: String(value) }]);
  changed();
}
function setMerchantStatus(mid, status, reason) {
  const m = mer(mid);
  const was = m.status;
  m.status = status;
  const verb = { active: was === 'pending' ? 'approved' : 'reactivated', suspended: 'suspended' }[status] || 'updated';
  logAudit(ME, verb, 'merchant', mid, m.name, [{ field: 'status', from: was, to: status }].concat(reason ? [{ field: 'reason', from: '', to: reason }] : []));
  changed();
}
function setMerchantGroup(mid, group) {
  const m = mer(mid);
  const was = GROUPS.find((g) => g.id === m.group).name;
  m.group = group;
  logAudit(ME, 'changed group of', 'merchant', mid, m.name, [{ field: 'group', from: was, to: GROUPS.find((g) => g.id === group).name }]);
  changed();
}
function setClientPrice(mid, code, value) {
  const k = mid + '|' + code;
  if (value == null) delete S.clientPrices[k]; else S.clientPrices[k] = value;
  logAudit(ME, value == null ? 'removed client price for' : 'set client price for', 'merchant', mid, mer(mid).name + ', ' + code, [{ field: 'price', from: '', to: value == null ? 'none' : money(value) }]);
  changed();
}
function topupSupplier(sid, amount) {
  const sp = sup(sid);
  const before = S.prepaid[sid] || 0;
  post({ kind: 'supplier_topup', memo: 'Prepaid top-up, ' + sp.name, refType: 'supplier', refId: sid, by: ME, entries: [{ acct: 'supplier_prepaid', sid, dr: amount }, { acct: 'bank', cr: amount }] });
  logAudit(ME, 'recorded top-up for', 'supplier', sid, sp.name, [{ field: 'prepaid', from: money(before), to: money(S.prepaid[sid]) }]);
  changed();
}
function setSupplierStatus(sid, status, actor = ME) {
  const sp = sup(sid);
  const was = sp.status;
  sp.status = status;
  const last = sp.hist[sp.hist.length - 1];
  if (status === 'up') { last.ok = round(sp.successRate, 1); last.ms = sp.p50; }
  if (status === 'down') { last.ok = 0; last.ms = 0; sp.hist[sp.hist.length - 2].ok = 21; }
  logAudit(actor, status === 'up' ? 'marked supplier healthy' : 'flagged supplier ' + status, 'supplier', sid, sp.name, [{ field: 'status', from: was, to: status }]);
  if (status === 'down') pushApiLog(sid, 503, 'Service unavailable');
  changed();
}
function setSupplierEnabled(sid, enabled) {
  const sp = sup(sid);
  sp.enabled = enabled;
  logAudit(ME, enabled ? 'enabled supplier' : 'disabled supplier', 'supplier', sid, sp.name, [{ field: 'enabled', from: String(!enabled), to: String(enabled) }]);
  changed();
}
function pushApiLog(sid, forcedCode, forcedMsg) {
  const sp = sup(sid);
  const open = S.orders.filter((o) => o.sup === sid);
  const o = open.length ? open[Math.floor(Math.random() * open.length)] : null;
  const roll = Math.random() * 100;
  let code = forcedCode || (sp.status === 'down' ? 503 : sp.status === 'degraded' ? (roll < 56 ? 200 : roll < 86 ? 504 : roll < 96 ? 429 : 500) : (roll < 96 ? 200 : roll < 98 ? 429 : 500));
  const calls = [['POST', '/placeorder'], ['POST', '/getorder'], ['POST', '/getorder'], ['GET', '/balance']];
  const [method, path] = calls[Math.floor(Math.random() * calls.length)];
  S.apiLog.unshift({ id: ++S.seq.log, sid, ts: Date.now(), method, path, code, ms: code === 504 || code === 503 ? 8000 + Math.round(Math.random() * 3000) : Math.round(sp.p50 * (0.6 + Math.random())), ref: o ? o.id : null, msg: forcedMsg || (code === 200 ? 'OK' : code === 504 ? 'Gateway timeout' : code === 429 ? 'Rate limited, retry after 5s' : 'Upstream error') });
  if (S.apiLog.length > 400) S.apiLog.length = 400;
}

/* simulated incoming order: queued -> processing -> completed (or review when its supplier is struggling) */
const timers = new Set();
function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); }
function simulateOrder() {
  const buyers = S.merchants.filter((m) => m.status === 'active');
  const m = buyers[Math.floor(Math.random() * buyers.length)];
  const pool = S.services.filter((s) => s.status === 'active' && s.sla <= 60);
  const s = pool[Math.floor(Math.random() * pool.length)];
  const q = resolveWith(S, m, s);
  const t = Date.now();
  const input = s.type === 'IMEI' ? luhn('35389011' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0')) : s.type === 'Server' ? 'new' + Math.floor(Math.random() * 90 + 10) + '@gsm.example' : s.type === 'Remote' ? 'SN 4417K' + Math.floor(Math.random() * 1e5) : 'SM-A546E';
  const o = { id: 'ORD-' + (++S.seq.order), mid: m.id, sid: s.id, input, device: s.type === 'IMEI' || s.type === 'Remote' ? DEVICES[Math.floor(Math.random() * DEVICES.length)] : null, qty: 1, created: t, status: 'queued', price: q.price, cost: s.cost, sup: s.sup, source: q.source, chan: 'Dhru API', by: 'System', reason: null, attempts: 1, ref: 'NEW-' + Math.floor(Math.random() * 1e6), doneAt: null, reply: null, dur: 0 };
  o.events = [{ ts: t, k: 'created', text: 'Order received via Dhru API', by: 'Merchant API' }, { ts: t + 1, k: 'hold', text: money(o.price) + ' held from ' + m.name + ' wallet', by: 'System' }];
  o.updated = t;
  S.orders.push(o); IDX.o.set(o.id, o);
  post({ kind: 'order_hold', memo: 'Hold for ' + o.id, refType: 'order', refId: o.id, mid: m.id, by: 'System', entries: [{ acct: 'client_wallet', mid: m.id, dr: o.price }, { acct: 'client_hold', mid: m.id, cr: o.price }] });
  changed();
  later(() => {
    if (o.status !== 'queued') return;
    o.status = 'processing'; o.updated = Date.now();
    o.events.push({ ts: Date.now(), k: 'dispatch', text: 'Sent to ' + sup(o.sup).name, by: 'System' });
    changed();
  }, 2200);
  later(() => {
    if (o.status !== 'processing') return;
    const spd = sup(o.sup);
    if (spd.status !== 'up') {
      o.status = 'review'; o.reason = REVIEW_REASONS.timeout; o.attempts = 3; o.updated = Date.now();
      o.events.push({ ts: Date.now(), k: 'review', text: o.reason, by: spd.name });
    } else settleOrder(o, 'System');
    changed();
  }, 6500);
  return o;
}
function resetData() {
  timers.forEach(clearTimeout); timers.clear();
  S = seed(); reindex();
  ui.orders.sel.clear(); ui.commissions.sel.clear();
  resetB2CUi();
  changed();
}
