/* Merchants: list and detail */
ui.mo = { sort: 'id', dir: -1, page: 1, sel: new Set() };
ui.mw = { sort: 'ts', dir: -1, page: 1, sel: new Set() };
const mStats = new Map();
function merRows() {
  const st = ui.merchants;
  const q = norm(st.q);
  return D(S.merchants).filter((m) => (st.tab === 'all' || m.status === st.tab) && (!st.group || m.group === st.group) && (!q || norm(m.name + m.city + m.cc + m.email).includes(q))).map((m) => ({ m, ...merStats(m.id, 30) }));
}
function pageMerchants() {
  const g = modeGate('Merchants', 'table');
  if (g) return g;
  const st = ui.merchants;
  const all = D(S.merchants);
  const cnt = (s) => all.filter((m) => m.status === s).length;
  const tabs = [['all', 'All', all.length], ['active', 'Active', cnt('active')], ['pending', 'Pending approval', cnt('pending')], ['suspended', 'Suspended', cnt('suspended')]];
  const rows = merRows();
  const filtersOn = st.q || st.group;
  const cols = [
    { key: 'name', label: 'Merchant', val: (r) => r.m.name, render: (r) => `<a class="link font-medium" href="#/merchants/${r.m.id}">${esc(r.m.name)}</a><p class="text-2xs text-ink3">${r.m.city}, <span class="mono">${r.m.cc}</span>${r.m.isAgent ? ' · Agent' : ''}</p>` },
    { key: 'group', label: 'Group', hide: 'md', val: (r) => r.m.group, render: (r) => typeTag(GROUPS.find((x) => x.id === r.m.group).name) },
    { key: 'status', label: 'Status', val: (r) => r.m.status, render: (r) => merBadge(r.m.status) },
    { key: 'wallet', label: 'Wallet', num: true, val: (r) => walletOf(r.m.id), render: (r) => { const w = walletOf(r.m.id); const hold = holdOf(r.m.id); return `<span class="${w < 0 ? 'font-medium text-crit-fg' : ''}">${w < 0 ? icon('alert', 'ic-xs mr-1 inline') : ''}${money(w)}</span>${hold > 0.005 ? `<p class="text-2xs text-ink3">${money0(hold)} held</p>` : ''}`; } },
    { key: 'spend', label: 'Spend 30D', num: true, hide: 'sm', val: (r) => r.spend, render: (r) => (r.orders ? money0(r.spend) : '<span class="text-ink3">–</span>') },
    { key: 'orders', label: 'Orders', num: true, hide: 'lg', val: (r) => r.orders, render: (r) => r.orders || '<span class="text-ink3">–</span>' },
    { key: 'success', label: 'Success', num: true, hide: 'xl', val: (r) => r.success ?? -1, render: (r) => (r.success == null ? '<span class="text-ink3">–</span>' : pct(r.success, 0)) },
    { key: 'seen', label: 'Last order', hide: 'lg', val: (r) => r.m.lastSeen || 0, render: (r) => (r.m.lastSeen ? ago(r.m.lastSeen) : '<span class="text-ink3">Never</span>') },
    { key: 'act', label: '', cls: 'w-24', render: (r) => (r.m.status === 'pending' ? `<button class="btn btn-sm" data-act="m-approve" data-id="${r.m.id}">Approve</button>` : '') },
  ];
  const empty = all.length === 0
    ? emptyBlock({ ic: 'users', title: 'No merchants yet', body: 'Invite a reseller or repair shop. They get a wallet, an API key and a price group, and can start ordering after you approve the account.', cta: `<button class="btn btn-primary" data-act="m-invite">${icon('plus', 'ic-sm')}Invite merchant</button>` })
    : emptyBlock({ ic: 'filter', title: 'No merchants match', body: 'Try another search or tab.', cta: `<button class="btn" data-act="m-clear">Clear filters</button>` });
  const toolbar = `<div class="flex flex-wrap items-center gap-2 p-3">${searchEl('m-q', st.q, 'Search name, city, email')}${selectEl('m-group', st.group || '', [['', 'All groups'], ...GROUPS.map((g) => [g.id, g.name])], 'Filter by group', 'data-bind="m-group"')}${filtersOn ? `<button class="btn btn-ghost btn-sm" data-act="m-clear">Clear filters</button>` : ''}<span class="flex-1"></span><span class="text-xs text-ink3" aria-live="polite">${rows.length} ${rows.length === 1 ? 'merchant' : 'merchants'}</span></div>`;
  const head = pageHead({ title: 'Merchants', sub: `${cnt('active')} active, ${money0(sum(all.filter((m) => walletOf(m.id) > 0), (m) => walletOf(m.id)))} held in wallets`, actions: `<button class="btn btn-primary" data-act="m-invite">${icon('plus', 'ic-sm')}Invite merchant</button>` });
  return `${head}<div class="panel">${tabsEl(tabs, st.tab, 'merchants', 'Merchant status').replace('class="tabs"', 'class="tabs px-2"')}${toolbar}<div class="border-t border-line">${table({ id: 'merchants', st, cols, rows, rowId: (r) => r.m.id, empty, caption: 'Merchants' })}</div></div>`;
}
binds['m-q'] = (el) => { ui.merchants.q = el.value; ui.merchants.page = 1; render(); };
binds['m-group'] = (el) => { ui.merchants.group = el.value; ui.merchants.page = 1; render(); };
actions['m-clear'] = () => { Object.assign(ui.merchants, { q: '', group: '', page: 1 }); render(); };
actions['m-approve'] = (el) => { const m = mer(el.dataset.id); setMerchantStatus(m.id, 'active'); toast({ kind: 'success', title: m.name + ' approved', body: 'They can place orders once they fund their wallet.' }); };
actions['m-invite'] = () => modal({
  title: 'Invite merchant', sub: 'They receive a sign-up link. The account stays pending until you approve it.', confirm: 'Send invitation',
  body: `<div class="space-y-3">${field('Business name', '<input class="input" name="name" autofocus placeholder="Example Mobile Repair">')}${field('Contact email', '<input class="input" type="email" name="email" placeholder="owner@example.com">')}${field('Price group', selectEl('group', 'std', GROUPS.map((g) => [g.id, g.name + (g.discount ? ' (-' + g.discount * 100 + '%)' : '')]), 'Price group'))}</div>`,
  onSubmit: (f) => {
    if (!f.name.value.trim()) { f.name.setAttribute('aria-invalid', 'true'); return 'Enter the business name.'; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value)) { f.email.setAttribute('aria-invalid', 'true'); return 'Enter a valid email address, like owner@example.com.'; }
    logAudit(ME, 'invited merchant', 'merchant', 'new', f.name.value.trim(), [{ field: 'email', from: '', to: f.email.value }]);
    toast({ kind: 'success', title: 'Invitation sent', body: f.email.value + ' (demo: nothing was actually sent).' });
    return true;
  },
});

