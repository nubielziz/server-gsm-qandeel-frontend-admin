/* B2C state: selectors and mutations for customers, support, refunds, disputes, risk and the storefront.
   Same rule as the rest of the console: every mutation posts to the ledger and writes the audit log. */

function resetB2CUi() {
  ui.scope = 'all';
  Object.assign(ui.customers, { q: '', tab: 'all', country: '', page: 1, detailTab: 'orders' });
  Object.assign(ui.support, { sel: null, filter: 'open', who: 'all', q: '', draft: {}, internal: false });
  Object.assign(ui.storefront, { tab: 'listings', lpKind: '' });
  ui.storefront.pv = freshPreview();
  Object.assign(ui.checkouts, { cf: 'remind' });
  Object.assign(ui.refunds, { tab: 'refunds', status: '', page: 1 });
  Object.assign(ui.risk, { tab: 'queue', q: '', kind: '' });
  Object.assign(ui.settings, { tab: 'payments' });
  resetAccessUi();
}
function freshPreview() { return { step: 1, imei: '', sid: '', email: '', country: 'GB', method: 'card', consent: false, waiver: false, order: null, err: '', check: null }; }

/* ---------- customers ---------- */
const custOrders = (cid) => S.orders.filter((o) => o.cid === cid);
function custStats(c) {
  const os = custOrders(c.id);
  return {
    orders: os.length,
    spent: sum(os.filter((o) => o.status !== 'rejected'), (o) => o.gross),
    last: os.length ? os[os.length - 1].created : null,
    refunds: S.refunds.filter((r) => r.cid === c.id).length,
    tickets: S.tickets.filter((t) => t.who.type === 'customer' && t.who.id === c.id).length,
    disputes: S.disputes.filter((d) => d.cid === c.id).length,
  };
}
const CUST_STATUS = { active: ['b-good', 'checkCircle', 'Active'], suspended: ['b-warn', 'pause', 'Suspended'], blocked: ['b-crit', 'ban', 'Blocked'], anonymized: ['b-neutral', 'user', 'Anonymised'] };
const custBadge = (c) => { const [cls, ic, l] = CUST_STATUS[c.status]; return badge(cls, ic, l); };
const RISK_LABEL = { low: ['b-neutral', 'Low'], med: ['b-warn', 'Medium'], high: ['b-crit', 'High'] };
function consentsFor(o) {
  const ip = '203.0.113.' + (parseInt(o.token.replace(/\D/g, '').slice(0, 3) || '24', 10) % 200 + 20);
  const doc = (type) => { const d = S.legal.find((x) => x.type === type && x.current && x.lang === 'EN'); return d ? type + ' v' + d.version : type; };
  const rows = [
    { what: doc('Terms of service'), ts: o.created - 41e3, ip },
    { what: doc('Privacy policy'), ts: o.created - 41e3, ip },
    { what: doc('Refund policy'), ts: o.created - 41e3, ip },
    { what: 'Digital service starts now, right of withdrawal is waived', ts: o.created - 38e3, ip },
  ];
  const c = cus(o.cid);
  if (c && c.optIn) rows.push({ what: 'Marketing emails (opt-in)', ts: o.created - 36e3, ip });
  return rows;
}
function blockCustomer(cid, on, reason) {
  const c = cus(cid);
  const was = c.status;
  c.status = on ? 'blocked' : 'active';
  c.risk = on ? 'high' : c.risk === 'high' ? 'med' : c.risk;
  if (on) { c.notes = reason || c.notes; addBlock('email', c.email.replace(/^(.{2}).*(@.*)$/, '$1****$2'), reason || 'Blocked from the customer page', 'manual', true); }
  logAudit(ME, on ? 'blocked customer' : 'unblocked customer', 'customer', c.id, c.name, [{ field: 'status', from: was, to: c.status }].concat(reason ? [{ field: 'reason', from: '', to: reason }] : []));
  changed();
}
/* ---------- customer accounts: create, edit, password, sessions, suspend ---------- */
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(e).trim());
const emailBlocked = (em) => S.risk.block.some((b) => b.kind === 'email' && (b.display.toLowerCase() === em || (b.display.includes('*') && em.startsWith(b.display.slice(0, 2)) && em.endsWith(b.display.slice(b.display.indexOf('@'))))));
const emailOwner = (email, exceptId) => { const em = email.trim().toLowerCase(); return S.customers.find((x) => x.id !== exceptId && x.email.toLowerCase() === em); };
const SUSPEND_REASONS = ['Customer asked to pause the account', 'Account may be compromised', 'Unusual activity under review', 'Waiting for proof of identity or payment', 'Other'];
const PW_MIN = 10;
function pwProblem(pw, c) {
  if (pw.length < PW_MIN) return 'Use at least ' + PW_MIN + ' characters.';
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwerty)/i.test(pw)) return 'That password is too easy to guess.';
  if (c && c.email && pw.toLowerCase().includes(c.email.split('@')[0].toLowerCase()) && c.email.split('@')[0].length > 3) return 'The password should not contain the email name.';
  return '';
}
function genPassword() {
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 14; i++) out += A[Math.floor(Math.random() * A.length)];
  return out;
}
function createCustomer(f) {
  const name = f.name.trim(), email = f.email.trim().toLowerCase();
  if (name.length < 2) return { error: 'Enter the customer’s name.', field: 'nm' };
  if (!validEmail(email)) return { error: 'Enter a valid email address.', field: 'email' };
  const dup = emailOwner(email);
  if (dup) return { error: email + ' already belongs to ' + dup.name + (dup.hasAccount ? '.' : ', who bought as a guest. Open them and use “Create account” instead.'), field: 'email' };
  if (emailBlocked(email)) return { error: 'This email is on the blocklist. Remove it there first if it was a mistake.', field: 'email' };
  if (f.mode === 'set') { const pr = pwProblem(f.password, { email }); if (pr) return { error: pr, field: 'password' }; }
  const t = Date.now();
  const c = { id: 'c' + (S.customers.length + 1), name, email, country: f.country, cur: B2C_COUNTRIES[f.country].cur, locale: f.locale || 'en', hasAccount: true, optIn: false, risk: 'low', status: 'active', created: t, w: 1, notes: f.notes || '', firstOrderAt: null,
    phone: f.phone.trim(), emailVerified: false, createdBy: 'admin', lastLogin: null, sessions: 0, pwChangedAt: f.mode === 'set' ? t : null, mustChangePw: f.mode === 'set', resetSentAt: f.mode === 'link' ? t : null, suspendedAt: null, suspendedReason: '' };
  S.customers.push(c); IDX.c.set(c.id, c);
  logAudit(ME, 'created customer', 'customer', c.id, c.name, [{ field: 'email', from: '', to: c.email }, { field: 'country', from: '', to: c.country }, { field: 'created_by', from: '', to: 'staff' }, { field: 'password', from: '', to: f.mode === 'link' ? 'invite link emailed' : 'temporary password set' }]);
  changed();
  return { ok: true, c };
}
function createAccountForGuest(cid, f) {
  const c = cus(cid);
  if (f.mode === 'set') { const pr = pwProblem(f.password, c); if (pr) return { error: pr, field: 'password' }; }
  const t = Date.now();
  Object.assign(c, { hasAccount: true, pwChangedAt: f.mode === 'set' ? t : null, mustChangePw: f.mode === 'set', resetSentAt: f.mode === 'link' ? t : null });
  logAudit(ME, 'created account for', 'customer', c.id, c.name, [{ field: 'account', from: 'guest', to: 'account' }, { field: 'password', from: '', to: f.mode === 'link' ? 'invite link emailed' : 'temporary password set' }]);
  changed();
  return { ok: true };
}
function updateCustomer(cid, f) {
  const c = cus(cid);
  const name = f.name.trim(), email = f.email.trim().toLowerCase();
  if (name.length < 2) return { error: 'Enter the customer’s name.', field: 'nm' };
  if (!validEmail(email)) return { error: 'Enter a valid email address.', field: 'email' };
  const dup = emailOwner(email, cid);
  if (dup) return { error: email + ' already belongs to ' + dup.name + '. Two customers can’t share an email.', field: 'email' };
  if (email !== c.email.toLowerCase() && emailBlocked(email)) return { error: 'This email is on the blocklist.', field: 'email' };
  const diff = [], was = { name: c.name, email: c.email, country: c.country, phone: c.phone, locale: c.locale, notes: c.notes };
  const now = { name, email, country: f.country, phone: f.phone.trim(), locale: f.locale, notes: f.notes.trim() };
  for (const k of Object.keys(now)) if (String(was[k] || '') !== String(now[k] || '')) diff.push({ field: k, from: String(was[k] || ''), to: String(now[k] || '') });
  if (!diff.length) return { ok: true, none: true };
  Object.assign(c, now);
  c.cur = B2C_COUNTRIES[c.country].cur;
  if (now.email !== was.email.toLowerCase() && c.hasAccount) { c.emailVerified = false; diff.push({ field: 'email_verified', from: 'true', to: 'false' }); }
  logAudit(ME, 'edited details of', 'customer', c.id, c.name, diff);
  changed();
  return { ok: true, diff };
}
function setCustomerPassword(cid, f) {
  const c = cus(cid), t = Date.now(), diff = [];
  if (f.mode === 'set') {
    const pr = pwProblem(f.password, c); if (pr) return { error: pr, field: 'password' };
    Object.assign(c, { pwChangedAt: t, mustChangePw: true, resetSentAt: null });
    diff.push({ field: 'password', from: '', to: 'temporary password set, change required at next sign-in' });
  } else {
    c.resetSentAt = t;
    diff.push({ field: 'password', from: '', to: 'reset link emailed, valid for 1 hour' });
  }
  if (f.signOut && c.sessions) { diff.push({ field: 'sessions', from: String(c.sessions), to: '0' }); c.sessions = 0; }
  logAudit(ME, f.mode === 'set' ? 'set a temporary password for' : 'sent a password reset link to', 'customer', c.id, c.name, diff);
  changed();
  return { ok: true };
}
function signOutCustomer(cid) {
  const c = cus(cid), n = c.sessions;
  c.sessions = 0;
  logAudit(ME, 'signed out all devices of', 'customer', c.id, c.name, [{ field: 'sessions', from: String(n), to: '0' }]);
  changed();
  return n;
}
function suspendCustomer(cid, reason, note) {
  const c = cus(cid), n = c.sessions, why = reason + (note ? ': ' + note : '');
  Object.assign(c, { status: 'suspended', suspendedAt: Date.now(), suspendedReason: why, sessions: 0 });
  logAudit(ME, 'suspended account of', 'customer', c.id, c.name, [{ field: 'status', from: 'active', to: 'suspended' }, { field: 'reason', from: '', to: why }].concat(n ? [{ field: 'sessions', from: String(n), to: '0' }] : []));
  changed();
}
function reactivateCustomer(cid) {
  const c = cus(cid);
  Object.assign(c, { status: 'active', suspendedAt: null, suspendedReason: '' });
  logAudit(ME, 'reactivated account of', 'customer', c.id, c.name, [{ field: 'status', from: 'suspended', to: 'active' }]);
  changed();
}
function anonymizeCustomer(cid) {
  const c = cus(cid);
  const name = c.name;
  c.status = 'anonymized'; c.name = 'Deleted customer'; c.email = 'deleted-' + c.id + '@redacted.invalid'; c.notes = ''; c.optIn = false; c.phone = ''; c.lastIp = null; c.sessions = 0; c.hasAccount = false;
  custOrders(cid).forEach((o) => { o.input = o.input.slice(0, 8) + '•••••••'; o.device = 'Device removed'; });
  const d = S.dsr.find((x) => x.cid === cid && x.kind === 'erasure' && x.status === 'open');
  if (d) { d.status = 'done'; d.done = Date.now(); }
  S.tickets.filter((t) => t.who.type === 'customer' && t.who.id === cid).forEach((t) => t.msgs.forEach((m) => { if (m.by === 'customer') m.name = 'Deleted customer'; }));
  logAudit(ME, 'anonymised customer', 'customer', cid, name, [{ field: 'name', from: name, to: 'Deleted customer' }, { field: 'imei', from: 'stored', to: 'removed (TAC kept)' }]);
  changed();
}
function exportCustomerData(cid) {
  const c = cus(cid);
  const d = S.dsr.find((x) => x.cid === cid && x.kind === 'export' && x.status === 'open');
  if (d) { d.status = 'done'; d.done = Date.now(); }
  logAudit(ME, 'exported data of', 'customer', cid, c.name, [{ field: 'request', from: 'open', to: 'exported' }]);
}

