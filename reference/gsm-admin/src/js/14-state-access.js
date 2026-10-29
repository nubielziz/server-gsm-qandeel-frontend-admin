/* Access state: admin accounts, and the IP rules that decide who may reach the console, the storefront and the merchant API.
   Same rule as the rest of the console: every mutation writes the audit log. Passwords are never stored or logged here. */

const MY_IP = '203.0.113.24';

/* ---------- roles ---------- */
const ADMIN_ROLES = {
  owner: { label: 'Owner', desc: 'Everything, including who else is an admin and who may connect.' },
  admin: { label: 'Admin', desc: 'Runs the business day to day. Cannot add admins or change access rules.' },
  finance: { label: 'Finance', desc: 'Deposits, withdrawals, commissions and refunds.' },
  support: { label: 'Support', desc: 'Customers, merchants and tickets.' },
  risk: { label: 'Risk reviewer', desc: 'Held orders, chargebacks and the blocklist.' },
  viewer: { label: 'Read only', desc: 'Can look at everything except settings and access. Cannot change anything.' },
};
/* what each role can do, per area: 2 full, 1 view only, 0 none */
const ROLE_AREAS = [['Orders', 'Orders and the review queue'], ['Customers', 'Customers and merchants'], ['Support', 'Tickets and replies'], ['Risk', 'Risk and checks'], ['Money', 'Finance, commissions, refunds and disputes'], ['Catalog', 'Services, suppliers and the storefront'], ['Settings', 'System settings'], ['Admins', 'Admin accounts and access rules']];
const ROLE_MATRIX = {
  owner: [2, 2, 2, 2, 2, 2, 2, 2],
  admin: [2, 2, 2, 2, 2, 2, 2, 1],
  finance: [1, 1, 0, 1, 2, 1, 0, 0],
  support: [1, 2, 2, 1, 0, 1, 0, 0],
  risk: [1, 1, 1, 2, 1, 0, 0, 0],
  viewer: [1, 1, 1, 1, 1, 1, 0, 0],
};
const ADMIN_STATUS = { active: ['b-good', 'checkCircle', 'Active'], invited: ['b-neutral', 'clock', 'Invited'], suspended: ['b-warn', 'pause', 'Suspended'] };
const ADMIN_SUSPEND_REASONS = ['Left the team', 'Account may be compromised', 'On leave', 'Under investigation', 'Other'];

const adm = (id) => S.admins.find((a) => a.id === id);
const isMe = (a) => a.name === ME;
const activeOwners = () => S.admins.filter((a) => a.role === 'owner' && a.status === 'active');

function resetAccessUi() {
  Object.assign(ui.access, { tab: 'admins', scope: 'all', test: { ip: '', scope: 'admin', res: null }, sel: null });
  Object.assign(ui.acA, { sort: 'name', dir: 1, page: 1 });
}