/* ---------- detail ---------- */
function pageMerchant(id) {
  const g = modeGate('Merchant', 'table');
  if (g) return g;
  const m = mer(id);
  if (!m) return pageHead({ title: 'Merchant not found' }) + panel({ body: emptyBlock({ ic: 'users', title: 'No merchant with that ID', body: 'It may have been removed.', cta: `<a class="btn" href="#/merchants">Back to merchants</a>` }), flush: true });
  const st = ui.merchants;
  const s30 = merStats(m.id, 30);
  const w = walletOf(m.id), hold = holdOf(m.id);
  const avail = w + m.credit;
  const grp = GROUPS.find((x) => x.id === m.group);
  const ref = m.referredBy ? mer(m.referredBy) : null;
  const actionsHtml = `<button class="btn" data-act="m-adjust" data-id="${m.id}">${icon('wallet', 'ic-sm')}Adjust wallet…</button><button class="btn" data-act="m-group-menu" data-id="${m.id}" aria-haspopup="menu">${icon('tag', 'ic-sm')}Group: ${grp.name}${icon('chevD', 'ic-xs')}</button>${m.status === 'pending' ? `<button class="btn btn-primary" data-act="m-approve" data-id="${m.id}">Approve account</button>` : m.status === 'active' ? `<button class="btn btn-danger" data-act="m-suspend" data-id="${m.id}">${icon('ban', 'ic-sm')}Suspend…</button>` : `<button class="btn" data-act="m-reactivate" data-id="${m.id}">Reactivate</button>`}`;
  const cell = (l, v, sub = '', cls = '') => `<div class="min-w-0 p-3.5"><p class="text-xs text-ink3">${l}</p><p class="mt-1 text-xl font-semibold tabular-nums ${cls}">${v}</p><p class="mt-0.5 truncate text-xs text-ink3">${sub}</p></div>`;
  const strip = `<section class="panel mb-4 grid grid-cols-2 divide-line md:grid-cols-5 [&>*]:border-line [&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s md:[&>*:nth-child(n+2)]:border-s" aria-label="Summary">${cell('Wallet', money(w), hold > 0.005 ? money(hold) + ' held in open orders' : 'No open holds', w < 0 ? 'text-crit-fg' : '')}${cell('Spendable', money(avail), 'Wallet plus ' + money0(m.credit) + ' credit limit')}${cell('Spend, 30 days', money0(s30.spend), s30.orders + ' orders')}${cell('Profit, 30 days', money0(s30.profit), s30.spend ? pct((s30.profit / s30.spend) * 100, 1) + ' margin' : 'No sales yet')}${cell('Success rate', s30.success == null ? '–' : pct(s30.success, 0), 'Completed ÷ (completed + rejected)')}</section>`;
  const tabs = [['orders', 'Orders'], ['wallet', 'Wallet ledger'], ['pricing', 'Pricing'], ['api', 'API access']];
  let body = '';
  if (st.detailTab === 'orders') body = merOrdersTab(m);
  else if (st.detailTab === 'wallet') body = merWalletTab(m);
  else if (st.detailTab === 'pricing') body = merPricingTab(m);
  else body = merApiTab(m);
  const pendingNote = m.status === 'pending' ? `<div class="mb-4 flex items-start gap-2.5 rounded-lg bg-warn-bg p-3 text-sm text-warn-fg" role="note">${icon('clock', 'mt-px')}<div><p class="font-medium">Waiting for approval</p><p class="mt-0.5">KYC is ${m.kyc.toLowerCase()}. The merchant cannot place orders until you approve the account.</p></div></div>` : m.status === 'suspended' ? `<div class="mb-4 flex items-start gap-2.5 rounded-lg bg-crit-bg p-3 text-sm text-crit-fg" role="note">${icon('ban', 'mt-px')}<div><p class="font-medium">Suspended</p><p class="mt-0.5">API calls return an error and the portal is read-only. Existing open orders continue.</p></div></div>` : '';
  return `${pageHead({ title: `${esc(m.name)} ${merBadge(m.status)}`, sub: `${m.city}, ${m.cc} · ${esc(m.email)} · Joined ${m.joined} days ago${ref ? ' · Referred by ' + `<a class="link" href="#/merchants/${ref.id}">${esc(ref.name)}</a>` : ''}`, actions: actionsHtml })}${pendingNote}${strip}<div class="panel">${tabsEl(tabs, st.detailTab, 'merchants.detailTab', 'Merchant sections').replace('class="tabs"', 'class="tabs px-2"')}<div>${body}</div></div>`;
}
function merOrdersTab(m) {
  const rows = D(S.orders).filter((o) => o.mid === m.id);
  const cols = [
    { key: 'id', label: 'Order', val: (o) => o.created, render: (o) => `<button type="button" class="link mono font-medium" data-act="order-open" data-id="${o.id}">${o.id}</button><p class="text-2xs text-ink3">${ago(o.created)}</p>` },
    { key: 'service', label: 'Service', val: (o) => svc(o.sid).name, render: (o) => `<span class="flex max-w-[280px] items-center gap-1.5">${typeTag(svc(o.sid).type)}<span class="truncate">${esc(svc(o.sid).name)}</span></span>` },
    { key: 'input', label: 'IMEI / input', hide: 'md', render: (o) => `<span class="mono">${esc(fmtImei(o.input))}</span>` },
    { key: 'status', label: 'Status', val: (o) => STATUS_RANK[o.status], render: (o) => orderBadge(o.status) },
    { key: 'price', label: 'Price', num: true, val: (o) => o.price, render: (o) => money(o.price) },
  ];
  return table({ id: 'm-orders', st: ui.mo, cols, rows, rowId: (o) => o.id, rowAct: 'order-open', empty: emptyBlock({ ic: 'orders', title: 'No orders from this merchant', body: m.status === 'pending' ? 'Orders appear after the account is approved and funded.' : 'Orders show here as soon as they place one.' }), caption: 'Orders of ' + m.name });
}
function merWalletTab(m) {
  const js = D(S.journals).filter((j) => j.entries.some((e) => e.mid === m.id && e.acct === 'client_wallet'));
  let bal = 0;
  const rows = js.map((j) => { const e = j.entries.filter((x) => x.mid === m.id && x.acct === 'client_wallet'); const d = sum(e, (x) => (x.cr || 0) - (x.dr || 0)); bal = round(bal + d, 2); return { j, d, bal }; });
  const cols = [
    { key: 'ts', label: 'When', val: (r) => r.j.ts, render: (r) => `<span class="tabular-nums">${fmtDate(r.j.ts)}</span>` },
    { key: 'kind', label: 'Type', render: (r) => `<span class="tag">${esc(KIND_LABEL[r.j.kind])}</span>` },
    { key: 'memo', label: 'Memo', hide: 'md', render: (r) => `<span class="block max-w-[320px] truncate text-ink2">${esc(r.j.memo)}</span>` },
    { key: 'd', label: 'Amount', num: true, val: (r) => r.d, render: (r) => `<span class="${r.d < 0 ? '' : 'text-good-fg'} font-medium">${r.d > 0 ? '+' : ''}${money(r.d)}</span>` },
    { key: 'bal', label: 'Balance', num: true, hide: 'sm', val: (r) => r.j.ts, render: (r) => money(r.bal) },
    { key: 'j', label: '', cls: 'w-10', render: (r) => `<button class="btn btn-ghost btn-icon btn-sm" data-act="journal" data-rt="${r.j.refType}" data-rid="${esc(r.j.refId)}" data-title="${esc(r.j.id)} · ${esc(r.j.memo)}" aria-label="View journal ${r.j.id}">${icon('receipt', 'ic-sm')}</button>` },
  ];
  return table({ id: 'm-wallet', st: ui.mw, cols, rows, rowId: (r) => r.j.id, empty: emptyBlock({ ic: 'wallet', title: 'No wallet activity', body: 'Deposits, holds and adjustments appear here with a running balance.' }), caption: 'Wallet ledger' });
}
function merPricingTab(m) {
  const grp = GROUPS.find((x) => x.id === m.group);
  const ov = Object.entries(S.clientPrices).filter(([k]) => k.startsWith(m.id + '|')).map(([k, v]) => ({ code: k.split('|')[1], v })).map((r) => ({ ...r, s: S.services.find((x) => x.code === r.code) }));
  const gp = Object.entries(S.groupPrices).filter(([k]) => k.startsWith(m.group + '|')).map(([k, v]) => ({ code: k.split('|')[1], v, s: S.services.find((x) => x.code === k.split('|')[1]) }));
  return `<div class="p-3.5"><dl class="dl mb-5"><dt>Price group</dt><dd>${grp.name}${grp.discount ? ` <span class="text-ink3">· ${pct(grp.discount * 100, 0)} off base price</span>` : ' <span class="text-ink3">· base prices</span>'}</dd><dt>Category rule</dt><dd>${Object.entries(S.categoryRules).map(([c, a]) => `${c} ${a > 0 ? '+' : ''}${pct(a * 100, 0)}`).join(', ') || 'None'}</dd></dl>
  <div class="mb-2 flex items-center gap-2"><h3 class="text-sm font-semibold">Client overrides</h3><span class="text-xs text-ink3">Fixed prices that beat every other rule</span><span class="flex-1"></span><button class="btn btn-sm" data-act="m-override" data-id="${m.id}">${icon('plus', 'ic-sm')}Add override</button></div>
  ${ov.length ? `<div class="tbl-wrap mb-5 rounded-lg border border-line"><table class="tbl"><thead><tr><th scope="col">Service</th><th scope="col" class="num">Base</th><th scope="col" class="num">Override</th><th scope="col" class="num">Floor</th><th scope="col" class="w-10"></th></tr></thead><tbody>${ov.map((r) => `<tr><td>${esc(r.s.name)}<p class="mono text-2xs text-ink3">${r.code}</p></td><td class="num">${money(r.s.price)}</td><td class="num font-medium">${money(r.v)}</td><td class="num text-ink3">${money(r.s.cost + r.s.minProfit)}</td><td><button class="btn btn-ghost btn-icon btn-sm" data-act="m-ov-del" data-id="${m.id}" data-code="${r.code}" aria-label="Remove override for ${esc(r.s.name)}">${icon('x', 'ic-sm')}</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="mb-5 rounded-lg border border-dashed border-line2 p-4 text-sm text-ink3">No overrides. This merchant pays the ${grp.name} group price on every service.</p>`}
  <h3 class="mb-2 text-sm font-semibold">${grp.name} group service prices</h3>
  ${gp.length ? `<div class="tbl-wrap rounded-lg border border-line"><table class="tbl"><thead><tr><th scope="col">Service</th><th scope="col" class="num">Base</th><th scope="col" class="num">Group price</th></tr></thead><tbody>${gp.map((r) => `<tr><td>${esc(r.s.name)}</td><td class="num">${money(r.s.price)}</td><td class="num font-medium">${money(r.v)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="text-sm text-ink3">No fixed service prices for this group. The ${pct(grp.discount * 100, 0)} group discount applies to base prices.</p>`}</div>`;
}
function merApiTab(m) {
  if (m.status === 'pending') return emptyBlock({ ic: 'key', title: 'API key not issued', body: 'A key is created when you approve the account.' });
  return `<div class="p-3.5"><dl class="dl"><dt>Dhru endpoint</dt><dd class="flex items-center gap-1"><span class="mono break-all">https://api.gsm-supply.example/dhru/index.php</span><button class="btn btn-ghost btn-icon btn-sm" data-act="copy" data-v="https://api.gsm-supply.example/dhru/index.php" data-label="endpoint" aria-label="Copy endpoint">${icon('copy', 'ic-sm')}</button></dd><dt>Username</dt><dd class="mono">${esc(m.email)}</dd><dt>API key</dt><dd class="flex flex-wrap items-center gap-2"><span class="mono">${esc(m.key)}</span><button class="btn btn-sm" data-act="m-rotate" data-id="${m.id}">${icon('refresh', 'ic-sm')}Rotate key…</button></dd><dt>IP allowlist</dt><dd class="flex flex-wrap gap-1.5">${m.ips.length ? m.ips.map((ip) => `<span class="chip">${ip}</span>`).join('') : '<span class="text-ink3">Any IP</span>'}</dd><dt>Last request</dt><dd>${m.lastSeen ? ago(m.lastSeen) : 'Never'}</dd></dl><p class="mt-4 rounded-md bg-sunken p-3 text-xs text-ink2">Merchants can keep their existing Dhru Fusion client. Only the URL and key change.</p></div>`;
}
actions['m-adjust'] = (el) => {
  const m = mer(el.dataset.id);
  modal({
    title: 'Adjust wallet', sub: m.name + ' · balance ' + money(walletOf(m.id)), confirm: 'Post adjustment',
    body: `<div class="space-y-3"><div class="grid grid-cols-[1fr_1fr] gap-3">${field('Direction', selectEl('dir', 'credit', [['credit', 'Credit (add funds)'], ['debit', 'Debit (remove funds)']], 'Direction'))}${field('Amount (USD)', '<input class="input" name="amount" inputmode="decimal" autofocus placeholder="0.00">')}</div>${field('Reason', '<input class="input" name="reason" maxlength="140" placeholder="e.g. Refund for duplicate charge">', 'Recorded in the ledger and the audit log.')}<p class="rounded-md bg-sunken p-2.5 text-xs text-ink2">Posts a balanced journal against the <span class="mono">adjustments</span> account.</p></div>`,
    onSubmit: (f) => {
      const amt = round(parseFloat(f.amount.value), 2);
      if (!isFinite(amt) || amt <= 0) { f.amount.setAttribute('aria-invalid', 'true'); return 'Enter an amount greater than zero, like 25.00.'; }
      if (amt > 10000) { f.amount.setAttribute('aria-invalid', 'true'); return 'Adjustments over $10,000 need a second approver. Split it or ask Finance.'; }
      if (f.reason.value.trim().length < 5) { f.reason.setAttribute('aria-invalid', 'true'); return 'Add a reason of at least 5 characters so the entry can be audited later.'; }
      if (f.dir.value === 'debit' && walletOf(m.id) - amt < -m.credit) { f.amount.setAttribute('aria-invalid', 'true'); return 'This would take the wallet below the credit limit (' + money(-m.credit) + ').'; }
      const j = adjustWallet(m.id, amt, f.dir.value, f.reason.value.trim());
      toast({ kind: 'success', title: (f.dir.value === 'credit' ? 'Credited ' : 'Debited ') + money(amt), body: m.name + ' balance is now ' + money(walletOf(m.id)) + '.', action: { label: 'View journal', run: () => showJournals('merchant', m.id, j.id + ' · Adjustment') } });
      return true;
    },
  });
};
actions['m-group-menu'] = (el) => { const m = mer(el.dataset.id); openMenu(el, GROUPS.map((g) => ({ label: g.name + (g.discount ? ' (-' + g.discount * 100 + '%)' : ''), checked: m.group === g.id, run: () => { if (m.group !== g.id) { setMerchantGroup(m.id, g.id); toast({ kind: 'success', title: m.name + ' moved to ' + g.name, body: 'New orders use the new prices.' }); } } })), { width: 220, align: 'start' }); };
actions['m-suspend'] = (el) => {
  const m = mer(el.dataset.id);
  modal({
    title: 'Suspend ' + m.name, sub: 'They cannot place new orders. Open orders keep processing and their wallet stays intact.', confirm: 'Suspend merchant', kind: 'danger',
    body: field('Reason', '<input class="input" name="reason" autofocus maxlength="140" placeholder="e.g. Chargeback dispute">', 'Visible to staff only.'),
    onSubmit: (f) => { if (f.reason.value.trim().length < 3) { f.reason.setAttribute('aria-invalid', 'true'); return 'Add a short reason.'; } setMerchantStatus(m.id, 'suspended', f.reason.value.trim()); toast({ kind: 'success', title: m.name + ' suspended' }); return true; },
  });
};
actions['m-reactivate'] = (el) => { const m = mer(el.dataset.id); setMerchantStatus(m.id, 'active'); toast({ kind: 'success', title: m.name + ' reactivated' }); };
actions['m-rotate'] = (el) => { const m = mer(el.dataset.id); confirmDlg({ title: 'Rotate API key', body: 'The current key stops working immediately. ' + esc(m.name) + ' must update their client before their next call or orders will fail.', confirm: 'Rotate key', kind: 'danger', run: () => { m.key = 'gsm_live_' + String(Math.floor(Math.random() * 90 + 10)) + 'xx' + String(Math.floor(Math.random() * 90 + 10)); logAudit(ME, 'rotated API key of', 'merchant', m.id, m.name, [{ field: 'api_key', from: '••••', to: m.key }]); changed(); toast({ kind: 'success', title: 'New key issued', body: m.key }); } }); };
actions['m-override'] = (el) => {
  const m = mer(el.dataset.id);
  modal({
    title: 'Add client override', sub: m.name + '. This fixed price beats the group price, category rule and discount.', confirm: 'Save override',
    body: `<div class="space-y-3">${field('Service', selectEl('code', S.services[0].code, S.services.filter((s) => s.status === 'active').map((s) => [s.code, s.name + ' (floor ' + money(s.cost + s.minProfit) + ')']), 'Service'))}${field('Price (USD)', '<input class="input" name="price" inputmode="decimal" autofocus placeholder="0.00">', 'Must be at or above cost plus minimum profit.')}</div>`,
    onSubmit: (f) => {
      const s = S.services.find((x) => x.code === f.code.value);
      const v = round(parseFloat(f.price.value), 2);
      const floor = round(s.cost + s.minProfit, 2);
      if (!isFinite(v) || v <= 0) { f.price.setAttribute('aria-invalid', 'true'); return 'Enter a price greater than zero.'; }
      if (v < floor) { f.price.setAttribute('aria-invalid', 'true'); return 'Below the floor of ' + money(floor) + ' (cost ' + money(s.cost) + ' plus ' + money(s.minProfit) + ' minimum profit).'; }
      setClientPrice(m.id, s.code, v);
      toast({ kind: 'success', title: 'Override saved', body: s.name + ' is now ' + money(v) + ' for ' + m.name + '.' });
      return true;
    },
  });
};
actions['m-ov-del'] = (el) => { setClientPrice(el.dataset.id, el.dataset.code, null); toast({ kind: 'success', title: 'Override removed', ttl: 2400 }); };