/* ---------- support ---------- */
const TICKET_CATS = { delay: 'Delay', failed_unlock: 'Unlock failed', refund: 'Refund', billing: 'Billing', wrong_imei: 'Wrong IMEI', howto: 'How-to', presale: 'Before buying', other: 'Other' };
const TICKET_STATUS = { new: ['b-serious', 'inbox', 'New'], open: ['b-neutral', 'clock', 'Open'], pending: ['b-warn', 'clock', 'Waiting on customer'], resolved: ['b-good', 'checkCircle', 'Resolved'] };
const ticketBadge = (st) => badge(...TICKET_STATUS[st]);
const lastPublic = (t) => { for (let i = t.msgs.length - 1; i >= 0; i--) if (t.msgs[i].by !== 'note') return t.msgs[i]; return null; };
const ticketWaiting = (t) => t.status !== 'resolved' && !!lastPublic(t) && lastPublic(t).by === 'customer';
const ticketTarget = (t) => PRIO_TARGET[t.prio];
const ticketLate = (t) => ticketWaiting(t) && Date.now() - lastPublic(t).ts > ticketTarget(t);
function ticketWho(t) {
  if (t.who.type === 'customer') { const c = cus(t.who.id); return { kind: 'b2c', name: c ? c.name : 'Customer', sub: c ? c.email : '' }; }
  const m = mer(t.who.id); return { kind: 'b2b', name: m ? m.name : 'Merchant', sub: m ? m.email : '' };
}
function supportStats() {
  const fr = S.tickets.filter((t) => t.firstReplyAt).map((t) => t.firstReplyAt - t.created).sort((a, b) => a - b);
  const cs = S.tickets.filter((t) => t.csat).map((t) => t.csat);
  const open = S.tickets.filter((t) => t.status !== 'resolved');
  return { open: open.length, late: open.filter(ticketLate).length, firstReply: fr.length ? fr[Math.floor(fr.length / 2)] : 0, csat: cs.length ? sum(cs) / cs.length : 0, csatN: cs.length };
}
function ticketReply(id, text, internal) {
  const t = tkt(id), now = Date.now();
  t.msgs.push({ by: internal ? 'note' : 'staff', name: ME, ts: now, text });
  if (!internal) {
    if (!t.firstReplyAt) t.firstReplyAt = now;
    if (t.status === 'new' || t.status === 'open') t.status = 'pending';
  }
  if (!t.assignee) t.assignee = ME;
  t.updated = now;
  delete ui.support.draft[id];
  changed();
}
function ticketSet(id, field, value) {
  const t = tkt(id), was = t[field];
  if (was === value) return;
  t[field] = value; t.updated = Date.now();
  if (field === 'status' && value === 'resolved') t.msgs.push({ by: 'note', name: 'System', ts: Date.now(), text: 'Marked resolved by ' + ME + '. A satisfaction survey is emailed to the customer.' });
  if (field === 'status' && value === 'resolved') t.csat = t.csat || null;
  logAudit(ME, field === 'assignee' ? 'assigned ticket' : field === 'status' ? (value === 'resolved' ? 'resolved ticket' : 'reopened ticket') : 'changed priority of ticket', 'ticket', t.id, t.id + ', ' + t.subject, [{ field, from: String(was || 'none'), to: String(value || 'none') }]);
  changed();
}
/* a simulated customer reply, so the demo inbox moves */
function simulateTicket() {
  const cs = S.customers.filter((c) => c.status === 'active'), c = cs[Math.floor(Math.random() * cs.length)];
  const os = custOrders(c.id).filter((o) => o.status === 'completed' || isOpen(o));
  const o = os.length ? os[os.length - 1] : null;
  const subjects = [['delay', 'Where is my unlock?', 'Hi, I paid yesterday and still have no code. Can you check?'], ['failed_unlock', 'Phone still locked', 'The email says completed but my phone still asks for a network code.'], ['presale', 'Before I buy', 'Can you unlock a phone bought on a payment plan, finished paying last week?']];
  const [cat, subject, text] = subjects[Math.floor(Math.random() * subjects.length)];
  const t = { id: 'T-' + (++S.seq.tk), subject: o && cat !== 'presale' ? subject + ' (' + o.id + ')' : subject, channel: 'web', who: { type: 'customer', id: c.id }, oid: o && cat !== 'presale' ? o.id : null, cat, prio: cat === 'failed_unlock' ? 'high' : 'normal', status: 'new', assignee: null, created: Date.now(), slaDue: Date.now() + PRIO_TARGET[cat === 'failed_unlock' ? 'high' : 'normal'], firstReplyAt: null, csat: null, msgs: [{ by: 'customer', name: c.name.split(' ')[0], ts: Date.now(), text }], updated: Date.now() };
  S.tickets.unshift(t); IDX.t.set(t.id, t);
  changed();
  return t;
}

