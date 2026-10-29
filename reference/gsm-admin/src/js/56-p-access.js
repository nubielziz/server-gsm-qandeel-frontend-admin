/* Admins and access: who can sign in to the console, and which network addresses may reach it, the storefront and the merchant API. */

const roleOptions = () => Object.entries(ADMIN_ROLES).map(([k, v]) => [k, v.label]);
const roleTag = (r) => typeTag(ADMIN_ROLES[r].label);
const adminBadge = (a) => badge(...ADMIN_STATUS[a.status]);
const IP_LEFT = (r) => (r.expires ? '<span class="text-ink2">in ' + ageText(r.expires - Date.now()) + '</span>' : '<span class="text-ink3">Until removed</span>');

/* the sign-in state of an admin who has not finished joining */
function adminJoinText(a) {
  if (a.status !== 'invited') return '';
  if (a.pwChangedAt) return 'Temporary password set ' + ago(a.pwChangedAt) + '. They must change it and set up 2FA at first sign-in.';
  const stale = a.resetSentAt && Date.now() - a.resetSentAt > HOUR;
  return stale ? 'The invitation link expired. Send a new one from Password.' : 'Invitation link sent ' + ago(a.resetSentAt) + '. It works for 1 hour.';
}
function adminPwText(a) {
  if (a.status === 'invited') return a.pwChangedAt ? 'Temporary, change required' : 'Not chosen yet';
  const open = a.resetSentAt && a.resetSentAt > (a.pwChangedAt || 0);
  if (open) return 'Reset link sent ' + ago(a.resetSentAt);
  return a.mustChangePw ? '<span class="font-medium text-warn-fg">Temporary, change required at next sign-in</span>' : 'Changed ' + ago(a.pwChangedAt);
}

/* the verdict chip shown next to an IP address anywhere in the console */
function ipVerdictChip(ip, scope) {
  const v = ipVerdict(ip, scope);
  if (v.error) return '';
  if (v.why === 'blocked') return badge('b-crit', 'ban', 'Blocked');
  if (v.why === 'not_listed') return badge('b-warn', 'alert', 'Not on the allowlist');
  return '';
}

/* the last address a customer was seen from, with a way to block it */
function custIpCell(c) {
  if (!c.lastIp) return '<span class="text-ink3">Unknown</span>';
  const chip = ipVerdictChip(c.lastIp, 'store');
  return `<span class="mono">${esc(c.lastIp)}</span> ${chip ? chip + ' <button class="link text-xs" data-act="go" data-route="access" data-p=\'{"tab":"block"}\'>See the rule</button>' : '<button class="btn btn-sm" data-act="ip-block" data-ip="' + esc(c.lastIp) + '" data-scope="store" data-who="' + esc(c.name) + '">' + icon('ban', 'ic-xs') + 'Block IP…</button>'}`;
}