/* ---------- admin accounts ---------- */
function createAdmin(f) {
  const name = (f.name || '').trim().replace(/\s+/g, ' '), email = (f.email || '').trim().toLowerCase();
  if (name.length < 2) return { error: 'Enter their name.', field: 'nm' };
  if (!validEmail(email)) return { error: 'Enter a valid email address.', field: 'email' };
  if (S.admins.some((a) => a.email === email)) return { error: 'An admin with this email already exists.', field: 'email' };
  if (!ADMIN_ROLES[f.role]) return { error: 'Choose a role.', field: 'rl' };
  const t = Date.now();
  const a = { id: 'ad' + (++S.seq.ad), name, email, role: f.role, status: 'invited', twofa: false, lastLogin: null, lastIp: null, sessions: 0, createdAt: t, createdBy: ME, pwChangedAt: null, mustChangePw: false, resetSentAt: null, suspendedAt: null, suspendedReason: '' };
  if (f.mode === 'set') {
    const pr = pwProblem(f.password || '', a); if (pr) return { error: pr, field: 'password' };
    Object.assign(a, { pwChangedAt: t, mustChangePw: true });
  } else a.resetSentAt = t;
  S.admins.push(a);
  logAudit(ME, 'added admin', 'admin', a.id, a.name, [{ field: 'rl', from: '', to: ADMIN_ROLES[a.role].label }, { field: 'password', from: '', to: f.mode === 'set' ? 'temporary password set, change required at first sign-in' : 'invitation link emailed, valid for 1 hour' }]);
  changed();
  return { ok: true, a };
}
function updateAdmin(id, f) {
  const a = adm(id), name = (f.name || '').trim().replace(/\s+/g, ' '), email = (f.email || '').trim().toLowerCase(), diff = [];
  if (name.length < 2) return { error: 'Enter their name.', field: 'nm' };
  if (!validEmail(email)) return { error: 'Enter a valid email address.', field: 'email' };
  if (S.admins.some((x) => x.id !== a.id && x.email === email)) return { error: 'Another admin already uses this email.', field: 'email' };
  if (f.role !== a.role) {
    if (isMe(a)) return { error: 'You cannot change your own role. Ask another Owner.', field: 'rl' };
    if (a.role === 'owner' && a.status === 'active' && activeOwners().length < 2) return { error: 'There must always be one active Owner. Make someone else an Owner first.', field: 'rl' };
    diff.push({ field: 'rl', from: ADMIN_ROLES[a.role].label, to: ADMIN_ROLES[f.role].label });
  }
  if (name !== a.name) diff.push({ field: 'name', from: a.name, to: name });
  if (email !== a.email) diff.push({ field: 'email', from: a.email, to: email });
  if (!diff.length) return { ok: true, none: true };
  const oldName = a.name;
  Object.assign(a, { name, email, role: f.role });
  logAudit(ME, 'edited admin', 'admin', a.id, oldName, diff);
  changed();
  return { ok: true, diff };
}
function setAdminPassword(id, f) {
  const a = adm(id), t = Date.now(), diff = [];
  if (f.mode === 'set') {
    const pr = pwProblem(f.password || '', a); if (pr) return { error: pr, field: 'password' };
    Object.assign(a, { pwChangedAt: t, mustChangePw: true, resetSentAt: null });
    diff.push({ field: 'password', from: '', to: 'temporary password set, change required at next sign-in' });
  } else {
    a.resetSentAt = t;
    diff.push({ field: 'password', from: '', to: 'reset link emailed, valid for 1 hour' });
  }
  if (f.signOut && a.sessions) { diff.push({ field: 'sessions', from: String(a.sessions), to: '0' }); a.sessions = 0; }
  logAudit(ME, f.mode === 'set' ? 'set a temporary password for admin' : 'sent a password reset link to admin', 'admin', a.id, a.name, diff);
  changed();
  return { ok: true };
}
function signOutAdmin(id) {
  const a = adm(id), n = a.sessions;
  a.sessions = 0;
  logAudit(ME, 'signed out all devices of admin', 'admin', a.id, a.name, [{ field: 'sessions', from: String(n), to: '0' }]);
  changed();
  return n;
}
function resetAdmin2fa(id) {
  const a = adm(id);
  a.twofa = false; a.sessions = isMe(a) ? a.sessions : 0;
  logAudit(ME, 'reset 2FA of admin', 'admin', a.id, a.name, [{ field: '2FA', from: 'on', to: 'off, new setup at next sign-in' }]);
  changed();
}
function suspendAdmin(id, reason, note) {
  const a = adm(id);
  if (isMe(a)) return { error: 'You cannot suspend yourself.' };
  if (a.role === 'owner' && activeOwners().length < 2) return { error: 'There must always be one active Owner. Make someone else an Owner first.' };
  if (a.status === 'suspended') return { error: 'This account is already suspended.' };
  const was = a.status, n = a.sessions;
  Object.assign(a, { status: 'suspended', sessions: 0, suspendedAt: Date.now(), suspendedReason: reason + (note ? ': ' + note : ''), prevStatus: was });
  logAudit(ME, 'suspended admin', 'admin', a.id, a.name, [{ field: 'status', from: was, to: 'suspended' }, { field: 'reason', from: '', to: a.suspendedReason }, ...(n ? [{ field: 'sessions', from: String(n), to: '0' }] : [])]);
  changed();
  return { ok: true, signedOut: n };
}
function reactivateAdmin(id) {
  const a = adm(id), to = a.lastLogin ? 'active' : 'invited';
  Object.assign(a, { status: to, suspendedAt: null, suspendedReason: '' });
  logAudit(ME, 'reactivated admin', 'admin', a.id, a.name, [{ field: 'status', from: 'suspended', to }]);
  changed();
}

/* ---------- IP rules ---------- */
const IP_SCOPE = { store: 'Customers (storefront)', api: 'Merchants (API)', admin: 'Admins (console)', all: 'Everywhere' };
const IP_SCOPE_TAG = { store: 'Storefront', api: 'Merchant API', admin: 'Admin console', all: 'Everywhere' };
const IP_DURATIONS = [['0', 'Until I remove it'], ['1', '1 hour'], ['24', '24 hours'], ['168', '7 days'], ['720', '30 days']];
const durText = (h) => ({ 1: '1 hour', 24: '24 hours', 168: '7 days', 720: '30 days' })[h] || h + ' hours';

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
function parseIp(raw) {
  const s = String(raw || '').trim();
  if (!s) return { error: 'Enter an IP address or a range.' };
  const [addr, len, extra] = s.split('/');
  const m = IPV4.exec(addr);
  if (m && extra === undefined) {
    const o = m.slice(1).map(Number);
    if (o.some((n) => n > 255)) return { error: 'Each part of an IPv4 address is 0 to 255.' };
    let bits = 32;
    if (len !== undefined) { if (!/^\d{1,2}$/.test(len) || +len > 32) return { error: 'The number after the slash is 0 to 32, like /24.' }; bits = +len; }
    const n = ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const base = (n & mask) >>> 0;
    return { v: 4, base, mask, bits, text: [base >>> 24, (base >>> 16) & 255, (base >>> 8) & 255, base & 255].join('.') + (bits === 32 ? '' : '/' + bits) };
  }
  if (!m && /^[0-9a-f:]{3,39}$/i.test(addr) && addr.includes(':') && len === undefined) return { v: 6, text: addr.toLowerCase() };
  return { error: 'Enter an IPv4 address like 203.0.113.24, or a range like 203.0.113.0/24.' };
}
function ipIn(rule, ip) {
  const r = parseIp(rule), p = parseIp(ip);
  if (r.error || p.error || r.v !== p.v) return false;
  if (r.v === 6) return r.text === p.text;
  return ((p.base & r.mask) >>> 0) === r.base;
}
const ipLive = (r) => !r.expires || r.expires > Date.now();
const ipRule = (id) => S.ipRules.find((r) => r.id === id);
const liveRules = (kind) => S.ipRules.filter((r) => r.kind === kind && ipLive(r));