/* ---------- refunds and disputes ---------- */
const REFUND_STATUS = { requested: ['b-warn', 'clock', 'Needs approval'], completed: ['b-good', 'checkCircle', 'Refunded'], failed: ['b-crit', 'xCircle', 'Failed at gateway'], rejected: ['b-neutral', 'ban', 'Declined'] };
const DISPUTE_STATUS = { needs_response: ['b-crit', 'alert', 'Evidence needed'], under_review: ['b-warn', 'clock', 'With the card network'], won: ['b-good', 'checkCircle', 'Won'], lost: ['b-crit', 'xCircle', 'Lost'] };
function refundSplit(o, amount) {
  const f = amount / o.gross, pn = round(o.price * f, 2), pt = o.tax > 0 ? round(o.tax * f, 2) : 0;
  return { pn, pt, amt: round(pn + pt, 2) };
}
function postRefund(o, amount, by, memo) {
  const { pn, pt, amt } = refundSplit(o, amount);
  post({ kind: 'refund', memo, refType: 'order', refId: o.id, mid: null, by, entries: [{ acct: 'revenue', dr: pn }, ...(pt > 0 ? [{ acct: 'vat_payable', dr: pt }] : []), { acct: 'gateway_clearing', cr: amt }] });
  return amt;
}
function finishRefund(r, o, amt, by) {
  const manual = o.pay.method === 'crypto';
  r.status = 'completed'; r.amount = amt; r.partial = amt < o.gross - 0.005; r.by = by; r.created = Date.now(); r.method = manual ? 'manual' : 'original';
  r.gw = manual ? 'tx_' + Math.floor(Math.random() * 1e8) : 're_' + Math.floor(Math.random() * 1e8);
  r.note = manual ? 'Crypto payments cannot be refunded by the gateway. Paid out manually from the treasury wallet.' : '';
  o.pay.status = r.partial ? 'partial_refund' : 'refunded';
  o.events.push({ ts: Date.now(), k: 'refund', text: (r.partial ? 'Partial refund of ' : 'Refund of ') + localMoney(amt, o.cur) + (manual ? ' paid out manually in USDT' : ' sent to the original payment method'), by });
  o.updated = Date.now();
}
function approveRefund(id, amount) {
  const r = S.refunds.find((x) => x.id === id), o = ord(r.oid);
  const amt = postRefund(o, amount != null ? Math.min(amount, o.gross) : r.amount, ME, 'Refund ' + r.id + ' on ' + o.id);
  finishRefund(r, o, amt, ME);
  logAudit(ME, 'approved refund', 'refund', r.id, r.id + ' for ' + o.id + ', ' + localMoney(amt, o.cur), [{ field: 'status', from: 'requested', to: 'completed' }]);
  changed();
  return r;
}
function declineRefund(id, why) {
  const r = S.refunds.find((x) => x.id === id), o = ord(r.oid);
  r.status = 'rejected'; r.note = why; r.created = Date.now(); r.by = ME;
  o.events.push({ ts: Date.now(), k: 'refund', text: 'Refund request declined: ' + why, by: ME });
  logAudit(ME, 'declined refund', 'refund', r.id, r.id + ' for ' + o.id, [{ field: 'status', from: 'requested', to: 'rejected' }, { field: 'reason', from: '', to: why }]);
  changed();
}
function retryRefund(id) {
  const r = S.refunds.find((x) => x.id === id), o = ord(r.oid);
  const amt = postRefund(o, r.amount, ME, 'Refund ' + r.id + ' retried on ' + o.id);
  finishRefund(r, o, amt, ME);
  logAudit(ME, 'retried refund', 'refund', r.id, r.id + ' for ' + o.id, [{ field: 'status', from: 'failed', to: 'completed' }]);
  changed();
}
function issueRefund(oid, amount, reason) {
  const o = ord(oid);
  const r = { id: 'RF-' + (++S.seq.rf), oid, cid: o.cid, amount, cur: o.cur, reason, method: 'original', status: 'requested', created: Date.now(), by: ME, auto: false, note: '', gw: null, partial: false };
  S.refunds.unshift(r);
  return approveRefund(r.id, amount);
}
function submitEvidence(id) {
  const d = S.disputes.find((x) => x.id === id), o = ord(d.oid);
  d.status = 'under_review'; d.submittedAt = Date.now();
  o.events.push({ ts: Date.now(), k: 'dispute', text: 'Evidence pack submitted for ' + d.id, by: ME });
  logAudit(ME, 'submitted evidence for', 'dispute', d.id, d.id + ' on ' + o.id, [{ field: 'status', from: 'needs_response', to: 'under_review' }]);
  changed();
}
function acceptDispute(id) {
  const d = S.disputes.find((x) => x.id === id), o = ord(d.oid), c = cus(d.cid), was = d.status;
  d.status = 'lost'; d.resolvedAt = Date.now();
  post({ kind: 'chargeback', memo: 'Chargeback accepted on ' + o.id + ' (incl. ' + money0(d.fee) + ' dispute fee)', refType: 'order', refId: o.id, mid: null, by: ME, entries: [{ acct: 'chargeback_loss', dr: round(o.gross + d.fee, 2) }, { acct: 'gateway_clearing', cr: round(o.gross + d.fee, 2) }] });
  o.pay.status = 'chargeback';
  o.events.push({ ts: Date.now(), k: 'dispute', text: 'Dispute accepted, ' + localMoney(o.gross, o.cur) + ' returned to the cardholder', by: ME });
  if (c.status !== 'blocked') blockCustomer(c.id, true, 'Chargeback accepted on ' + o.id);
  logAudit(ME, 'accepted dispute', 'dispute', d.id, d.id + ' on ' + o.id, [{ field: 'status', from: was, to: 'lost' }]);
  changed();
}