/* ---------- admin accounts ---------- */
function tabAdmins() {
  const all = S.admins, act = all.filter((a) => a.status === 'active');
  const strip = statGrid([
    { label: 'Active admins', value: act.length, sub: all.filter((a) => a.sessions > 0).length + ' signed in now' },
    { label: 'Waiting to join', value: all.filter((a) => a.status === 'invited').length, cls: all.some((a) => a.status === 'invited') ? 'text-warn-fg' : '', sub: 'Invited, never signed in' },
    { label: 'Suspended', value: all.filter((a) => a.status === 'suspended').length, sub: 'Cannot sign in, history kept' },
    { label: '2FA on', value: act.filter((a) => a.twofa).length + ' of ' + act.length, cls: act.some((a) => !a.twofa) ? 'text-warn-fg' : '', sub: 'Required for every admin', tip: 'Every admin signs in with a password and a code from an authenticator app. A new admin sets it up the first time.' },
  ], 'Admin figures');
  const cols = [
    { key: 'name', label: 'Admin', val: (a) => a.name.toLowerCase(), render: (a) => `<div class="flex items-center gap-2.5">${avatar(a.name)}<div class="min-w-0"><button type="button" class="link font-medium" data-act="ad-open" data-id="${a.id}">${esc(a.name)}</button>${isMe(a) ? ' <span class="tag">You</span>' : ''}<p class="truncate text-2xs text-ink3">${esc(a.email)}</p><p class="mt-1 md:hidden">${roleTag(a.role)}</p></div></div>` },
    { key: 'role', label: 'Role', hide: 'md', val: (a) => a.role, render: (a) => roleTag(a.role) },
    { key: 'status', label: 'Status', val: (a) => a.status, render: (a) => adminBadge(a) + (a.status === 'invited' ? `<p class="mt-0.5 text-2xs text-ink3">${a.pwChangedAt ? 'Temporary password' : Date.now() - a.resetSentAt > HOUR ? 'Link expired' : 'Link sent ' + ago(a.resetSentAt)}</p>` : a.status === 'suspended' ? `<p class="mt-0.5 text-2xs text-ink3">${esc(a.suspendedReason.split(':')[0])}</p>` : '') },
    { key: 'twofa', label: '2FA', hide: 'md', val: (a) => (a.twofa ? 1 : 0), render: (a) => (a.twofa ? badge('b-good', 'shield', 'On') : a.status === 'invited' ? '<span class="text-xs text-ink3">At first sign-in</span>' : badge('b-warn', 'alert', 'Off')) },
    { key: 'last', label: 'Last sign-in', hide: 'sm', val: (a) => a.lastLogin || 0, render: (a) => (a.lastLogin ? `<span class="text-ink2">${ago(a.lastLogin)}</span><p class="mono text-2xs text-ink3">${esc(a.lastIp)}</p>` : '<span class="text-ink3">Never</span>') },
    { key: 'sess', label: 'Devices', num: true, hide: 'lg', val: (a) => a.sessions, render: (a) => (a.sessions ? a.sessions : '<span class="text-ink3">0</span>') },
    { key: 'a', label: '', hide: 'sm', render: (a) => `<button class="btn btn-sm" data-act="ad-open" data-id="${a.id}">Manage</button>` },
  ];
  const accounts = panel({ title: 'Admin accounts', sub: 'Everyone who can sign in to this console. Suspending keeps their history in the audit log.', right: `<button class="btn btn-primary btn-sm" data-act="ad-new">${icon('plus', 'ic-sm')}Add admin</button>`, body: table({ id: 'ac-admins', st: ui.acA, cols, rows: all, rowId: (a) => a.id, pageSize: 0, caption: 'Admin accounts' }) });
  const mark = (n) => (n === 2 ? '<span class="font-medium text-good-fg">Full</span>' : n === 1 ? '<span class="text-ink2">View</span>' : '<span class="text-ink3" aria-label="No access">–</span>');
  const head = `<tr><th scope="col">Role</th>${ROLE_AREAS.map(([s, full]) => `<th scope="col" class="text-center" title="${esc(full)}">${esc(s)}</th>`).join('')}</tr>`;
  const rows = Object.entries(ADMIN_ROLES).map(([k, v]) => `<tr><th scope="row" class="!whitespace-normal !font-medium min-w-[15rem]"><span class="block">${esc(v.label)}</span><span class="block text-2xs font-normal text-ink3">${esc(v.desc)}</span></th>${ROLE_MATRIX[k].map((n) => `<td class="text-center">${mark(n)}</td>`).join('')}</tr>`).join('');
  const matrix = panel({ title: 'What each role can do', sub: 'Full means they can change things. View means they can look but not change.', body: `<div class="tbl-wrap"><table class="tbl" aria-label="Role permissions"><thead>${head}</thead><tbody>${rows}</tbody></table></div>` });
  return strip + accounts + `<div class="mt-4">${matrix}</div>`;
}