/* Block rules are checked first and always win. Then, for the console only, the allowlist (when the restriction is on). */
function ipVerdict(ip, scope) {
  const p = parseIp(ip);
  if (p.error) return { error: p.error };
  const blk = liveRules('block').find((r) => (r.scope === 'all' || r.scope === scope) && ipIn(r.cidr, p.text));
  if (blk) return { ok: false, why: 'blocked', rule: blk, ip: p.text };
  if (scope === 'admin' && S.access.restrict) {
    const al = liveRules('allow').find((r) => ipIn(r.cidr, p.text));
    return al ? { ok: true, why: 'allowed', rule: al, ip: p.text } : { ok: false, why: 'not_listed', ip: p.text };
  }
  return { ok: true, why: 'open', ip: p.text };
}

function addIpRule({ kind, ip, scope, label, reason, hours }) {
  const p = parseIp(ip);
  if (p.error) return { error: p.error, field: 'ip' };
  if (p.v === 4 && p.bits < 16) return { error: 'That range is too wide (' + num(2 ** (32 - p.bits)) + ' addresses). Use /16 or narrower.', field: 'ip' };
  const sc = kind === 'allow' ? 'admin' : scope;
  if (liveRules(kind).some((r) => r.cidr === p.text && (kind === 'allow' || r.scope === sc))) return { error: kind === 'allow' ? 'That address is already on the list.' : 'That address is already blocked for this audience.', field: 'ip' };
  if (kind === 'block' && (sc === 'admin' || sc === 'all') && ipIn(p.text, MY_IP)) return { error: 'This includes your own address (' + MY_IP + '). You would lock yourself out of the console.', field: 'ip' };
  const t = Date.now();
  const r = { id: 'ip' + (++S.seq.ip), kind, cidr: p.text, scope: sc, label: label || '', reason: reason || '', source: 'manual', by: ME, ts: t, expires: hours ? t + hours * HOUR : null, hits: 0, lastHit: null };
  S.ipRules.unshift(r);
  const diff = kind === 'allow' ? [{ field: 'label', from: '', to: r.label || 'none' }] : [{ field: 'applies to', from: '', to: IP_SCOPE[sc] }, { field: 'reason', from: '', to: reason }];
  if (hours) diff.push({ field: 'lasts', from: '', to: durText(hours) });
  logAudit(ME, kind === 'allow' ? 'allowed IP for the admin console' : 'blocked IP', 'access', r.id, r.cidr, diff);
  changed();
  return { ok: true, r };
}
function removeIpRule(id) {
  const r = ipRule(id);
  if (r.kind === 'allow' && S.access.restrict && !liveRules('allow').some((x) => x.id !== id && ipIn(x.cidr, MY_IP))) return { error: 'This is the rule that lets you in right now. Add another one that covers your address first, or turn the restriction off.' };
  S.ipRules.splice(S.ipRules.indexOf(r), 1);
  logAudit(ME, r.kind === 'allow' ? 'removed allowed IP' : 'unblocked IP', 'access', r.id, r.cidr, [{ field: 'status', from: r.kind === 'allow' ? 'allowed' : 'blocked', to: 'removed' }]);
  changed();
  return { ok: true };
}
function setAccessRestrict(on) {
  if (on && !liveRules('allow').some((r) => ipIn(r.cidr, MY_IP))) return { error: 'Your own address (' + MY_IP + ') is not on the list, so turning this on would lock you out. Add it first.', needMine: true };
  S.access.restrict = on;
  logAudit(ME, on ? 'turned on the IP restriction for the admin console' : 'turned off the IP restriction for the admin console', 'access', 'restrict', 'Admin console', [{ field: 'only allowed IPs', from: String(!on), to: String(on) }]);
  changed();
  return { ok: true };
}