/* ---------- risk ---------- */
const riskRule = (id) => S.risk.rules.find((r) => r.id === id);
const isHeld = (o) => isB2C(o) && o.status === 'review' && o.risk.decision === 'review' && !o.risk.reviewedAt;
const heldOrders = () => S.orders.filter(isHeld);
const orderProfit = (o) => round(o.price - o.cost - (isB2C(o) ? o.fee : 0), 2);
const refundable = (o) => Math.max(0, round(o.gross - sum(S.refunds.filter((r) => r.oid === o.id && r.status === 'completed'), (r) => r.amount), 2));
const canRefund = (o) => isB2C(o) && o.status === 'completed' && ['captured', 'partial_refund'].includes(o.pay.status) && refundable(o) > 0.01;
function approveHeld(oid) {
  const o = ord(oid), t = Date.now();
  o.status = 'processing'; o.attempts = 1; o.reason = null; o.updated = t;
  Object.assign(o.risk, { reviewedBy: ME, reviewedAt: t, outcome: 'approved' });
  o.events.push({ ts: t, k: 'risk', text: 'Risk review: approved, sent to supplier', by: ME });
  o.events.push({ ts: t + 1, k: 'dispatch', text: 'Sent to ' + sup(o.sup).name + ' (' + sup(o.sup).api + ')', by: 'System' });
  logAudit(ME, 'approved after risk review', 'order', o.id, o.id + ' for ' + cus(o.cid).name, [{ field: 'risk_decision', from: 'review', to: 'approved' }]);
  if (svc(o.sid).sla <= 60) later(() => { if (o.status === 'processing') { settleOrder(o, 'System'); changed(); } }, 6000);
  changed();
}
function refundAndBlock(oid, block) {
  const o = ord(oid), c = cus(o.cid);
  const why = 'Refunded after risk review: ' + (o.risk.signals[0] || 'high risk score');
  releaseOrder(o, ME, why);
  Object.assign(o.risk, { reviewedBy: ME, reviewedAt: Date.now(), outcome: 'refunded' });
  logAudit(ME, 'refunded after risk review', 'order', o.id, o.id + ' for ' + c.name, [{ field: 'risk_decision', from: 'review', to: 'refunded' }]);
  if (block && c.status !== 'blocked') blockCustomer(c.id, true, 'Risk review of ' + o.id);
  changed();
}
function setRule(id, patch) {
  const r = riskRule(id), was = r.on, wasV = r.value;
  Object.assign(r, patch);
  logAudit(ME, patch.on !== undefined ? (r.on ? 'turned on' : 'turned off') + ' risk rule' : 'changed risk rule', 'setting', id, r.label, [patch.on !== undefined ? { field: 'on', from: String(was), to: String(r.on) } : { field: 'value', from: String(wasV), to: String(r.value) }]);
  changed();
}
function addBlock(kind, display, reason, source = 'manual', silent = false) {
  if (S.risk.block.some((b) => b.kind === kind && b.display === display)) return null;
  const b = { id: 'bl' + (++S.seq.bl), kind, display, reason, source, by: source === 'manual' ? ME : 'System', ts: Date.now() };
  S.risk.block.unshift(b);
  if (!silent) { logAudit(ME, 'added to blocklist', 'blocklist', b.id, kind + ' ' + display, [{ field: 'reason', from: '', to: reason }]); changed(); }
  return b;
}
function removeBlock(id) {
  const i = S.risk.block.findIndex((b) => b.id === id), b = S.risk.block[i];
  S.risk.block.splice(i, 1);
  logAudit(ME, 'removed from blocklist', 'blocklist', b.id, b.kind + ' ' + b.display, [{ field: 'status', from: 'blocked', to: 'removed' }]);
  changed();
}
/* IMEI check used by the storefront checker: deterministic from the digits so the demo is repeatable */
function imeiCheck(imei) {
  const clean = String(imei).replace(/\D/g, '');
  if (clean.length !== 15) return { ok: false, err: 'An IMEI has 15 digits. Dial *#06# on the phone to see it.' };
  if (luhn(clean.slice(0, 14)) !== clean) return { ok: false, err: 'That IMEI fails the checksum. Check for a typo.' };
  const last = +clean[14];
  const t = S.tac.find((x) => clean.startsWith(x.tac));
  const blacklisted = last === 0 || S.risk.block.some((b) => b.kind === 'imei' && b.display.replace(/\s/g, '') === clean);
  return { ok: true, imei: clean, model: t ? t.brand + ' ' + t.model : 'Unknown model', year: t ? t.year : null, blacklisted, locked: !blacklisted && last % 2 === 1, brand: t ? t.brand : '' };
}