function adminDrawer(id) {
  const a = adm(id), me = isMe(a);
  const banner = a.status === 'suspended' ? `<div class="mb-4 flex gap-2.5 rounded-lg bg-warn-bg p-3 text-warn-fg" role="note">${icon('pause', 'mt-px')}<div class="text-sm"><p class="font-medium">Suspended ${ago(a.suspendedAt)}</p><p class="mt-0.5">${esc(a.suspendedReason)}</p><p class="mt-1.5 text-xs">They cannot sign in and every session was ended. Reactivate to let them back in.</p></div></div>`
    : a.status === 'invited' ? `<div class="mb-4 flex gap-2.5 rounded-lg bg-sunken p-3 text-ink2" role="note">${icon('clock', 'mt-px')}<p class="text-sm">${esc(adminJoinText(a))}</p></div>` : '';
  const ipRow = a.lastIp ? `<span class="mono">${esc(a.lastIp)}</span> ${ipVerdictChip(a.lastIp, 'admin')}${me ? '' : ` <button class="btn btn-sm" data-act="ip-block" data-ip="${esc(a.lastIp)}" data-scope="admin" data-who="${esc(a.name)}">${icon('ban', 'ic-xs')}Block IP…</button>`}` : '<span class="text-ink3">None yet</span>';
  const foot = a.status === 'suspended'
    ? `<button class="btn btn-primary" data-act="ad-reactivate" data-id="${a.id}">${icon('checkCircle', 'ic-sm')}Reactivate</button>`
    : `<button class="btn btn-danger" data-act="ad-suspend" data-id="${a.id}" ${me ? 'disabled title="You cannot suspend yourself"' : ''}>${icon('pause', 'ic-sm')}Suspend…</button>`;
  return `<div class="flex h-full flex-col">
  <div class="drawer-h"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 id="drawer-title" class="text-lg font-semibold">${esc(a.name)}</h2>${adminBadge(a)}${roleTag(a.role)}${me ? '<span class="tag">You</span>' : ''}</div><p class="mt-0.5 text-xs text-ink3">${esc(a.email)}</p></div><button class="btn btn-ghost btn-icon" data-act="close-drawer" aria-label="Close details">${icon('x')}</button></div>
  <div class="drawer-b">
    ${banner}
    <dl class="dl mb-5">
      <dt>Role</dt><dd>${esc(ADMIN_ROLES[a.role].label)}<p class="text-xs text-ink3">${esc(ADMIN_ROLES[a.role].desc)}</p></dd>
      <dt>2FA</dt><dd>${a.twofa ? badge('b-good', 'shield', 'On') : a.status === 'invited' ? '<span class="text-ink3">They set it up at first sign-in</span>' : badge('b-warn', 'alert', 'Off, new setup at next sign-in')}</dd>
      <dt>Password</dt><dd>${adminPwText(a)}</dd>
      <dt>Last sign-in</dt><dd>${a.lastLogin ? ago(a.lastLogin) : '<span class="text-ink3">Never</span>'}</dd>
      <dt>From</dt><dd class="flex flex-wrap items-center gap-1.5">${ipRow}</dd>
      <dt>Signed in on</dt><dd>${a.sessions ? a.sessions + (a.sessions === 1 ? ' device' : ' devices') : '<span class="text-ink3">No active sessions</span>'}</dd>
      <dt>Added</dt><dd>${fmtDate(a.createdAt)}<p class="text-xs text-ink3">by ${esc(a.createdBy)}</p></dd>
    </dl>
    <h3 class="mb-2 text-xs font-medium text-ink3">Manage the account</h3>
    <div class="flex flex-wrap gap-2">
      <button class="btn" data-act="ad-edit" data-id="${a.id}">${icon('edit', 'ic-sm')}Edit details</button>
      <button class="btn" data-act="ad-pw" data-id="${a.id}">${icon('lock', 'ic-sm')}Password…</button>
      <button class="btn" data-act="ad-signout" data-id="${a.id}" ${a.sessions ? '' : 'disabled'}>${icon('upload', 'ic-sm')}Sign out everywhere</button>
      <button class="btn" data-act="ad-2fa" data-id="${a.id}" ${a.twofa ? '' : 'disabled'}>${icon('shield', 'ic-sm')}Reset 2FA…</button>
    </div>
    <p class="mt-4 rounded-md bg-sunken p-3 text-xs text-ink2">You can replace a password but never read it. Passwords are never written to the audit log.</p>
  </div>
  <div class="drawer-f">${foot}<span class="flex-1"></span><button class="btn" data-act="close-drawer">Close</button></div></div>`;
}
actions['ad-open'] = (el) => openDrawer(() => adminDrawer(el.dataset.id));

