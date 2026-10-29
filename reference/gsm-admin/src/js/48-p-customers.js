/* Customers: storefront buyers (guests and accounts). Merchants live on their own page. */
ui.cu = { sort: 'spent', dir: -1, page: 1, sel: new Set() };
function custRows() {
  const st = ui.customers, q = norm(st.q);
  return D(S.customers).filter((c) => {
    if (st.tab === 'active' && c.status !== 'active') return false;
    if (st.tab === 'suspended' && c.status !== 'suspended') return false;
    if (st.tab === 'blocked' && c.status !== 'blocked') return false;
    if (st.tab === 'flagged' && c.risk === 'low') return false;
    if (st.country && c.country !== st.country) return false;
    return !q || norm(c.name + c.email + c.country).includes(q);
  }).map((c) => ({ c, ...custStats(c) }));
}
function pageCustomers() {
  const g = modeGate('Customers', 'table');
  if (g) return g;
  const st = ui.customers, all = D(S.customers);
  const cnt = (f) => all.filter(f).length;
  const tabs = [['all', 'All', all.length], ['active', 'Active', cnt((c) => c.status === 'active')], ['flagged', 'Flagged', cnt((c) => c.risk !== 'low')], ['suspended', 'Suspended', cnt((c) => c.status === 'suspended')], ['blocked', 'Blocked', cnt((c) => c.status === 'blocked')]];
  const rows = custRows();
  const filtersOn = st.q || st.country;
  const cols = [
    { key: 'name', label: 'Customer', val: (r) => r.c.name, render: (r) => `<a class="link font-medium" href="#/customers/${r.c.id}">${esc(r.c.name)}</a><p class="text-2xs text-ink3">${esc(r.c.status === 'anonymized' ? 'Removed' : r.c.email)}</p>` },
    { key: 'country', label: 'Country', hide: 'md', val: (r) => r.c.country, render: (r) => `<span class="mono">${r.c.country}</span> <span class="text-ink3">${r.c.cur}</span>` },
    { key: 'account', label: 'Account', hide: 'lg', val: (r) => (r.c.hasAccount ? 1 : 0), render: (r) => typeTag(r.c.hasAccount ? 'Account' : 'Guest') },
    { key: 'orders', label: 'Orders', num: true, val: (r) => r.orders, render: (r) => r.orders || '<span class="text-ink3">–</span>' },
    { key: 'spent', label: 'Spent', num: true, val: (r) => r.spent, render: (r) => (r.spent ? money(r.spent) : '<span class="text-ink3">–</span>') },
    { key: 'last', label: 'Last order', hide: 'sm', val: (r) => r.last || 0, render: (r) => (r.last ? ago(r.last) : '<span class="text-ink3">Never</span>') },
    { key: 'risk', label: 'Risk', hide: 'md', val: (r) => ({ low: 0, med: 1, high: 2 }[r.c.risk]), render: (r) => (r.c.risk === 'low' ? '<span class="text-ink3">Low</span>' : badge(RISK_LABEL[r.c.risk][0], 'shield', RISK_LABEL[r.c.risk][1])) },
    { key: 'status', label: 'Status', val: (r) => r.c.status, render: (r) => custBadge(r.c) },
  ];
  const empty = all.length === 0
    ? emptyBlock({ ic: 'user', title: 'No customers yet', body: 'People who buy on the storefront appear here, as a guest by email or with an account. Merchants are on the Merchants page.', cta: `<button class="btn btn-primary" data-act="cu-new">${icon('plus', 'ic-sm')}Add a customer</button>` })
    : emptyBlock({ ic: 'filter', title: 'No customers match', body: 'Try another search or tab.', cta: `<button class="btn" data-act="cu-clear">Clear filters</button>` });
  const toolbar = tblToolbar(`${searchEl('cu-q', st.q, 'Search name, email')}${selectEl('cu-country', st.country, [['', 'All countries'], ...COUNTRY_OPTS], 'Filter by country', 'data-bind="cu-country"')}${filtersOn ? '<button class="btn btn-ghost btn-sm" data-act="cu-clear">Clear filters</button>' : ''}`, `${num(rows.length)} ${rows.length === 1 ? 'customer' : 'customers'}`);
  const head = pageHead({ title: 'Customers', sub: `${num(all.length)} people have bought on the storefront. ${all.filter((c) => c.hasAccount).length} have an account, the rest checked out as guests.`, actions: `<button class="btn" data-act="cu-export" ${rows.length ? '' : 'disabled'}>${icon('download', 'ic-sm')}Export CSV</button><button class="btn btn-primary" data-act="cu-new">${icon('plus', 'ic-sm')}Add customer</button>` });
  return `${head}<div class="panel">${sectionTabs(tabs, st.tab, 'customers', 'Customer filter')}${toolbar}<div class="border-t border-line">${table({ id: 'customers', st: ui.cu, cols, rows, rowId: (r) => r.c.id, empty, caption: 'Customers' })}</div></div>`;
}
binds['cu-q'] = (el) => { ui.customers.q = el.value; ui.cu.page = 1; render(); };
binds['cu-country'] = (el) => { ui.customers.country = el.value; ui.cu.page = 1; render(); };
actions['cu-clear'] = () => { Object.assign(ui.customers, { q: '', country: '' }); ui.cu.page = 1; render(); };
actions['cu-export'] = () => {
  const rows = custRows();
  downloadText('customers.csv', ['id,name,country,account,orders,spent_usd,risk,status'].concat(rows.map((r) => [r.c.id, r.c.name, r.c.country, r.c.hasAccount ? 'account' : 'guest', r.orders, r.spent.toFixed(2), r.c.risk, r.c.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n'), 'text/csv');
  toast({ kind: 'success', title: 'Exported ' + rows.length + ' customers', ttl: 2800 });
};

/* ---------- one customer ---------- */
function pageCustomer(id) {
  const c = cus(id);
  if (!c) return pageHead({ title: 'Customer not found' }) + panel({ body: emptyBlock({ ic: 'user', title: 'No customer with that ID', body: 'It may have been removed.', cta: '<a class="btn" href="#/customers">Back to customers</a>' }), flush: true });
  const g = modeGate(c.name, 'table');
  if (g) return g;
  const st = custStats(c), orders = custOrders(c.id).slice().reverse();
  const avg = st.orders ? st.spent / st.orders : 0;
  const gone = c.status === 'anonymized';
  const act = gone ? '' : `<button class="btn" data-act="cu-mail" data-id="${c.id}">${icon('mail', 'ic-sm')}Email</button><button class="btn" data-act="cu-edit" data-id="${c.id}">${icon('edit', 'ic-sm')}Edit details</button>${c.status === 'suspended' ? `<button class="btn" data-act="cu-reactivate" data-id="${c.id}">${icon('checkCircle', 'ic-sm')}Reactivate</button>` : c.status === 'active' ? `<button class="btn" data-act="cu-suspend" data-id="${c.id}">${icon('pause', 'ic-sm')}Suspend…</button>` : ''}${c.status === 'blocked' ? `<button class="btn" data-act="cu-unblock" data-id="${c.id}">${icon('checkCircle', 'ic-sm')}Unblock</button>` : `<button class="btn btn-danger" data-act="cu-block" data-id="${c.id}">${icon('ban', 'ic-sm')}Block…</button>`}`;
  const head = pageHead({ title: `<span class="inline-flex flex-wrap items-center gap-2">${esc(c.name)} ${custBadge(c)}${c.risk !== 'low' ? badge(RISK_LABEL[c.risk][0], 'shield', RISK_LABEL[c.risk][1] + ' risk') : ''}</span>`, sub: `${c.status === 'anonymized' ? 'Personal data removed' : esc(c.email)} · ${B2C_COUNTRIES[c.country].name} · customer since ${fmtDate(c.created).split(',')[0]}`, actions: act });
  const strip = statGrid([
    { label: 'Orders', value: num(st.orders), sub: st.last ? 'Last ' + ago(st.last) : 'No orders yet' },
    { label: 'Lifetime spend', value: money(st.spent), sub: st.orders ? 'Average ' + money(avg) : '' },
    { label: 'Refunds', value: st.refunds, sub: st.orders ? pct((st.refunds / st.orders) * 100, 0) + ' of orders' : '' },
    { label: 'Support tickets', value: st.tickets },
    { label: 'Disputes', value: st.disputes, cls: st.disputes ? 'text-crit-fg' : '' },
  ], 'Customer figures');
  const dt = ui.customers.detailTab;
  const tabs = [['orders', 'Orders', st.orders], ['account', 'Account'], ['support', 'Support', st.tickets], ['consents', 'Consents and data'], ['risk', 'Risk']];
  const hold = c.status === 'suspended' ? `<div class="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-line bg-warn-bg px-3.5 py-3 text-sm text-warn-fg" role="status">${icon('pause', 'ic-sm mt-0.5 flex-none')}<div class="min-w-0 flex-1"><p class="font-medium">Account suspended ${ago(c.suspendedAt)}</p><p>${esc(c.suspendedReason)}. They can’t sign in or place new orders. Orders already in progress will finish.</p></div><button class="btn btn-sm" data-act="cu-reactivate" data-id="${c.id}">Reactivate</button></div>` : '';
  let body = '';
  if (dt === 'orders') {
    const cols = [
      { key: 'id', label: 'Order', val: (o) => o.created, render: (o) => `${orderLink(o.id)}<p class="text-2xs text-ink3">${ago(o.created)}</p>` },
      { key: 'service', label: 'Service', render: (o) => `<span class="block max-w-[260px] truncate">${esc(svc(o.sid).name)}</span><span class="mono block text-2xs text-ink3">${esc(fmtImei(o.input))}</span>` },
      { key: 'status', label: 'Status', render: (o) => orderBadge(o.status) },
      { key: 'pay', label: 'Payment', hide: 'md', render: (o) => chargeBadge(o.pay.status) },
      { key: 'paid', label: 'Paid', num: true, render: (o) => `${lm(o.gross, o.cur)}${o.cur !== 'USD' ? `<p class="text-2xs text-ink3">${money(o.gross)}</p>` : ''}` },
    ];
    body = table({ id: 'cu-orders', st: ui.cu, cols, rows: orders, rowId: (o) => o.id, rowAct: 'order-open', sortable: false, pageSize: 10, empty: emptyBlock({ ic: 'orders', title: 'No orders', body: 'This customer has not bought anything yet.' }), caption: 'Orders by this customer' });
  } else if (dt === 'account') {
    body = accountTab(c);
  } else if (dt === 'support') {
    const ts = S.tickets.filter((t) => t.who.type === 'customer' && t.who.id === c.id);
    body = ts.length ? `<ul class="m-0 list-none divide-y divide-line p-0">${ts.map((t) => `<li><button type="button" class="flex w-full items-center gap-3 px-3.5 py-2.5 text-start hover:bg-hover" data-act="tk-go" data-id="${t.id}"><span class="mono w-14 flex-none text-xs text-ink3">${t.id}</span><span class="min-w-0 flex-1 truncate text-sm">${esc(t.subject)}</span>${ticketBadge(t.status)}<span class="hidden w-16 flex-none text-end text-xs text-ink3 sm:block">${ago(t.updated)}</span></button></li>`).join('')}</ul>` : emptyBlock({ ic: 'life', title: 'No tickets', body: 'This customer has never contacted support.' });
  } else if (dt === 'consents') {
    const last = orders[0];
    const reqs = S.dsr.filter((d) => d.cid === c.id);
    body = `<div class="grid gap-4 p-3.5 lg:grid-cols-2">
      <div><h3 class="mb-2 text-xs font-medium text-ink3">Consent record for the latest order${last ? ' (' + last.id + ')' : ''}</h3>${last ? `<ul class="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">${consentsFor(last).map((x) => `<li class="flex items-start gap-2.5 px-3 py-2 text-sm">${icon('checkCircle', 'ic-sm mt-0.5 text-good-fg')}<div class="min-w-0 flex-1"><p>${esc(x.what)}</p><p class="mono text-2xs text-ink3">${fmtDate(x.ts)} · IP ${x.ip}</p></div></li>`).join('')}</ul><p class="mt-2 text-xs text-ink3">This is the evidence pack attached to a card dispute. It is stored with the order.</p>` : '<p class="text-sm text-ink3">No orders, so no consent was recorded.</p>'}</div>
      <div><h3 class="mb-2 text-xs font-medium text-ink3">Data and privacy</h3>
        ${kv([['Marketing emails', c.optIn ? 'Opted in' : 'Not opted in'], ['IMEI storage', 'Kept for ' + S.settings.policies.imeiRetentionDays + ' days after the order, then removed'], ['Requests', reqs.length ? reqs.map((d) => `<span class="block">${d.id} · ${d.kind === 'export' ? 'Data export' : 'Erasure'} · ${d.status === 'done' ? 'Done ' + ago(d.done) : '<span class="font-medium text-warn-fg">Open, due ' + dueText(d.due) + '</span>'}</span>`).join('') : '<span class="text-ink3">None</span>']])}
        ${c.status === 'anonymized' ? '<p class="mt-3 rounded-md bg-sunken p-2.5 text-sm text-ink2">Name, email and IMEIs have been removed. Order and payment records stay for accounting.</p>' : `<div class="mt-3 flex flex-wrap gap-2"><button class="btn" data-act="cu-export-data" data-id="${c.id}">${icon('download', 'ic-sm')}Export their data</button><button class="btn btn-danger" data-act="cu-anon" data-id="${c.id}">${icon('ban', 'ic-sm')}Anonymise…</button></div>`}
      </div></div>`;
  } else {
    const sigs = orders.flatMap((o) => o.risk.signals.map((s) => [s, o.id]));
    body = `<div class="grid gap-4 p-3.5 lg:grid-cols-2">
      <div>${kv([['Risk level', c.risk === 'low' ? 'Low' : badge(RISK_LABEL[c.risk][0], 'shield', RISK_LABEL[c.risk][1])], ['Status', custBadge(c)], ['Notes', c.notes ? esc(c.notes) : '<span class="text-ink3">None</span>'], ['Highest score', orders.length ? scoreMeter(Math.max(...orders.map((o) => o.risk.score))) : '–']])}</div>
      <div><h3 class="mb-2 text-xs font-medium text-ink3">Signals seen on their orders</h3>${sigs.length ? `<ul class="m-0 list-none space-y-1.5 p-0 text-sm">${sigs.slice(0, 8).map(([s, oid]) => `<li class="flex items-start gap-2">${icon('alert', 'ic-sm mt-0.5 text-warn-fg')}<span class="flex-1">${esc(s)}</span>${orderLink(oid)}</li>`).join('')}</ul>` : '<p class="text-sm text-ink3">No risk signals on any order.</p>'}</div></div>`;
  }
  return `${head}${hold}${strip}<div class="panel">${sectionTabs(tabs, dt, 'customers.detailTab', 'Customer details')}<div class="border-t border-line ${dt === 'orders' || dt === 'support' ? '' : ''}">${body}</div></div>`;
}
function accountTab(c) {
  if (c.status === 'anonymized') return '<p class="p-3.5 text-sm text-ink2">This customer was anonymised. There is no account left to manage.</p>';
  const created = c.createdBy === 'admin' ? 'Added by your team' : c.createdBy === 'self' ? 'Signed up on the storefront' : 'Bought as a guest';
  const linkOpen = c.resetSentAt && c.resetSentAt > (c.pwChangedAt || 0);
  const pw = !c.hasAccount ? '<span class="text-ink3">No password, this is a guest</span>'
    : linkOpen ? (c.pwChangedAt ? 'Reset link sent ' : 'Invite link sent ') + ago(c.resetSentAt) + (c.mustChangePw ? '<span class="block text-xs font-medium text-warn-fg">Their temporary password still works until they use the link</span>' : '')
    : c.mustChangePw ? '<span class="font-medium text-warn-fg">Temporary, they must change it at next sign-in</span>'
    : 'Changed ' + ago(c.pwChangedAt);
  const left = c.hasAccount ? kv([
    ['Sign-in', typeTag('Account') + ' ' + created],
    ['Email', esc(c.email) + ' ' + (c.emailVerified ? badge('b-good', 'checkCircle', 'Verified') : badge('b-neutral', 'clock', 'Not verified'))],
    ['Phone', c.phone ? esc(c.phone) : '<span class="text-ink3">None</span>'],
    ['Password', pw],
    ['Last sign-in', c.lastLogin ? ago(c.lastLogin) : '<span class="text-ink3">Never</span>'],
    ['Signed in on', c.sessions ? c.sessions + (c.sessions === 1 ? ' device' : ' devices') : '<span class="text-ink3">No active sessions</span>'],
    ['Last seen from', custIpCell(c)],
  ]) : kv([
    ['Sign-in', typeTag('Guest') + ' ' + created],
    ['Email', esc(c.email)],
    ['Phone', c.phone ? esc(c.phone) : '<span class="text-ink3">None</span>'],
    ['Last seen from', custIpCell(c)],
  ]) + '<p class="mt-3 rounded-md bg-sunken p-2.5 text-sm text-ink2">A guest has no password and no sign-in. They follow their orders from the link in their email. Create an account if they want to sign in and see all their orders in one place.</p>';
  const btns = c.hasAccount
    ? `<button class="btn" data-act="cu-edit" data-id="${c.id}">${icon('edit', 'ic-sm')}Edit details</button><button class="btn" data-act="cu-pw" data-id="${c.id}">${icon('lock', 'ic-sm')}Password…</button><button class="btn" data-act="cu-signout" data-id="${c.id}" ${c.sessions ? '' : 'disabled'}>${icon('upload', 'ic-sm')}Sign out everywhere</button>`
    : `<button class="btn" data-act="cu-edit" data-id="${c.id}">${icon('edit', 'ic-sm')}Edit details</button><button class="btn btn-primary" data-act="cu-mkacct" data-id="${c.id}">${icon('plus', 'ic-sm')}Create account…</button>`;
  const stat = c.status === 'suspended'
    ? `<button class="btn" data-act="cu-reactivate" data-id="${c.id}">${icon('checkCircle', 'ic-sm')}Reactivate</button>`
    : c.status === 'active' ? `<button class="btn" data-act="cu-suspend" data-id="${c.id}">${icon('pause', 'ic-sm')}Suspend…</button>` : '';
  return `<div class="grid gap-4 p-3.5 lg:grid-cols-2"><div><h3 class="mb-2 text-xs font-medium text-ink3">Sign-in and contact</h3>${left}</div>
    <div><h3 class="mb-2 text-xs font-medium text-ink3">Manage the account</h3><div class="flex flex-wrap gap-2">${btns}${stat}</div>
      <dl class="mt-4 space-y-2 text-sm text-ink2"><div><dt class="inline font-medium text-ink">Suspend</dt> <dd class="inline">pauses the account. They can’t sign in or order, nothing is added to the blocklist, and you can reverse it in one click. Use it for a lost phone or a quick check.</dd></div>
      <div><dt class="inline font-medium text-ink">Block</dt> <dd class="inline">is for fraud. It adds their email to the blocklist and marks them high risk.</dd></div></dl>
      <p class="mt-3 text-xs text-ink3">Passwords are stored as hashes. Nobody on your team can read a customer’s password, only replace it.</p></div></div>`;
}
function pwChooser({ who, signOut }) {
  const opt = (v, on, t, d) => `<label class="flex cursor-pointer items-start gap-2.5 rounded-md border border-line2 px-3 py-2.5 text-sm"><input type="radio" name="pwmode" value="${v}" class="mt-0.5 accent-[rgb(var(--accent))]" ${on ? 'checked' : ''}><span><span class="font-medium">${t}</span><span class="mt-0.5 block text-xs text-ink3">${d}</span></span></label>`;
  return `<fieldset class="space-y-2"><legend class="label">Password</legend>${opt('link', true, 'Email a link to choose it', who + ' picks the password and you never see it. The link works for 1 hour. This is the safer choice.')}${opt('set', false, 'Set a temporary password now', 'They must change it the first time they sign in. Send it to them over a private channel.')}</fieldset>
    <div id="pw-set" class="hidden"><label class="label" for="pw-input">Temporary password</label><div class="flex gap-2"><input id="pw-input" class="input mono min-w-0 flex-1" name="password" type="text" autocomplete="off" spellcheck="false" placeholder="At least ${PW_MIN} characters"><button type="button" class="btn" id="pw-gen">Generate</button></div></div>
    ${signOut ? `<label class="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" class="check" name="signout" checked>Sign them out of every device</label>` : ''}`;
}
function wirePwChooser() {
  const d = $('#dlg');
  const sync = () => { const set = d.querySelector('input[name=pwmode]:checked').value === 'set'; d.querySelector('#pw-set').classList.toggle('hidden', !set); if (set) d.querySelector('#pw-input').focus(); };
  d.querySelectorAll('input[name=pwmode]').forEach((r) => r.addEventListener('change', sync));
  d.querySelector('#pw-gen').addEventListener('click', () => { const i = d.querySelector('#pw-input'); i.value = genPassword(); i.removeAttribute('aria-invalid'); });
}
const pwSubmit = (f) => ({ mode: f.pwmode.value, password: f.password.value.trim() });
const failField = (f, r) => { if (r.field && f[r.field]) f[r.field].setAttribute('aria-invalid', 'true'); return r.error; };
const LOCALES = [['en', 'English'], ['ar', 'Arabic']];
actions['cu-new'] = () => {
  modal({ title: 'Add a customer', sub: 'Creates a storefront account. Use it when someone asks you to sign them up, or orders by phone.',
    body: `<div class="space-y-3"><div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2">${field('Full name', '<input class="input" name="nm" type="text" autocomplete="off" autofocus>')}</div>
      <div class="sm:col-span-2">${field('Email', '<input class="input" name="email" type="text" inputmode="email" autocomplete="off" spellcheck="false" placeholder="name@example.com">', 'The result and receipts are sent here. It must not belong to another customer.')}</div>
      <div>${field('Country', selectEl('country', 'GB', COUNTRY_OPTS, 'Country', '', 'w-full'), 'Sets the currency and VAT on their orders.')}</div>
      <div>${field('Language', selectEl('locale', 'en', LOCALES, 'Language', '', 'w-full'))}</div>
      <div class="sm:col-span-2">${field('Phone (optional)', '<input class="input" name="phone" type="text" inputmode="tel" autocomplete="off">')}</div></div>
      ${pwChooser({ who: 'They', signOut: false })}
      <p class="text-xs text-ink3">Marketing emails stay off. Only the customer can agree to them.</p></div>`,
    confirm: 'Create customer',
    onSubmit: (f) => {
      const r = createCustomer({ name: f.nm.value, email: f.email.value, country: f.country.value, locale: f.locale.value, phone: f.phone.value, ...pwSubmit(f) });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: r.c.name + ' added', body: f.pwmode.value === 'link' ? 'An invitation to choose a password was sent to ' + r.c.email + '.' : 'Temporary password set. They must change it at first sign-in.', ttl: 3600 });
      ui.customers.detailTab = 'account'; go('customers', { id: r.c.id });
      return true;
    } });
  wirePwChooser();
};
actions['cu-edit'] = (el) => {
  const c = cus(el.dataset.id);
  modal({ title: 'Edit ' + esc(c.name), sub: 'Changes are written to the audit log.',
    body: `<div class="space-y-3"><div class="grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2">${field('Full name', `<input class="input" name="nm" type="text" autocomplete="off" value="${esc(c.name)}">`)}</div>
      <div class="sm:col-span-2">${field('Email', `<input class="input" name="email" type="text" inputmode="email" autocomplete="off" spellcheck="false" value="${esc(c.email)}">`, c.hasAccount ? 'If you change it, they must confirm the new address before it counts as verified.' : 'Receipts and the order link are sent here.')}</div>
      <div>${field('Country', selectEl('country', c.country, COUNTRY_OPTS, 'Country', '', 'w-full'), 'Applies to new orders. Past orders keep their price and VAT.')}</div>
      <div>${field('Language', selectEl('locale', c.locale, LOCALES, 'Language', '', 'w-full'))}</div>
      <div class="sm:col-span-2">${field('Phone', `<input class="input" name="phone" type="text" inputmode="tel" autocomplete="off" value="${esc(c.phone || '')}">`)}</div>
      <div class="sm:col-span-2">${field('Internal notes', `<textarea class="input" name="notes" rows="3" maxlength="300" placeholder="Only your team sees this">${esc(c.notes || '')}</textarea>`)}</div></div></div>`,
    confirm: 'Save changes',
    onSubmit: (f) => {
      const r = updateCustomer(c.id, { name: f.nm.value, email: f.email.value, country: f.country.value, locale: f.locale.value, phone: f.phone.value, notes: f.notes.value });
      if (r.error) return failField(f, r);
      toast(r.none ? { kind: 'info', title: 'Nothing changed' } : { kind: 'success', title: 'Details saved', body: r.diff.length + (r.diff.length === 1 ? ' field' : ' fields') + ' updated.', ttl: 2800 });
      return true;
    } });
};
actions['cu-pw'] = (el) => {
  const c = cus(el.dataset.id);
  modal({ title: 'Password for ' + esc(c.name), sub: 'You can replace it but never read it.',
    body: `<div class="space-y-3">${pwChooser({ who: 'They', signOut: true })}</div>`, confirm: 'Continue',
    onSubmit: (f) => {
      const r = setCustomerPassword(c.id, { ...pwSubmit(f), signOut: f.signout.checked });
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: f.pwmode.value === 'link' ? 'Reset link sent' : 'Temporary password set', body: f.pwmode.value === 'link' ? 'Sent to ' + c.email + '. It works for 1 hour.' : c.name + ' must change it at next sign-in.', ttl: 3400 });
      return true;
    } });
  wirePwChooser();
};
actions['cu-mkacct'] = (el) => {
  const c = cus(el.dataset.id);
  modal({ title: 'Create an account for ' + esc(c.name), sub: 'They bought as a guest. Their past orders will show in the new account.',
    body: `<div class="space-y-3">${pwChooser({ who: 'They', signOut: false })}</div>`, confirm: 'Create account',
    onSubmit: (f) => {
      const r = createAccountForGuest(c.id, pwSubmit(f));
      if (r.error) return failField(f, r);
      toast({ kind: 'success', title: 'Account created', body: f.pwmode.value === 'link' ? 'An invitation was sent to ' + c.email + '.' : 'Temporary password set. They must change it at first sign-in.', ttl: 3400 });
      return true;
    } });
  wirePwChooser();
};
actions['cu-signout'] = (el) => {
  const c = cus(el.dataset.id);
  confirmDlg({ title: 'Sign ' + esc(c.name) + ' out everywhere?', confirm: 'Sign out', body: `They are signed out of ${c.sessions} ${c.sessions === 1 ? 'device' : 'devices'}. They can sign in again with their password.`, run: () => { signOutCustomer(c.id); toast({ kind: 'success', title: 'Signed out of all devices' }); } });
};
actions['cu-suspend'] = (el) => {
  const c = cus(el.dataset.id);
  modal({ title: 'Suspend ' + esc(c.name) + '?', sub: 'They can’t sign in or place new orders. Orders already in progress finish normally.', confirm: 'Suspend account', kind: 'danger',
    body: `<div class="space-y-3">${field('Reason', selectEl('why', '', [['', 'Choose a reason'], ...SUSPEND_REASONS.map((r) => [r, r])], 'Reason', '', 'w-full'), 'Shown to your team only.')}${field('Note (optional)', '<textarea class="input" name="note" rows="2" maxlength="200" placeholder="What did they tell you?"></textarea>')}<p class="text-xs text-ink3">Nothing is added to the blocklist. You can reactivate the account at any time.</p></div>`,
    onSubmit: (f) => { if (!f.why.value) { f.why.setAttribute('aria-invalid', 'true'); return 'Choose a reason for the audit log.'; } suspendCustomer(c.id, f.why.value, f.note.value.trim()); toast({ kind: 'info', title: c.name + ' suspended', body: 'Signed out of all devices.' }); return true; } });
};
actions['cu-reactivate'] = (el) => {
  const c = cus(el.dataset.id);
  confirmDlg({ title: 'Reactivate ' + esc(c.name) + '?', confirm: 'Reactivate', body: 'They can sign in and order again. They will need to sign in again on their devices.', run: () => { reactivateCustomer(c.id); toast({ kind: 'success', title: c.name + ' reactivated' }); } });
};
actions['cu-block'] = (el) => {
  const c = cus(el.dataset.id);
  modal({ title: 'Block ' + c.name + '?', sub: 'They can’t place new orders. Existing orders finish normally.', confirm: 'Block customer', kind: 'danger', body: `<div class="space-y-3">${field('Reason', selectEl('why', '', [['', 'Choose a reason'], ['Chargeback or dispute', 'Chargeback or dispute'], ['Card testing or fraud', 'Card testing or fraud'], ['Abuse of refunds', 'Abuse of refunds'], ['Other', 'Other']], 'Reason', '', 'w-full'))}<p class="text-xs text-ink3">Their email is added to the blocklist. You can unblock them later.</p></div>`, onSubmit: (f) => { if (!f.why.value) { f.why.setAttribute('aria-invalid', 'true'); return 'Choose a reason for the audit log.'; } blockCustomer(c.id, true, f.why.value); toast({ kind: 'info', title: c.name + ' blocked', body: 'Added to the blocklist.' }); return true; } });
};
actions['cu-unblock'] = (el) => { const c = cus(el.dataset.id); confirmDlg({ title: 'Unblock ' + c.name + '?', confirm: 'Unblock', body: 'They can order again. Their email stays on the blocklist until you remove it there.', run: () => { blockCustomer(c.id, false); toast({ kind: 'success', title: c.name + ' unblocked' }); } }); };
actions['cu-mail'] = (el) => { const c = cus(el.dataset.id); toast({ kind: 'info', title: 'Email opened for ' + c.name, body: 'In the real product this opens a composer with your reply templates.', ttl: 3200 }); };
actions['cu-anon'] = (el) => {
  const c = cus(el.dataset.id);
  confirmDlg({ title: 'Anonymise ' + c.name + '?', confirm: 'Anonymise', kind: 'danger', body: '<p>Their name and email are replaced and IMEIs on past orders are cut to the model code (TAC). Order amounts and payment records stay for accounting and tax.</p><p class="mt-2 font-medium text-ink">This can’t be undone.</p>', run: () => { anonymizeCustomer(c.id); toast({ kind: 'success', title: 'Customer anonymised', body: 'The erasure request is marked done.' }); } });
};
actions['cu-export-data'] = (el) => {
  const c = cus(el.dataset.id);
  const data = { customer: { id: c.id, name: c.name, email: c.email, country: c.country }, orders: custOrders(c.id).map((o) => ({ id: o.id, service: svc(o.sid).name, imei: o.input, status: o.status, total_usd: o.gross, created: new Date(o.created).toISOString() })), tickets: S.tickets.filter((t) => t.who.id === c.id).map((t) => ({ id: t.id, subject: t.subject, messages: t.msgs.filter((m) => m.by !== 'note').length })) };
  downloadText('customer-' + c.id + '.json', JSON.stringify(data, null, 2), 'application/json');
  exportCustomerData(c.id);
  toast({ kind: 'success', title: 'Data exported', body: 'customer-' + c.id + '.json. The request is marked done.' });
};
actions['tk-go'] = (el) => { ui.support.sel = el.dataset.id; ui.support.filter = 'all'; ui.support.who = 'all'; ui.support.q = ''; ui.support.open = true; go('support'); };