/* ---------- abandoned checkouts ---------- */
function sendRecovery(ids) {
  let n = 0;
  for (const id of ids) { const c = S.checkouts.find((x) => x.id === id); if (c && c.recovery === 'none') { c.recovery = 'sent'; n++; } }
  if (n) logAudit(ME, 'sent recovery emails', 'checkout', 'checkout', n + ' abandoned checkouts', [{ field: 'emails', from: '0', to: String(n) }]);
  changed();
  return n;
}
/* ---------- storefront content and settings ---------- */
const listingOf = (sid) => S.listings.find((l) => l.sid === sid);
const retailFloor = (s) => round(s.price * 1.1, 2);
function setListed(sid, on) {
  const l = listingOf(sid), s = svc(sid);
  if (on && l.locked) return { error: l.why + '. This service cannot be listed publicly.' };
  if (on && s.status !== 'active') return { error: s.name + ' is disabled. Enable the service first.' };
  const was = l.listed;
  l.listed = on;
  logAudit(ME, on ? 'listed on storefront' : 'unlisted from storefront', 'listing', sid, s.name, [{ field: 'is_listed', from: String(was), to: String(on) }]);
  changed();
  return { ok: true };
}
function setRetailPrice(sid, value) {
  const s = svc(sid), v = round(parseFloat(value), 2);
  if (!isFinite(v) || v <= 0) return { error: 'Enter a price greater than zero.' };
  if (v < retailFloor(s)) return { error: 'Below the floor. The storefront must stay above the B2B base price (' + money(s.price) + ' plus 10%), or merchants would buy from the storefront instead.' };
  const was = S.retail[s.code];
  S.retail[s.code] = v;
  logAudit(ME, 'changed retail price of', 'listing', sid, s.name, [{ field: 'retail_price', from: money(was), to: money(v) }]);
  changed();
  return { ok: true };
}
function setLanding(id, status) {
  const p = S.landing.find((x) => x.id === id), was = p.status;
  p.status = status; p.updated = Date.now(); p.note = status === 'draft' ? 'Not published' : status === 'noindex' ? p.note : '';
  logAudit(ME, status === 'published' ? 'published page' : status === 'draft' ? 'unpublished page' : 'set noindex on page', 'listing', p.id, p.title, [{ field: 'status', from: was, to: status }]);
  changed();
}
function setPageStatus(id, status) {
  const p = S.pages.find((x) => x.id === id), was = p.status;
  p.status = status; p.updated = Date.now();
  logAudit(ME, status === 'published' ? 'published page' : 'unpublished page', 'listing', p.id, p.title, [{ field: 'status', from: was, to: status }]);
  changed();
}
function setHelpStatus(id, status) {
  const h = S.help.find((x) => x.id === id), was = h.status;
  h.status = status;
  logAudit(ME, status === 'published' ? 'published help article' : 'unpublished help article', 'listing', h.id, h.q, [{ field: 'status', from: was, to: status }]);
  changed();
}
function publishLegal(id) {
  const d = S.legal.find((x) => x.id === id);
  const [maj, min] = d.version.split('.').map(Number);
  const nv = maj + '.' + (min + 1);
  const old = d.version;
  S.legal.forEach((x) => { if (x.type === d.type && x.lang === d.lang) x.current = false; });
  S.legal.unshift({ id: 'lg' + (S.legal.length + 1), type: d.type, version: nv, lang: d.lang, effective: Date.now(), current: true, accepted: 0, needs: true });
  logAudit(ME, 'published legal document', 'legal', d.id, d.type + ' (' + d.lang + ') ' + nv, [{ field: 'version', from: old, to: nv }]);
  changed();
}
function setGateway(id, on) {
  const g = S.settings.gateways.find((x) => x.id === id), was = g.on;
  g.on = on;
  logAudit(ME, on ? 'turned on payment method' : 'turned off payment method', 'setting', id, g.name, [{ field: 'on', from: String(was), to: String(on) }]);
  changed();
}
const POLICY_LABEL = { guestCheckout: 'Guest checkout', require3ds: 'Require 3D Secure', withdrawalWaiver: 'Ask for withdrawal waiver at checkout', autoRefundFailed: 'Auto-refund failed unlocks', imeiPrecheck: 'Check the IMEI before payment' };
function setPolicy(key, value) {
  const was = S.settings.policies[key];
  S.settings.policies[key] = value;
  if (key === 'require3ds') riskRule('rr6').on = !!value;
  logAudit(ME, typeof value === 'boolean' ? (value ? 'turned on' : 'turned off') + ' policy' : 'changed policy', 'setting', key, POLICY_LABEL[key] || key, [{ field: key, from: String(was), to: String(value) }]);
  changed();
}
function setFx(code, patch) {
  const c = S.settings.currencies.find((x) => x.code === code);
  const was = JSON.stringify(Object.fromEntries(Object.keys(patch).map((k) => [k, c[k]])));
  Object.assign(c, patch);
  if (patch.rate) c.updated = Date.now();
  logAudit(ME, patch.rate ? 'refreshed exchange rate' : 'changed currency setting', 'setting', 'fx', code, [{ field: Object.keys(patch)[0], from: was, to: JSON.stringify(patch) }]);
  changed();
}
function refreshFx(code) {
  const c = S.settings.currencies.find((x) => x.code === code);
  const drift = 1 + (Math.random() - 0.5) * 0.01;
  setFx(code, { rate: round(c.rate * drift, code === 'SEK' ? 2 : 4) });
  B2C_FX[code] = c.rate;
}
function setNotif(id, on) {
  const n = S.settings.notifs.find((x) => x.id === id), was = n.on;
  n.on = on;
  logAudit(ME, on ? 'turned on notification' : 'turned off notification', 'setting', id, n.event, [{ field: 'on', from: String(was), to: String(on) }]);
  changed();
}