function wireRoleHint(cur) {
  const d = $('#dlg'), sel = d.querySelector('select[name=rl]'), hint = d.querySelector('#role-hint');
  if (!sel || !hint) return;
  const sync = () => { hint.textContent = ADMIN_ROLES[sel.value].desc; };
  sel.addEventListener('change', sync); sync();
}
actions['ad-new'] = () => {
  modal({ title: 'Add an admin', sub: 'They get an account on this console. They set up 2FA the first time they sign in.',
    body: `<div class="space-y-3"><div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2">${field('Full name', '<input class="input" name="nm" type="text" autocomplete="off" autofocus>')}</div>
      <div class="sm:col-span-2">${field('Work email', '<input class="input" name="email" type="text" inputmode="email" autocomplete="off" spellcheck="false" placeholder="name@gsm-supply.example">', 'The invitation goes here.')}</div>
      <div class="sm:col-span-2"><label class="label" for="role-sel">Role</label>${selectEl('rl', 'support', roleOptions(), 'Role', 'id="role-sel"', 'w-full')}<p id="role-hint" class="hint"></p></div></div>
      ${pwChooser({ who: 'They', signOut: false })}</div>`,
    confirm: 'Add admin',
    onSubmit: (f) => {
      const r = createAdmin({ name: f.nm.value, email: f.email.value, role: f.rl.value, ...pwSubmit(f) });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: r.a.name + ' added as ' + ADMIN_ROLES[r.a.role].label, body: f.pwmode.value === 'link' ? 'An invitation was sent to ' + r.a.email + '. It works for 1 hour.' : 'Temporary password set. They must change it at first sign-in.', ttl: 3800 });
      openDrawer(() => adminDrawer(r.a.id));
      return true;
    } });
  wirePwChooser(); wireRoleHint();
};
actions['ad-edit'] = (el) => {
  const a = adm(el.dataset.id), me = isMe(a);
  modal({ title: 'Edit ' + esc(a.name), sub: 'Changes are written to the audit log.',
    body: `<div class="space-y-3">${field('Full name', `<input class="input" name="nm" type="text" autocomplete="off" value="${esc(a.name)}">`)}
      ${field('Work email', `<input class="input" name="email" type="text" inputmode="email" autocomplete="off" spellcheck="false" value="${esc(a.email)}">`)}
      <div><label class="label" for="role-sel">Role</label>${selectEl('rl', a.role, roleOptions(), 'Role', `id="role-sel" ${me ? 'disabled' : ''}`, 'w-full')}<p id="role-hint" class="hint"></p>${me ? '<p class="hint">You cannot change your own role. Ask another Owner.</p>' : ''}</div></div>`,
    confirm: 'Save changes',
    onSubmit: (f) => {
      const r = updateAdmin(a.id, { name: f.nm.value, email: f.email.value, role: me ? a.role : f.rl.value });
      if (r.error) return failField(f, r);
      toast(r.none ? { kind: 'info', title: 'Nothing changed' } : { kind: 'success', title: 'Admin updated', body: r.diff.map((d) => d.field).join(', ') + ' changed.', ttl: 2800 });
      return true;
    } });
  wireRoleHint();
};
actions['ad-pw'] = (el) => {
  const a = adm(el.dataset.id);
  modal({ title: 'Password for ' + esc(a.name), sub: 'You can replace it but never read it.',
    body: `<div class="space-y-3">${pwChooser({ who: 'They', signOut: true })}</div>`, confirm: 'Continue',
    onSubmit: (f) => {
      const r = setAdminPassword(a.id, { ...pwSubmit(f), signOut: f.signout.checked });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: f.pwmode.value === 'link' ? 'Reset link sent' : 'Temporary password set', body: f.pwmode.value === 'link' ? 'Sent to ' + a.email + '. It works for 1 hour.' : a.name + ' must change it at next sign-in.', ttl: 3400 });
      return true;
    } });
  wirePwChooser();
};
actions['ad-signout'] = (el) => { const a = adm(el.dataset.id); confirmDlg({ title: 'Sign ' + esc(a.name) + ' out everywhere?', body: `<p>They are signed out of ${a.sessions} ${a.sessions === 1 ? 'device' : 'devices'} right away and must sign in again with their password and 2FA code.</p>`, confirm: 'Sign out', run: () => { const n = signOutAdmin(a.id); toast({ kind: 'success', title: a.name + ' signed out', body: n + (n === 1 ? ' session' : ' sessions') + ' ended.', ttl: 2800 }); } }); };
actions['ad-2fa'] = (el) => { const a = adm(el.dataset.id); confirmDlg({ title: 'Reset 2FA for ' + esc(a.name) + '?', body: '<p>Use this when they lost their phone. The old authenticator stops working and they set up a new one at their next sign-in. Check it is really them first.</p>', confirm: 'Reset 2FA', kind: 'danger', run: () => { resetAdmin2fa(a.id); toast({ kind: 'success', title: '2FA reset for ' + a.name, body: 'They will scan a new QR code at next sign-in.', ttl: 3000 }); } }); };
actions['ad-suspend'] = (el) => {
  const a = adm(el.dataset.id);
  modal({ title: 'Suspend ' + esc(a.name) + '?', sub: 'They cannot sign in until you reactivate them.',
    body: `<div class="space-y-3">${field('Reason', selectEl('why', '', [['', 'Choose a reason'], ...ADMIN_SUSPEND_REASONS.map((r) => [r, r])], 'Reason', '', 'w-full'), 'Shown to your team only.')}${field('Note (optional)', '<input class="input" name="note" type="text" maxlength="140" autocomplete="off">')}
      <ul class="list-disc space-y-1 ps-5 text-sm text-ink2"><li>Every session ends now${a.sessions ? ' (' + a.sessions + (a.sessions === 1 ? ' device' : ' devices') + ')' : ''}.</li><li>Their name stays on past actions in the audit log.</li><li>You can reactivate them at any time.</li></ul></div>`,
    confirm: 'Suspend admin', kind: 'danger',
    onSubmit: (f) => {
      if (!f.why.value) { f.why.setAttribute('aria-invalid', 'true'); return 'Choose a reason so the next person knows why.'; }
      const r = suspendAdmin(a.id, f.why.value, f.note.value.trim());
      if (r.error) return r.error;
      toast({ kind: 'success', title: a.name + ' suspended', body: r.signedOut ? r.signedOut + (r.signedOut === 1 ? ' session' : ' sessions') + ' ended.' : 'They cannot sign in.', ttl: 3000 });
      return true;
    } });
};
actions['ad-reactivate'] = (el) => { const a = adm(el.dataset.id); confirmDlg({ title: 'Reactivate ' + esc(a.name) + '?', body: '<p>They can sign in again with their existing password and 2FA.</p>', confirm: 'Reactivate', run: () => { reactivateAdmin(a.id); toast({ kind: 'success', title: a.name + ' reactivated', ttl: 2600 }); } }); };

