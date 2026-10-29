/* App shell: routes, nav, topbar, demo menu, command palette, theme, keyboard, boot */
const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Operations', render: () => pageDashboard() },
  { id: 'orders', label: 'Orders', icon: 'orders', group: 'Operations', render: () => pageOrders() },
  { id: 'merchants', label: 'Merchants', icon: 'users', group: 'Operations', render: (id) => (id ? pageMerchant(id) : pageMerchants()) },
  { id: 'customers', label: 'Customers', icon: 'user', group: 'Operations', render: (id) => (id ? pageCustomer(id) : pageCustomers()) },
  { id: 'support', label: 'Support', icon: 'life', group: 'Operations', render: () => pageSupport() },
  { id: 'risk', label: 'Risk & checks', icon: 'shield', group: 'Operations', render: () => pageRisk() },
  { id: 'checkouts', label: 'Abandoned checkouts', icon: 'mail', group: 'Operations', render: () => pageCheckouts() },
  { id: 'services', label: 'Services & pricing', icon: 'tag', group: 'Catalog', render: () => pageServices() },
  { id: 'suppliers', label: 'Suppliers', icon: 'server', group: 'Catalog', render: () => pageSuppliers() },
  { id: 'storefront', label: 'Storefront', icon: 'store', group: 'Catalog', render: () => pageStorefront() },
  { id: 'finance', label: 'Finance', icon: 'wallet', group: 'Money', render: () => pageFinance() },
  { id: 'commissions', label: 'Commissions', icon: 'percent', group: 'Money', render: () => pageCommissions() },
  { id: 'refunds', label: 'Refunds & disputes', icon: 'undo', group: 'Money', render: () => pageRefunds() },
  { id: 'access', label: 'Admins & access', icon: 'lock', group: 'System', render: () => pageAccess() },
  { id: 'settings', label: 'Settings', icon: 'sliders', group: 'System', render: () => pageSettings() },
  { id: 'audit', label: 'Audit log', icon: 'history', group: 'System', render: () => pageAudit() },
];
const parseHash = () => {
  const [name = 'dashboard', id] = location.hash.replace(/^#\/?/, '').split('/');
  return { r: ROUTES.find((r) => r.id === name) || ROUTES[0], id: id || null };
};
function go(route, p = {}) {
  if (route === 'orders') Object.assign(ui.orders, { tab: p.tab || 'all', flag: p.flag || '', type: p.type || '', chan: p.chan || '', q: '', page: 1 });
  if (route === 'refunds') { if (p.tab) ui.refunds.tab = p.tab; ui.refunds.status = p.status || ''; ui.rfT.page = 1; }
  if (route === 'support' && p.filter) ui.support.filter = p.filter;
  if (route === 'risk' && p.tab) ui.risk.tab = p.tab;
  if (route === 'settings' && p.tab) ui.settings.tab = p.tab;
  if (route === 'storefront' && p.tab) ui.storefront.tab = p.tab;
  if (route === 'access' && p.tab) ui.access.tab = p.tab;
  if (route === 'customers' && !p.id) { ui.customers.tab = p.tab || 'all'; ui.cu.page = 1; }
  if (route === 'finance' && p.tab) { ui.finance.tab = p.tab; ui.finance.page = 1; }
  if (route === 'services') { ui.services.flag = p.flag || ''; ui.services.tab = 'services'; }
  if (route === 'suppliers' && p.sel) ui.suppliers.sel = p.sel;
  if (route === 'merchants' && !p.id) { ui.merchants.tab = p.tab || 'all'; ui.merchants.page = 1; }
  const h = '#/' + route + (p.id ? '/' + p.id : '');
  if (location.hash === h) render(); else location.hash = h;
}
actions.go = (el) => { closeDrawer(); closeDlg(); const p = el.dataset.p ? JSON.parse(el.dataset.p) : {}; go(el.dataset.route, p); };

/* ---------- mode gating (loading / error) ---------- */
function modeGate(title, kind = 'table', sub = '') {
  if (ui.mode === 'loading') {
    const body = kind === 'dashboard'
      ? `${skelStat()}<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">${panel({ title: skel('120px', 14), body: skelTable(3, 5), flush: true })}${panel({ title: skel('150px', 14), body: `<div class="p-3.5">${skel('100%', 220)}</div>`, flush: true })}</div>`
      : `<div class="mb-3 flex gap-2">${skel('200px', 32)}${skel('110px', 32)}${skel('110px', 32)}</div>${panel({ body: skelTable(6, 10), flush: true })}`;
    return pageHead({ title, sub }) + body;
  }
  if (ui.mode === 'error') {
    return pageHead({ title, sub }) + (kind === 'dashboard'
      ? `<div class="grid gap-4 lg:grid-cols-2">${panel({ title: 'Needs attention', body: errorBlock({ title: 'Couldn’t load the work queue', detail: 'GET /admin/dashboard/attention returned 504 after 10 s. Your data is safe, this is a read failure.', rid: 'req_8f3a2c1e' }), flush: true })}${panel({ title: 'Orders', body: errorBlock({ title: 'Couldn’t load order volume', detail: 'GET /admin/reports/orders-by-type timed out. The reporting replica may be restarting.', rid: 'req_1c07de42' }), flush: true })}</div>`
      : panel({ body: errorBlock({ title: 'Couldn’t load ' + title.toLowerCase(), detail: 'The API did not respond in time (504). Nothing was changed.', rid: 'req_5b92a07d' }), flush: true }));
  }
  return null;
}
function stateBanner() {
  if (ui.mode === 'normal') return '';
  const t = { loading: 'Loading state', empty: 'Empty state', error: 'Error state' }[ui.mode];
  return `<div class="mb-3 flex items-center gap-2 rounded-md border border-line2 bg-sunken px-3 py-1.5 text-xs text-ink2" role="status">${icon('flask', 'ic-sm')}<span class="min-w-0 flex-1"><strong class="font-medium text-ink">Demo: ${t}.</strong> This is how this page looks when ${ui.mode === 'loading' ? 'requests are in flight' : ui.mode === 'empty' ? 'a new account has no data yet' : 'the API fails'}.</span><button class="btn btn-sm" data-act="mode" data-v="normal">Back to normal</button></div>`;
}

/* ---------- shell ---------- */
function renderNav() {
  const open = S.orders.filter(isOpen).length;
    const fin = pendingPayments().length + pendingWithdrawals().length;
  const pm = S.merchants.filter((m) => m.status === 'pending').length;
  const late = S.orders.filter(isBreach).length;
  const ss = supportStats(), rfn = S.refunds.filter((r) => r.status === 'requested' || r.status === 'failed').length, dpn = S.disputes.filter((d) => d.status === 'needs_response'), dpSoon = dpn.filter((d) => d.due - Date.now() < 3 * DAY).length;
  const badges = { orders: [open, late], finance: [fin, 0], merchants: [pm, 0], support: [ss.open, ss.late, 'past the reply target'], refunds: [rfn + dpn.length, dpSoon, 'dispute deadlines within 3 days'], risk: [heldOrders().length, 0] };
  const cur = parseHash().r.id;
  const groups = [...new Set(ROUTES.map((r) => r.group))];
  $('#sidebar').innerHTML = `
    <div class="flex h-12 flex-none items-center gap-2.5 border-b border-line px-3.5">
      <span class="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-2xs font-semibold text-surface" aria-hidden="true">GS</span>
      <div class="min-w-0 flex-1 leading-tight"><p class="truncate text-sm font-semibold">GSM Supply</p><p class="truncate text-2xs text-ink3">Admin console</p></div>
      <button class="btn btn-ghost btn-icon btn-sm lg:hidden" data-act="nav-close" aria-label="Close menu">${icon('x')}</button>
    </div>
    <nav class="flex-1 overflow-y-auto px-2 pb-2" aria-label="Primary">${groups.map((g) => `<p class="nav-h">${g}</p><ul class="m-0 list-none space-y-0.5 p-0">${ROUTES.filter((r) => r.group === g).map((r) => { const b = badges[r.id]; return `<li><a class="nav-link" href="#/${r.id}" ${cur === r.id ? 'aria-current="page"' : ''}>${icon(r.icon)}<span class="min-w-0 flex-1 truncate">${r.label}</span>${b && b[0] ? `<span class="inline-flex items-center gap-1.5"><span class="count">${b[0]}</span>${b[1] ? `<span class="dot bg-crit-dot" aria-hidden="true" title="${b[1]} ${b[2] || 'past SLA'}"></span><span class="sr-only">${b[1]} ${b[2] || 'past SLA'}</span>` : ''}</span>` : ''}</a></li>`; }).join('')}</ul>`).join('')}</nav>
    <div class="flex-none space-y-2 border-t border-line p-3">
      <p class="flex items-start gap-1.5 text-xs text-ink3">${icon('flask', 'ic-sm mt-px')}<span>Demo with synthetic data. Nothing here is real, and nothing leaves this page.</span></p>
      <div class="flex items-center gap-2">${avatar(ME)}<div class="min-w-0 flex-1 leading-tight"><p class="truncate text-xs font-medium">${ME}</p><p class="text-2xs text-ink3">Admin</p></div></div>
    </div>`;
}
function renderTopbar() {
  const { r, id } = parseHash();
  const sep = '<span class="text-ink3" aria-hidden="true">/</span>';
  const crumb = `<span class="hidden text-ink3 sm:inline">${r.group}</span><span class="hidden sm:inline">${sep}</span>` + (id && r.id === 'merchants' && mer(id) ? `<a class="text-ink3 hover:text-ink" href="#/merchants">Merchants</a>${sep}<span class="truncate font-medium" aria-current="page">${esc(mer(id).name)}</span>` : id && r.id === 'customers' && cus(id) ? `<a class="text-ink3 hover:text-ink" href="#/customers">Customers</a>${sep}<span class="truncate font-medium" aria-current="page">${esc(cus(id).name)}</span>` : `<span class="truncate font-medium" aria-current="page">${r.label}</span>`);
  const modeTxt = { normal: 'Demo', loading: 'Demo: loading', empty: 'Demo: empty', error: 'Demo: error' }[ui.mode];
  $('#topbar').innerHTML = `
    <button class="btn btn-ghost btn-icon lg:hidden" data-act="nav-open" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1.5 text-sm">${crumb}</nav>
    <div class="flex-1"></div>
    <button class="hidden h-8 w-full max-w-[280px] items-center gap-2 rounded-md border border-line2 bg-surface px-2.5 text-sm text-ink3 hover:border-ink3 md:flex" data-act="palette" aria-label="Search or jump to, command palette">${icon('search', 'ic-sm')}<span class="flex-1 text-start">Search or jump to…</span><span class="kbd">⌘K</span></button>
    <button class="btn btn-ghost btn-icon md:hidden" data-act="palette" aria-label="Search">${icon('search')}</button>
    <button class="btn btn-sm" data-act="demo-menu" aria-haspopup="menu">${icon('flask', 'ic-sm')}<span class="hidden sm:inline">${modeTxt}</span>${ui.mode !== 'normal' ? '<span class="dot bg-warn-dot" aria-hidden="true"></span>' : ''}${icon('chevD', 'ic-xs')}</button>
    <button class="btn btn-ghost btn-icon" data-act="theme" aria-label="Toggle colour theme">${icon(isDark() ? 'sun' : 'moon')}</button>`;
}
const setModeLabel = () => renderTopbar();
function render(soft) {
  const ae = document.activeElement;
  const fk = ae && ae.dataset && ae.dataset.fk;
  const caret = fk ? [ae.selectionStart, ae.selectionEnd] : null;
  const { r, id } = parseHash();
  let html;
  try { html = stateBanner() + r.render(id); } catch (e) { console.error(e); html = panel({ body: errorBlock({ title: 'This page failed to render', detail: String(e.message), rid: 'client' }), flush: true }); }
  $('#main').innerHTML = html;
  renderNav(); renderTopbar();
  afterRender(); mountCharts();
  if (fk) { const n = $(`[data-fk="${fk}"]`); if (n) { n.focus(); try { n.setSelectionRange(caret[0], caret[1]); } catch (e) { /* not text */ } } }
  document.title = (id && r.id === 'merchants' && mer(id) ? mer(id).name + ' · ' : id && r.id === 'customers' && cus(id) ? cus(id).name + ' · ' : '') + r.label + ' · GSM Supply demo';
}
const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function setTheme(t) {
  const el = document.documentElement;
  if (t === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t);
  try { t === 'system' ? localStorage.removeItem('gsm-theme') : localStorage.setItem('gsm-theme', t); } catch (e) { /* storage blocked */ }
  renderTopbar();
  mountCharts();
}
function setDense(on) {
  document.documentElement.classList.toggle('dense', on);
  try { localStorage.setItem('gsm-dense', on ? '1' : '0'); } catch (e) { /* storage blocked */ }
  render();
}

/* ---------- global actions ---------- */
actions['nav-open'] = () => { $('#sidebar').dataset.open = 'true'; $('#scrim').hidden = false; $('[data-act="nav-open"]')?.setAttribute('aria-expanded', 'true'); $('#sidebar a')?.focus(); };
actions['nav-close'] = () => { $('#sidebar').dataset.open = 'false'; $('#scrim').hidden = true; $('[data-act="nav-open"]')?.setAttribute('aria-expanded', 'false'); };
actions.theme = () => setTheme(isDark() ? 'light' : 'dark');
actions.mode = (el) => { ui.mode = el.dataset.v; render(); };
actions['demo-menu'] = (el) => {
  const th = document.documentElement.getAttribute('data-theme') || 'system';
  const dn = document.documentElement.classList.contains('dense');
  const outage = sup('sup1').status === 'down';
  openMenu(el, [
    { header: 'Data state' },
    ...[['normal', 'Normal'], ['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error']].map(([v, l]) => ({ label: l, checked: ui.mode === v, run: () => { ui.mode = v; render(); } })),
    { sep: true }, { header: 'Simulate' },
    { label: 'Incoming order', icon: 'plus', run: () => { const o = simulateOrder(); toast({ kind: 'info', title: o.id + ' received', body: mer(o.mid).name + ' ordered ' + svc(o.sid).name + '. Watch it move through the queue.', action: { label: 'Open', run: () => openOrder(o.id) } }); } },
    { label: 'Incoming storefront order', icon: 'store', run: () => actions['sim-sf-order']() },
    { label: 'Open a support ticket', icon: 'life', run: () => actions['sim-ticket']() },
    { label: outage ? 'Nordic GSM recovers' : 'Nordic GSM goes down', icon: 'server', run: () => { setSupplierStatus('sup1', outage ? 'up' : 'down', 'System'); toast({ kind: outage ? 'success' : 'error', title: outage ? 'Nordic GSM is healthy again' : 'Nordic GSM is down', body: outage ? 'Dashboard alerts cleared.' : 'A new alert appears on the dashboard.' }); } },
    { label: 'Reset demo data', icon: 'undo', run: () => { resetData(); toast({ kind: 'info', title: 'Demo data reset', ttl: 2200 }); } },
    { sep: true }, { header: 'Display' },
    ...[['system', 'Theme: system'], ['light', 'Theme: light'], ['dark', 'Theme: dark']].map(([v, l]) => ({ label: l, checked: th === v, run: () => setTheme(v) })),
    { label: 'Compact rows', checked: dn, run: () => setDense(!dn) },
  ], { width: 220 });
};

/* ---------- command palette ---------- */
let palIdx = 0, palItems = [];
function paletteItems(q) {
  const ql = q.trim().toLowerCase();
  const nav = ROUTES.map((r) => ({ g: 'Go to', label: r.label, icon: r.icon, run: () => go(r.id) }));
  const cmds = [
    { g: 'Actions', label: 'Simulate incoming order', icon: 'plus', run: () => { const o = simulateOrder(); toast({ kind: 'info', title: o.id + ' received' }); } },
    { g: 'Actions', label: 'Simulate storefront order', icon: 'store', run: () => actions['sim-sf-order']() },
    { g: 'Actions', label: 'Open the risk review queue', icon: 'shield', run: () => go('risk', { tab: 'queue' }) },
    { g: 'Actions', label: 'Review refund requests', icon: 'undo', run: () => go('refunds', { tab: 'refunds', status: 'requested' }) },
    { g: 'Actions', label: 'Toggle dark mode', icon: isDark() ? 'sun' : 'moon', run: () => setTheme(isDark() ? 'light' : 'dark') },
    { g: 'Actions', label: 'Review orders that need attention', icon: 'alert', run: () => go('orders', { tab: 'review' }) },
    { g: 'Actions', label: 'Review pending deposits', icon: 'receipt', run: () => go('finance', { tab: 'payments' }) },
  ];
  let out = [...nav, ...cmds].filter((i) => !ql || i.label.toLowerCase().includes(ql));
  if (ql.length >= 2) {
    const hit = [];
    for (const o of S.orders.slice().reverse()) {
      if (hit.length >= 5) break;
      const bn = buyerOf(o).name;
      if (o.id.toLowerCase().includes(ql) || o.input.replace(/\s/g, '').includes(ql.replace(/\s/g, '')) || bn.toLowerCase().includes(ql)) hit.push({ g: 'Orders', label: o.id + '  ' + svc(o.sid).name, sub: bn, icon: 'orders', run: () => openOrder(o.id) });
    }
    out = out.concat(hit, S.merchants.filter((m) => m.name.toLowerCase().includes(ql)).slice(0, 4).map((m) => ({ g: 'Merchants', label: m.name, sub: m.city, icon: 'store', run: () => go('merchants', { id: m.id }) })), S.customers.filter((c) => c.name.toLowerCase().includes(ql) || c.email.includes(ql)).slice(0, 4).map((c) => ({ g: 'Customers', label: c.name, sub: B2C_COUNTRIES[c.country].name, icon: 'user', run: () => go('customers', { id: c.id }) })), S.tickets.filter((t) => t.id.toLowerCase().includes(ql) || t.subject.toLowerCase().includes(ql)).slice(0, 3).map((t) => ({ g: 'Tickets', label: t.id + '  ' + t.subject, sub: ticketWho(t).name, icon: 'life', run: () => { ui.support.sel = t.id; ui.support.open = true; ui.support.filter = 'all'; go('support'); } })), S.services.filter((s) => s.name.toLowerCase().includes(ql) || s.code.toLowerCase().includes(ql)).slice(0, 4).map((s) => ({ g: 'Services', label: s.name, sub: s.code, icon: 'tag', run: () => { ui.services.q = s.name; go('services'); } })));
  }
  return out.slice(0, 14);
}
function drawPalette() {
  const q = $('#pal-q').value;
  palItems = paletteItems(q);
  palIdx = clamp(palIdx, 0, Math.max(0, palItems.length - 1));
  let last = '';
  $('#pal-list').innerHTML = palItems.length ? palItems.map((it, i) => { const head = it.g !== last ? `<li role="presentation" class="menu-h">${it.g}</li>` : ''; last = it.g; return `${head}<li role="option" id="pal-${i}" aria-selected="${i === palIdx}" data-pi="${i}" class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm ${i === palIdx ? 'bg-sunken' : ''}">${icon(it.icon, 'ic-sm text-ink3')}<span class="min-w-0 flex-1 truncate">${esc(it.label)}</span>${it.sub ? `<span class="truncate text-xs text-ink3">${esc(it.sub)}</span>` : ''}</li>`; }).join('') : `<li class="px-2 py-6 text-center text-sm text-ink3" role="presentation">No results for “${esc(q)}”.</li>`;
  $('#pal-q').setAttribute('aria-activedescendant', palItems.length ? 'pal-' + palIdx : '');
  $(`#pal-${palIdx}`)?.scrollIntoView({ block: 'nearest' });
}
function openPalette() {
  closeMenu(false);
  const d = $('#palette');
  d.innerHTML = `<div class="flex items-center gap-2 border-b border-line px-3">${icon('search', 'text-ink3')}<input id="pal-q" class="h-11 flex-1 bg-transparent text-base outline-none placeholder:text-ink3" placeholder="Search orders, IMEIs, merchants, services, or jump to a page" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"><span class="kbd">Esc</span></div><ul id="pal-list" role="listbox" aria-label="Results" class="m-0 max-h-[52vh] list-none overflow-y-auto p-1.5"></ul><div class="flex items-center gap-3 border-t border-line px-3 py-2 text-xs text-ink3"><span><span class="kbd">↑</span> <span class="kbd">↓</span> to move</span><span><span class="kbd">↵</span> to open</span></div>`;
  palIdx = 0;
  if (!d.open) d.showModal();
  drawPalette();
  $('#pal-q').focus();
  $('#pal-q').oninput = () => { palIdx = 0; drawPalette(); };
}
actions.palette = openPalette;
actions['sim-sf-order'] = () => { ui.mode = 'normal'; const o = simulateStorefrontOrder(); toast({ kind: 'info', title: o.id + ' paid on the storefront', body: cus(o.cid).name + ' bought ' + svc(o.sid).name + (o.status === 'review' ? '. The risk engine is holding it.' : '. It is on its way to the supplier.'), action: { label: 'Open', run: () => openOrder(o.id) } }); };
const runPal = (i) => { const it = palItems[i]; if (!it) return; $('#palette').close(); it.run(); };

/* ---------- boot ---------- */
function boot() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') return; // handled on change
    if (e.target.closest('[data-stop]') && !e.target.closest('[data-stop]').matches('[data-act]')) return;
    const fn = actions[el.dataset.act];
    if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('input[type=checkbox][data-act]')) { actions[el.dataset.act]?.(el, e); return; }
    if (el.dataset.bind) binds[el.dataset.bind]?.(el, e);
  });
  document.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.bind && (el.type === 'search' || el.type === 'text')) binds[el.dataset.bind]?.(el, e); });
  $('#scrim').addEventListener('click', () => actions['nav-close']());
  $('#sidebar').addEventListener('click', (e) => { if (e.target.closest('a')) actions['nav-close'](); });
  for (const id of ['drawer', 'palette']) $('#' + id).addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#dlg').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#palette').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palItems.length - 1, palIdx + 1); drawPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(0, palIdx - 1); drawPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPal(palIdx); }
  });
  $('#palette').addEventListener('click', (e) => { const li = e.target.closest('[data-pi]'); if (li) runPal(+li.dataset.pi); });
  let gPending = 0;
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#palette').open ? $('#palette').close() : openPalette(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if ($('dialog[open]')) return;
    if (e.key === '/') { const s = $('[data-fk]'); if (s) { e.preventDefault(); s.focus(); } else { e.preventDefault(); openPalette(); } }
    else if (e.key === '?') { e.preventDefault(); shortcutsDialog(); }
    else if (e.key === 'g') { gPending = Date.now(); }
    else if (gPending && Date.now() - gPending < 1200) {
      const map = { d: 'dashboard', o: 'orders', m: 'merchants', k: 'customers', s: 'support', i: 'risk', p: 'services', u: 'suppliers', t: 'storefront', f: 'finance', c: 'commissions', r: 'refunds', a: 'audit' };
      if (map[e.key]) { e.preventDefault(); go(map[e.key]); }
      gPending = 0;
    }
  });
  addEventListener('hashchange', () => { closeDrawer(); closeMenu(false); render(); scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { renderTopbar(); mountCharts(); });
  onChange(() => { render(); refreshDrawer(); });
  render();
  setInterval(() => { if (ui.mode === 'normal' && !$('dialog[open]')) { const el = $('[data-live-age]'); if (el) render(); } }, 30000);
}
function shortcutsDialog() {
  const rows = [['⌘K', 'Command palette'], ['/', 'Focus search'], ['?', 'This list'], ['g then d / o / m', 'Go to dashboard / orders / merchants'], ['g then k / s / i', 'Go to customers / support / risk'], ['g then p / u / t', 'Go to pricing / suppliers / storefront'], ['g then f / c / r / a', 'Go to finance / commissions / refunds / audit'], ['j / k', 'Move down / up in the orders table'], ['Enter', 'Open the highlighted order'], ['x', 'Select the highlighted order'], ['Esc', 'Close a panel or dialog']];
  modal({ title: 'Keyboard shortcuts', noFooter: true, body: `<dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">${rows.map(([k, v]) => `<dt><span class="kbd">${esc(k)}</span></dt><dd class="m-0 text-ink2">${esc(v)}</dd>`).join('')}</dl>` });
}
boot();