/* ---------- attention items for the dashboard ---------- */
function staleCurrencies() { return S.settings.currencies.filter((c) => c.code !== 'USD' && Date.now() - c.updated > 24 * HOUR); }
function attentionB2C() {
  const out = [];
  const held = heldOrders();
  if (held.length) out.push({ id: 'risk', sev: 'serious', icon: 'shield', title: held.length + (held.length === 1 ? ' paid order is' : ' paid orders are') + ' held by the risk engine', meta: money0(sum(held, (o) => o.gross)) + ' captured. Nothing goes to a supplier until a person decides. Oldest ' + ago(Math.min(...held.map((o) => o.created))), cta: 'Review queue', go: { route: 'risk' } });
  const disp = S.disputes.filter((d) => d.status === 'needs_response').sort((a, b) => a.due - b.due);
  if (disp.length) {
    const d = disp[0], left = d.due - Date.now();
    out.push({ id: 'disp', sev: left < 3 * DAY ? 'crit' : 'serious', icon: 'scale', title: disp.length + (disp.length === 1 ? ' card dispute needs' : ' card disputes need') + ' evidence', meta: d.id + ' is due in ' + ageText(left) + '. Missing the date loses the dispute and ' + money(d.amount) + ' plus a ' + money0(d.fee) + ' fee', cta: 'Open disputes', go: { route: 'refunds', tab: 'disputes' } });
  }
  const late = S.tickets.filter(ticketLate).sort((a, b) => lastPublic(a).ts - lastPublic(b).ts);
  if (late.length) out.push({ id: 'tk', sev: 'warn', icon: 'life', title: late.length + (late.length === 1 ? ' ticket is' : ' tickets are') + ' waiting past the reply target', meta: 'Oldest ' + late[0].id + ', ' + ageText(Date.now() - lastPublic(late[0]).ts) + ' without a reply. ' + late[0].subject, cta: 'Open inbox', go: { route: 'support', filter: 'late' } });
  const rq = S.refunds.filter((r) => r.status === 'requested');
  if (rq.length) out.push({ id: 'rfq', sev: 'warn', icon: 'undo', title: rq.length + (rq.length === 1 ? ' refund request needs' : ' refund requests need') + ' a decision', meta: money(sum(rq, (r) => r.amount)) + ' if all are approved', cta: 'Review', go: { route: 'refunds', tab: 'refunds', status: 'requested' } });
  const rf = S.refunds.filter((r) => r.status === 'failed');
  if (rf.length) out.push({ id: 'rff', sev: 'serious', icon: 'alert', title: rf.length + (rf.length === 1 ? ' refund failed' : ' refunds failed') + ' at the gateway', meta: rf[0].id + ': ' + rf[0].note, cta: 'Retry', go: { route: 'refunds', tab: 'refunds', status: 'failed' } });
  const fx = staleCurrencies();
  if (fx.length) out.push({ id: 'fx', sev: 'warn', icon: 'globe', title: 'Exchange rate for ' + fx.map((c) => c.code).join(', ') + ' is out of date', meta: 'Last updated ' + ago(Math.min(...fx.map((c) => c.updated))) + '. Customers are being quoted a stale price in that currency', cta: 'Refresh rates', go: { route: 'settings', tab: 'tax' } });
  return out;
}