/* ---------- allowed IPs ---------- */
function tabIpAllow() {
  const on = S.access.restrict, rules = D(liveRules('allow')), mine = ipVerdict(MY_IP, 'admin');
  const me = on ? (mine.ok ? `<span class="text-good-fg">${icon('checkCircle', 'ic-xs inline')} Your address <span class="mono">${MY_IP}</span> is allowed${mine.rule ? ' by “' + esc(mine.rule.label || mine.rule.cidr) + '”' : ''}.</span>` : `<span class="text-crit-fg">${icon('alert', 'ic-xs inline')} Your address <span class="mono">${MY_IP}</span> is ${mine.why === 'blocked' ? 'blocked' : 'not on the list'}.</span>`) : `<span class="text-ink3">Your address is <span class="mono">${MY_IP}</span>.</span>`;
  const gate = `<section class="panel mb-4 p-3.5" aria-label="Admin console restriction"><div class="flex flex-wrap items-start gap-x-4 gap-y-3"><div class="min-w-0 flex-1 basis-80"><h2 class="text-sm font-semibold">Only allowed IPs can open the admin console</h2>
    <p class="mt-1 text-sm text-ink2">${on ? 'Anyone else gets a plain “Access denied” page and never sees the sign-in form. A password and 2FA are still needed on top. Block rules always win over this list.' : 'Right now the sign-in page opens from any address. Turn this on to let only the addresses below reach it.'}</p>
    <p class="mt-2 text-xs">${me}</p></div>
    <div class="flex items-center gap-2.5"><span class="text-sm font-medium">${on ? 'On' : 'Off'}</span>${switchEl(on, 'ac-restrict', 'x', (on ? 'Turn off' : 'Turn on') + ': only allowed IPs can open the admin console')}</div></div></section>`;
  const cols = [
    { key: 'cidr', label: 'Address', val: (r) => r.cidr, render: (r) => `<span class="mono">${esc(r.cidr)}</span>${r.cidr.includes('/') ? ' <span class="tag">Range</span>' : ''}<p class="text-2xs text-ink3">${esc(r.label || 'No label')}</p>` },
    { key: 'by', label: 'Added', hide: 'md', val: (r) => r.ts, render: (r) => `<span class="text-ink2">${ago(r.ts)}</span><p class="text-2xs text-ink3">by ${esc(r.by)}</p>` },
    { key: 'hits', label: 'Used, 7 days', num: true, hide: 'sm', val: (r) => r.hits, render: (r) => (r.hits ? num(r.hits) + '<p class="text-2xs text-ink3">last ' + ago(r.lastHit) + '</p>' : '<span class="text-ink3">Not yet</span>') },
    { key: 'exp', label: 'Lasts', val: (r) => r.expires || 9e15, render: (r) => IP_LEFT(r) },
    { key: 'a', label: '', render: (r) => `<button class="btn btn-sm" data-act="ip-remove" data-id="${r.id}">Remove</button>` },
  ];
  const addMine = !rules.some((r) => ipIn(r.cidr, MY_IP)) ? `<button class="btn btn-sm" data-act="ip-allow-mine">${icon('plus', 'ic-sm')}Add my IP</button>` : '';
  const list = panel({ title: 'Allowed addresses', sub: 'Use a single address like 203.0.113.24 or a range like 203.0.113.0/24. A temporary entry removes itself.', right: `${addMine}<button class="btn btn-primary btn-sm" data-act="ip-allow-add">${icon('plus', 'ic-sm')}Add IP</button>`, body: table({ id: 'ac-allow', st: ui.acL, cols, rows: rules, rowId: (r) => r.id, pageSize: 0, caption: 'Allowed IP addresses', empty: emptyBlock({ ic: 'globe', title: 'No addresses on the list', body: 'Add the office or home addresses your team signs in from, then turn the restriction on.', cta: `<button class="btn btn-primary" data-act="ip-allow-add">${icon('plus', 'ic-sm')}Add IP</button>` }) }) });
  return gate + list + `<div class="mt-4">${ipTester()}</div>`;
}
const ALLOW_DURATIONS = [['0', 'Until I remove it'], ['24', '24 hours'], ['168', '7 days'], ['720', '30 days']];
function allowDialog(prefill = '') {
  modal({ title: 'Allow an address', sub: 'It can open the admin console. Everyone still needs a password and 2FA.',
    body: `<div class="space-y-3">${field('IP address or range', `<input class="input mono" name="ip" type="text" autocomplete="off" spellcheck="false" placeholder="203.0.113.24 or 203.0.113.0/24" value="${esc(prefill)}" autofocus>`, 'Home connections change address now and then. Ask your provider for a fixed one, or allow a short range.')}
      ${field('Label', '<input class="input" name="label" type="text" maxlength="60" autocomplete="off" placeholder="Office, Amman">', 'So the next person knows whose it is.')}
      ${field('For how long', selectEl('dur', '0', ALLOW_DURATIONS, 'Duration', '', 'w-full'), 'Pick a short time for someone who is travelling.')}</div>`,
    confirm: 'Allow address',
    onSubmit: (f) => {
      const r = addIpRule({ kind: 'allow', ip: f.ip.value, label: f.label.value.trim(), hours: +f.dur.value });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: r.r.cidr + ' allowed', body: S.access.restrict ? 'It can open the admin console now.' : 'The restriction is off, so it only takes effect once you turn it on.', ttl: 3200 });
      return true;
    } });
}
actions['ip-allow-add'] = () => allowDialog();
actions['ip-allow-mine'] = () => allowDialog(MY_IP);
actions['ac-restrict'] = () => {
  if (S.access.restrict) {
    confirmDlg({ title: 'Open the admin console to any address?', body: '<p>The sign-in page will open from everywhere. A password and 2FA are still needed. Block rules still apply.</p>', confirm: 'Turn off', kind: 'danger', run: () => { setAccessRestrict(false); toast({ kind: 'info', title: 'IP restriction is off', ttl: 2600 }); } });
    return;
  }
  const r = setAccessRestrict(true);
  if (r.error) { modal({ title: 'Add your address first', sub: 'Otherwise you would lock yourself out.', body: `<p class="text-sm text-ink2">${esc(r.error)}</p>`, confirm: 'Add my IP and turn on', onSubmit: () => { const a = addIpRule({ kind: 'allow', ip: MY_IP, label: 'Me, ' + ME, hours: 0 }); if (a.error) return a.error; setAccessRestrict(true); toast({ kind: 'success', title: 'Only allowed IPs can open the console', ttl: 2800 }); return true; } }); return; }
  toast({ kind: 'success', title: 'Only allowed IPs can open the console', ttl: 2800 });
};
actions['ip-remove'] = (el) => {
  const r = ipRule(el.dataset.id), allow = r.kind === 'allow';
  confirmDlg({ title: (allow ? 'Remove ' : 'Unblock ') + esc(r.cidr) + '?', body: allow ? '<p>This address can no longer open the admin console' + (S.access.restrict ? '' : ' once the restriction is on') + '.</p>' : `<p>Requests from <span class="mono">${esc(r.cidr)}</span> are accepted again for ${esc(IP_SCOPE[r.scope].toLowerCase())}.</p>`, confirm: allow ? 'Remove' : 'Unblock', kind: allow ? 'danger' : 'primary', run: () => {
    const x = removeIpRule(r.id);
    if (x.error) { toast({ kind: 'error', title: 'Cannot remove this one', body: x.error, ttl: 7000 }); return; }
    toast({ kind: 'info', title: allow ? 'Removed' : 'Unblocked', body: r.cidr, ttl: 2400 });
  } });
};