/* ---------- storefront orders ---------- */
const DISPOSABLE = /(tempbox|mailinator|guerrilla|10minute|trashmail)/i;
function scoreStorefrontOrder({ email, country, gross, isNew, blacklistedBefore }) {
  const sig = [];
  if (isNew && gross > 40) sig.push(['New customer, first order above $40', 18]);
  if (DISPOSABLE.test(email)) sig.push(['Disposable email domain', 22]);
  if (S.risk.block.some((b) => b.kind === 'email' && email.startsWith(b.display.slice(0, 2)) && email.endsWith(b.display.slice(b.display.indexOf('@'))))) sig.push(['Email on a previous chargeback', 40]);
  if (blacklistedBefore) sig.push(['IMEI was checked blacklisted before', 30]);
  if (['NG', 'PK'].includes(country)) sig.push(['IP country differs from card country', 25]);
  return { score: Math.min(99, sum(sig, (x) => x[1]) + Math.floor(3 + Math.random() * 9)), signals: sig.map((x) => x[0]) };
}
function quoteStorefront({ sid, country }) {
  const s = svc(sid), list = S.retail[s.code], net = list;
  const { rate, tax } = taxFor(net, country);
  const gross = round(net + tax, 2), cur = B2C_COUNTRIES[country].cur;
  return { s, list, net, rate, tax, gross, cur };
}
function createStorefrontOrder({ imei, sid, email, country, method }) {
  const em = email.trim().toLowerCase();
  const existing = S.customers.find((x) => x.email === em);
  if (existing && existing.status === 'blocked') return { error: 'We can’t process this order. Contact support if you think this is a mistake.' };
  if (existing && existing.status === 'suspended') return { error: 'This account is on hold, so we can’t take a new order. Contact support to reactivate it.' };
  if (emailBlocked(em)) return { error: 'We can’t process this order. Contact support if you think this is a mistake.' };
  const q = quoteStorefront({ sid, country });
  const s = q.s, t = Date.now();
  let c = existing;
  if (!c) {
    const local = em.split('@')[0].replace(/[^a-z]+/g, ' ').trim() || 'guest';
    c = { id: 'c' + (S.customers.length + 1), name: local.replace(/\b\w/g, (m) => m.toUpperCase()), email: em, country, cur: q.cur, locale: 'en', hasAccount: false, optIn: false, risk: 'low', status: 'active', created: t, w: 1, notes: '', firstOrderAt: t, phone: '', emailVerified: false, createdBy: 'checkout', lastLogin: null, sessions: 0, pwChangedAt: null, mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' };
    S.customers.push(c); IDX.c.set(c.id, c);
  }
  const sc = scoreStorefrontOrder({ email: em, country, gross: q.gross, isNew: !custOrders(c.id).length, blacklistedBefore: S.imeiChecks.some((k) => k.imei === imei && k.status === 'blacklisted') });
  const hold = sc.score >= riskRule('rr2').value && riskRule('rr2').on;
  const tac = S.tac.find((x) => imei.startsWith(x.tac));
  const fee = gatewayFee(q.gross, method), id = 'SF-' + (++S.seq.sf);
  const o = {
    id, cid: c.id, sid, input: imei, device: tac ? tac.model + ' (' + tac.code + ')' : 'Unknown model', qty: 1, created: t, dur: 0, status: hold ? 'review' : 'queued', price: q.net, list: q.list, cost: s.cost, sup: s.sup, source: 'retail', chan: 'Storefront', by: 'System',
    reason: hold ? 'Risk hold: score ' + sc.score + '. ' + sc.signals[0] + (sc.signals.length > 1 ? ' and ' + (sc.signals.length - 1) + ' more' : '') : null, attempts: hold ? 0 : 1, ref: 'NEW-' + Math.floor(Math.random() * 1e6), doneAt: null, reply: null, country, cur: q.cur, fx: B2C_FX[q.cur], taxRate: q.rate, tax: q.tax, gross: q.gross, fee,
    pay: { method, status: 'captured', ref: method === 'crypto' ? 'inv_' + Math.floor(Math.random() * 1e8) : 'pi_3Q' + Math.floor(Math.random() * 1e7), threeDS: method !== 'crypto', brand: method === 'crypto' ? 'USDT TRC20' : 'Visa 4242' },
    risk: { score: sc.score, decision: hold ? 'review' : 'allow', signals: sc.signals, reviewedBy: null, reviewedAt: null, outcome: null },
    token: 't_' + Math.floor(Math.random() * 1e4) + 'x' + Math.floor(Math.random() * 1e5),
  };
  o.events = [
    { ts: t, k: 'created', text: 'Order placed on the storefront (' + B2C_COUNTRIES[country].name + ', ' + B2C_METHODS[method].label + ')', by: c.name },
    { ts: t + 1, k: 'paid', text: 'Payment captured ' + localMoney(o.gross, o.cur) + (o.cur !== 'USD' ? ' (' + money(o.gross) + ' at ' + o.fx + ')' : '') + ', ref ' + o.pay.ref, by: 'Payment gateway' },
    { ts: t + 2, k: 'risk', text: 'Risk score ' + sc.score + ': ' + (hold ? 'held for review' : 'allowed'), by: 'Risk engine' },
  ];
  if (hold) o.events.push({ ts: t + 3, k: 'review', text: o.reason, by: 'Risk engine' });
  o.updated = t;
  S.orders.push(o); IDX.o.set(o.id, o);
  const cap = [{ acct: 'gateway_clearing', dr: o.gross }, { acct: 'customer_funds', cr: o.price }];
  if (o.tax > 0) cap.push({ acct: 'vat_payable', cr: o.tax });
  post({ kind: 'b2c_payment', memo: 'Payment for ' + id + ' (' + B2C_METHODS[method].label + ')', refType: 'order', refId: id, mid: null, by: 'System', entries: cap });
  post({ kind: 'gateway_fee', memo: 'Gateway fee for ' + id, refType: 'order', refId: id, mid: null, by: 'System', entries: [{ acct: 'gateway_fees', dr: fee }, { acct: 'gateway_clearing', cr: fee }] });
  S.imeiChecks.unshift({ id: 'IC-' + (10000 + S.imeiChecks.length), ts: t, imei, brand: tac ? tac.brand : '', model: tac ? tac.model : 'Unknown', kind: 'basic', status: 'clean', source: 'pre_order', country, cost: 0, converted: id, cached: false });
  if (!hold) {
    later(() => {
      if (o.status !== 'queued') return;
      o.status = 'processing'; o.updated = Date.now(); o.attempts = 1;
      o.events.push({ ts: Date.now(), k: 'dispatch', text: 'Sent to ' + sup(o.sup).name + ' (' + sup(o.sup).api + ')', by: 'System' });
      changed();
    }, 1800);
    if (s.sla <= 60) later(() => {
      if (o.status !== 'processing') return;
      if (sup(o.sup).status !== 'up') { o.status = 'review'; o.reason = REVIEW_REASONS.timeout; o.attempts = 3; o.updated = Date.now(); o.events.push({ ts: Date.now(), k: 'review', text: o.reason, by: sup(o.sup).name }); } else settleOrder(o, 'System');
      changed();
    }, 6500);
  }
  changed();
  return { ok: true, order: o, held: hold };
}
function simulateStorefrontOrder() {
  const listed = S.listings.filter((l) => l.listed && S.retail[svc(l.sid).code]);
  const l = listed[Math.floor(Math.random() * listed.length)];
  const c = S.customers.filter((x) => x.status === 'active')[Math.floor(Math.random() * 20)];
  const tac = S.tac[Math.floor(Math.random() * S.tac.length)].tac;
  let imei = '', tries = 0;
  do { imei = luhn(tac + String(Math.floor(Math.random() * 1e6)).padStart(6, '0')); } while (imeiCheck(imei).blacklisted && tries++ < 10);
  const r = createStorefrontOrder({ imei, sid: l.sid, email: c.email, country: c.country, method: ['card', 'wallet', 'crypto'][Math.floor(Math.random() * 3)] });
  return r.order;
}