/* ---------- blocked IPs ---------- */
function tabIpBlock() {
  const all = D(liveRules('block')), f = ui.access.scope;
  const rows = all.filter((r) => f === 'all' || r.scope === f || r.scope === 'all');
  const strip = statGrid([
    { label: 'Active blocks', value: all.length, sub: all.filter((r) => r.expires).length + ' temporary' },
    { label: 'Added by the risk engine', value: all.filter((r) => r.source === 'auto').length, sub: 'Card testing, failed sign-ins' },
    { label: 'Requests refused', value: num(sum(all, (r) => r.hits)), sub: 'In the last 7 days' },
    { label: 'Covering the console', value: all.filter((r) => r.scope === 'admin' || r.scope === 'all').length, sub: 'Rules that stop admin sign-ins' },
  ], 'Blocked IP figures');
  const cols = [
    { key: 'cidr', label: 'Address', val: (r) => r.cidr, render: (r) => `<span class="mono">${esc(r.cidr)}</span>${r.cidr.includes('/') ? ' <span class="tag">Range</span>' : ''}<p class="max-w-[22rem] text-2xs text-ink3">${esc(r.reason)}</p>` },
    { key: 'scope', label: 'Applies to', val: (r) => r.scope, render: (r) => typeTag(IP_SCOPE_TAG[r.scope]) },
    { key: 'src', label: 'How', hide: 'lg', val: (r) => r.source, render: (r) => `<span class="text-ink2">${r.source === 'auto' ? 'Risk engine' : 'Manual'}</span><p class="text-2xs text-ink3">${esc(r.by)}</p>` },
    { key: 'ts', label: 'Added', hide: 'md', val: (r) => r.ts, render: (r) => `<span class="text-ink2">${ago(r.ts)}</span>` },
    { key: 'exp', label: 'Lasts', hide: 'sm', val: (r) => r.expires || 9e15, render: (r) => IP_LEFT(r) },
    { key: 'hits', label: 'Refused', num: true, hide: 'sm', val: (r) => r.hits, render: (r) => num(r.hits) },
    { key: 'a', label: '', render: (r) => `<button class="btn btn-sm" data-act="ip-remove" data-id="${r.id}">Unblock</button>` },
  ];
  const seg = segEl([['all', 'All'], ['store', 'Customers'], ['api', 'Merchants'], ['admin', 'Admins']], f, 'ac-scope', '', 'Who is blocked');
  const bar = `<div class="flex flex-wrap items-center gap-2 border-b border-line p-3">${seg}<span class="flex-1"></span><span class="text-xs text-ink3">${rows.length} ${rows.length === 1 ? 'rule' : 'rules'}</span></div>`;
  const list = panel({ title: 'Blocked addresses', sub: 'Requests from these addresses get a plain “Access denied”. A block rule always beats the allowed list.', right: `<button class="btn btn-primary btn-sm" data-act="ip-block">${icon('plus', 'ic-sm')}Block an IP</button>`, body: bar + table({ id: 'ac-block', st: ui.acB, cols, rows, rowId: (r) => r.id, pageSize: 0, caption: 'Blocked IP addresses', empty: emptyBlock({ ic: 'ban', title: 'No blocks here', body: f === 'all' ? 'Nothing is blocked. Block an address if you see abuse, or let the risk engine add one.' : 'Nothing is blocked for this group.', cta: `<button class="btn btn-primary" data-act="ip-block">${icon('plus', 'ic-sm')}Block an IP</button>` }) }) });
  return strip + list + `<p class="mt-3 text-xs text-ink3">Email, card, device and IMEI blocks live under Risk and checks. This page is only for network addresses.</p><div class="mt-4">${ipTester()}</div>`;
}
actions['ac-scope'] = (el) => { ui.access.scope = el.dataset.v; ui.acB.page = 1; render(); };
const BLOCK_SCOPE_OPTS = [['store', 'Customers on the storefront'], ['api', 'Merchants using the API'], ['admin', 'Admins on the console'], ['all', 'Everywhere']];
function blockIpDialog({ ip = '', scope = 'store', who = '' } = {}) {
  modal({ title: 'Block an IP', sub: who ? 'Last used by ' + esc(who) + '. Only this address is blocked, the account is not touched.' : 'Requests from it get a plain “Access denied”.',
    body: `<div class="space-y-3">${field('IP address or range', `<input class="input mono" name="ip" type="text" autocomplete="off" spellcheck="false" placeholder="198.51.100.20 or 198.51.100.0/24" value="${esc(ip)}" ${ip ? '' : 'autofocus'}>`, 'Ranges of /16 or narrower. Be careful: shared networks hide many people behind one address.')}
      ${field('Who it applies to', selectEl('scope', scope, BLOCK_SCOPE_OPTS, 'Applies to', '', 'w-full'))}
      ${field('Reason', `<input class="input" name="why" type="text" maxlength="120" autocomplete="off" placeholder="Card testing, login attempts…" ${ip ? 'autofocus' : ''}>`, 'So the next person knows why.')}
      ${field('Block for', selectEl('dur', who ? '168' : '0', IP_DURATIONS, 'Duration', '', 'w-full'), 'A temporary block lifts itself.')}</div>`,
    confirm: 'Block IP', kind: 'danger',
    onSubmit: (f) => {
      const why = f.why.value.trim();
      if (!why) { f.why.setAttribute('aria-invalid', 'true'); return 'Add a short reason so the next person knows why.'; }
      const r = addIpRule({ kind: 'block', ip: f.ip.value, scope: f.scope.value, reason: why, hours: +f.dur.value });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: r.r.cidr + ' blocked', body: IP_SCOPE[r.r.scope] + (r.r.expires ? ', for ' + durText(+f.dur.value) : ', until you unblock it') + '.', ttl: 3400 });
      return true;
    } });
}
actions['ip-block'] = (el) => blockIpDialog({ ip: el?.dataset?.ip || '', scope: el?.dataset?.scope || 'store', who: el?.dataset?.who || '' });

/* ---------- test an address ---------- */
function ipTester() {
  const t = ui.access.test, r = t.res;
  let out = '';
  if (r) {
    if (r.error) out = `<p class="text-sm text-crit-fg" role="alert">${esc(r.error)}</p>`;
    else {
      const why = r.why === 'blocked' ? 'Blocked by the rule for <span class="mono">' + esc(r.rule.cidr) + '</span> (' + esc(IP_SCOPE_TAG[r.rule.scope]) + '): ' + esc(r.rule.reason) + '.'
        : r.why === 'not_listed' ? 'The admin console only opens for allowed addresses and this one is not on the list.'
        : r.why === 'allowed' ? 'On the allowed list as <span class="mono">' + esc(r.rule.cidr) + '</span>' + (r.rule.label ? ' (' + esc(r.rule.label) + ')' : '') + '.'
        : 'No block rule matches. The address can connect.';
      out = `<div class="flex flex-wrap items-start gap-2.5 text-sm" role="status">${r.ok ? badge('b-good', 'checkCircle', 'Allowed') : badge('b-crit', 'ban', 'Refused')}<p class="min-w-0 flex-1 text-ink2"><span class="mono text-ink">${esc(r.ip)}</span> on ${esc(IP_SCOPE_TAG[t.scope].toLowerCase())}. ${why}</p></div>`;
    }
  }
  return `<section class="panel p-3.5" aria-label="Test an address"><h2 class="text-sm font-semibold">Test an address</h2><p class="mt-0.5 text-sm text-ink2">See what would happen to a visitor before you change a rule.</p>
    <form id="ac-test-form" class="mt-3 flex flex-wrap items-end gap-2" novalidate><div class="min-w-[12rem] flex-1 sm:max-w-xs"><label class="label" for="ac-test-ip">IP address</label><input id="ac-test-ip" class="input mono" name="tip" type="text" autocomplete="off" spellcheck="false" placeholder="198.51.100.231" value="${esc(t.ip)}"></div>
      <div><label class="label" for="ac-test-scope">Where</label>${selectEl('tscope', t.scope, [['admin', 'Admin console'], ['store', 'Storefront'], ['api', 'Merchant API']], 'Where', 'id="ac-test-scope"')}</div>
      <button type="submit" class="btn">Check</button></form>${out ? `<div class="mt-3 rounded-md border border-line bg-sunken p-3">${out}</div>` : ''}</section>`;
}
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'ac-test-form') return;
  e.preventDefault();
  const f = e.target;
  ui.access.test = { ip: f.tip.value.trim(), scope: f.tscope.value, res: ipVerdict(f.tip.value, f.tscope.value) };
  render();
  $('#ac-test-ip')?.focus();
});

/* ---------- page ---------- */
function pageAccess() {
  const g = modeGate('Admins and access', 'table');
  if (g) return g;
  const tab = ui.access.tab;
  const tabs = tabsEl([['admins', 'Admin accounts', S.admins.length], ['allow', 'Allowed IPs', D(liveRules('allow')).length], ['block', 'Blocked IPs', D(liveRules('block')).length]], tab, 'access', 'Access sections');
  const body = { admins: tabAdmins, allow: tabIpAllow, block: tabIpBlock }[tab]();
  return `${pageHead({ title: 'Admins and access', sub: 'Who can sign in to this console, and which network addresses can reach it, the storefront and the merchant API.' })}<div class="mb-4">${tabs}</div>${body}`;
}
