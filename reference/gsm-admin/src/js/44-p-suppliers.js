/* Suppliers: master-detail. Health, prepaid balance, services served, live API log. */
const msText = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(1) : Math.round(ms)) + '\u00a0' + (ms >= 1000 ? 's' : 'ms');
const codeCls = (c) => (c === 200 ? 'text-good-fg' : c === 429 ? 'text-warn-fg' : 'text-crit-fg');
const codeIcon = (c) => (c === 200 ? 'checkCircle' : c === 429 ? 'clock' : 'xCircle');
const runwayText = (mt) => (isFinite(mt.runway) ? (mt.runway < 1 ? 'Less than a day of volume' : mt.runway > 90 ? 'More than 90 days of volume' : 'About ' + (mt.runway < 10 ? mt.runway.toFixed(1) : Math.round(mt.runway)) + ' days of volume') + ' at the 7-day rate' : 'No volume in the last 7 days');

function supList(list) {
  const st = ui.suppliers;
  return `<ul class="m-0 list-none divide-y divide-line p-0" aria-label="Suppliers">${list.map((sp) => {
    const mt = supMetrics(sp.id);
    const last = sp.hist[sp.hist.length - 1];
    const on = sp.id === st.sel;
    return `<li><button type="button" class="flex w-full items-start gap-3 px-3.5 py-3 text-start hover:bg-hover ${on ? 'bg-accent/[.07]' : ''}" data-act="sup-select" data-id="${sp.id}" aria-current="${on}">
      <span class="min-w-0 flex-1"><span class="flex flex-wrap items-center gap-x-2 gap-y-1"><span class="text-sm font-medium">${esc(sp.name)}</span>${supBadge(sp)}</span>
      <span class="mt-1 block text-xs text-ink3">${esc(sp.api)} · ${mt.queue} open${mt.review ? ', <span class="font-medium text-serious-fg">' + mt.review + ' to review</span>' : ''}</span></span>
      <span class="flex-none text-end tabular-nums"><span class="block text-sm font-medium ${last.ok < 90 ? 'text-serious-fg' : ''}">${pct(last.ok, 0)}</span><span class="block text-xs ${mt.low ? 'font-medium text-warn-fg' : 'text-ink3'}">${money0(mt.balance)}${mt.low ? ' low' : ''}</span></span></button></li>`;
  }).join('')}</ul>`;
}

function supStat(label, value, sub, cls = '') {
  return `<div class="p-3.5"><p class="text-xs text-ink3">${label}</p><p class="mt-1 text-xl font-semibold tabular-nums tracking-tight ${cls}">${value}</p><p class="mt-0.5 text-xs text-ink3">${sub}</p></div>`;
}

function supDetail(sp) {
  const mt = supMetrics(sp.id);
  const last = sp.hist[sp.hist.length - 1];
  const avg = sum(sp.hist, (h) => h.ok) / sp.hist.length;
  const fbFor = S.services.filter((s) => s.fb === sp.id);
  const mine = S.services.filter((s) => s.sup === sp.id);
  const bad = sp.status !== 'up' && sp.enabled;
  const reroutable = bad ? rerouteGroups(sp.id) : null;
  const reroutePrimary = !!(reroutable && reroutable.total); // a degraded supplier with movable orders: moving them is the next action, not a top-up
  const banner = bad ? `<div class="flex flex-wrap items-start gap-3 border-b border-line ${sp.status === 'down' ? 'bg-crit-bg text-crit-fg' : 'bg-serious-bg text-serious-fg'} px-3.5 py-2.5" role="alert">${icon('alert', 'mt-0.5 flex-none')}<div class="min-w-0 flex-1 text-sm"><p class="font-medium">${sp.status === 'down' ? esc(sp.name) + ' is not responding' : 'Success rate fell to ' + pct(last.ok, 0) + ' in the last hour'}</p><p class="mt-0.5 text-xs">Orders that fail 3 times stop for manual review. ${mt.queue} open ${mt.queue === 1 ? 'order depends' : 'orders depend'} on this supplier${reroutable && reroutable.total ? '; ' + reroutable.total + ' can move to a fallback now' : ''}.</p></div>${reroutable && reroutable.total ? `<button class="btn btn-sm btn-primary flex-none" data-act="sup-reroute" data-id="${sp.id}">${icon('refresh', 'ic-sm')}Reroute ${reroutable.total} to fallback</button>` : ''}</div>` : '';
  const head = `<div class="panel-h !min-h-[56px] flex-wrap gap-y-2"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-base font-semibold">${esc(sp.name)}</h2>${supBadge(sp)}</div><p class="mono mt-0.5 text-ink3">${esc(sp.api)} · ${esc(sp.host)}</p></div><div class="flex flex-wrap items-center gap-2"><button class="btn" data-act="sup-test" data-id="${sp.id}">${icon('bolt', 'ic-sm')}Test connection</button><button class="btn" data-act="sup-sync" data-id="${sp.id}">${icon('refresh', 'ic-sm')}Sync services</button><button class="btn ${reroutePrimary ? '' : 'btn-primary'}" data-act="topup" data-id="${sp.id}">${icon('plus', 'ic-sm')}Record top-up</button><button class="btn btn-icon" data-act="sup-menu" data-id="${sp.id}" aria-label="More actions for ${esc(sp.name)}" aria-haspopup="menu">${icon('more', 'ic-sm')}</button></div></div>`;
  const stats = `<div class="grid grid-cols-2 border-b border-line lg:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line lg:[&>*:nth-child(odd)]:border-s lg:[&>*:nth-child(1)]:border-s-0">
    ${supStat('Success, last hour', pct(last.ok, 1), '24 h average ' + pct(avg, 1), last.ok < 90 ? 'text-serious-fg' : '')}
    ${supStat('Latency p50 / p95', msText(sp.p50) + ' <span class="text-sm font-normal text-ink3">/ ' + msText(sp.p95) + '</span>', 'Median and slowest 5%')}
    ${supStat('Open orders', String(mt.queue), mt.review ? '<span class="font-medium text-serious-fg">' + mt.review + ' need review</span> · <a class="link" href="#/orders" data-act="sup-orders" data-id="' + sp.id + '">View</a>' : '<a class="link" href="#/orders" data-act="sup-orders" data-id="' + sp.id + '">View orders</a>')}
    ${supStat('Prepaid balance', money(mt.balance), mt.low ? '<span class="font-medium text-warn-fg">' + (mt.balance < sp.minBalance ? 'Below the ' + money0(sp.minBalance) + ' minimum' : runwayText(mt)) + '</span>' : runwayText(mt), mt.low ? 'text-warn-fg' : '')}</div>`;
  const hist = sp.hist.map((h) => ({ v: h.ok, ms: h.ms, t: h.t }));
  const charts = `<div class="grid gap-0 border-b border-line md:grid-cols-2 md:divide-x md:divide-line rtl:md:divide-x-reverse"><div class="p-3.5"><h3 class="mb-2 text-sm font-medium">Success rate, last 24 hours</h3>${chartBox('sup-ok', 150, 'Line chart: hourly success rate for ' + sp.name + ' over the last 24 hours, against a 90% target. Latest ' + pct(last.ok, 1))}</div><div class="border-t border-line p-3.5 md:border-t-0"><h3 class="mb-2 text-sm font-medium">Median latency, last 24 hours</h3>${chartBox('sup-ms', 150, 'Line chart: hourly median latency for ' + sp.name + '. Latest ' + msText(last.ms))}</div></div>
    <details class="border-b border-line px-3.5 py-2 text-sm"><summary class="cursor-pointer select-none text-ink2 hover:text-ink">View chart data as a table</summary><div class="tbl-wrap mt-2 max-h-56 overflow-auto"><table class="tbl" aria-label="Hourly success and latency for ${esc(sp.name)}"><thead><tr><th scope="col">Hour</th><th scope="col" class="num">Success</th><th scope="col" class="num">Median latency</th></tr></thead><tbody>${hist.slice().reverse().map((h) => `<tr><td class="mono">${fmtDate(h.t)}</td><td class="num">${pct(h.v, 1)}</td><td class="num">${msText(h.ms)}</td></tr>`).join('')}</tbody></table></div></details>`;
  const svcRows = mine.map((s) => ({ s, role: 'Primary' })).concat(fbFor.map((s) => ({ s, role: 'Fallback' })));
  const svcTbl = svcRows.length ? `<div class="tbl-wrap max-h-[300px] overflow-auto"><table class="tbl" aria-label="Services using ${esc(sp.name)}"><thead><tr><th scope="col">Service</th><th scope="col">Role</th><th scope="col" class="num">Cost</th><th scope="col" class="num hidden sm:table-cell">SLA</th></tr></thead><tbody>${svcRows.map(({ s, role }) => `<tr><td><span class="font-medium ${s.status === 'disabled' ? 'text-ink3' : ''}">${esc(s.name)}</span> <span class="mono text-xs text-ink3">${s.code}</span></td><td>${role === 'Primary' ? badge('b-neutral', '', 'Primary') : '<span class="badge border border-line2 text-ink2">Fallback</span>'}</td><td class="num">${money(s.cost)}</td><td class="num hidden sm:table-cell">${ageText(s.sla * MIN)}</td></tr>`).join('')}</tbody></table></div>` : emptyBlock({ ic: 'tag', title: 'No services use this supplier', body: 'Import its catalog to start selling its services.' });
  const conn = `<dl class="dl conn p-3.5"><dt>API</dt><dd>${esc(sp.api)}</dd><dt>Base URL</dt><dd class="mono [overflow-wrap:anywhere]">https://${esc(sp.host)}</dd><dt>API key</dt><dd class="flex items-center gap-2"><span class="mono">${esc(sp.key.slice(0, 5))}••••••••${esc(sp.key.slice(-3))}</span><button class="btn btn-ghost btn-icon btn-sm" data-act="copy" data-v="${esc(sp.key)}" data-label="API key" aria-label="Copy API key for ${esc(sp.name)}">${icon('copy', 'ic-sm')}</button></dd><dt>Last sync</dt><dd>${ago(sp.lastSync)}</dd><dt>Alert below</dt><dd>${money0(sp.minBalance)} prepaid, or under 2 days of volume</dd></dl>`;
  return `<section class="panel" id="sup-detail" aria-label="${esc(sp.name)} details">${head}${banner}${stats}${charts}
    <div class="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"><div class="border-b border-line xl:border-b-0 xl:border-e"><div class="panel-h !border-b-0"><h3 class="panel-t flex-1">Services <span class="count">${svcRows.length}</span></h3></div>${svcTbl}</div><div><div class="panel-h !border-b-0"><h3 class="panel-t flex-1">Connection</h3></div>${conn}</div></div>
    <div class="border-t border-line"><div class="panel-h"><div class="min-w-0 flex-1"><h3 class="panel-t">API log</h3><p class="panel-s" id="log-sub">${logSub()}</p></div><button class="btn btn-sm" data-act="sup-pause" aria-pressed="${ui.suppliers.paused}">${icon(ui.suppliers.paused ? 'play' : 'clock', 'ic-sm')}${ui.suppliers.paused ? 'Resume live updates' : 'Pause live updates'}</button></div><div id="apilog" class="tbl-wrap max-h-[360px] overflow-auto">${logTable(sp.id)}</div></div></section>`;
}
const logSub = () => (ui.suppliers.paused ? 'Paused. New calls are not shown.' : 'Live. A new call appears every few seconds.');
function logTable(sid) {
  const rows = S.apiLog.filter((l) => l.sid === sid).slice(0, 14);
  if (!rows.length) return emptyBlock({ ic: 'inbox', title: 'No calls yet', body: 'Calls to this supplier appear here as orders are dispatched.' });
  return `<table class="tbl" aria-label="Recent API calls"><thead><tr><th scope="col">Time</th><th scope="col">Request</th><th scope="col">Status</th><th scope="col" class="num">Latency</th><th scope="col" class="hidden md:table-cell">Order</th><th scope="col" class="hidden lg:table-cell">Message</th></tr></thead><tbody>${rows.map((l) => `<tr><td class="mono whitespace-nowrap">${TF.format(l.ts)}</td><td class="mono whitespace-nowrap"><span class="text-ink3">${l.method}</span> ${l.path}</td><td><span class="inline-flex items-center gap-1 tabular-nums ${codeCls(l.code)}">${icon(codeIcon(l.code), 'ic-xs')}${l.code}</span></td><td class="num ${l.ms > 5000 ? 'text-crit-fg' : ''}">${msText(l.ms)}</td><td class="hidden md:table-cell">${l.ref && ord(l.ref) ? `<button class="link mono" data-act="order-open" data-id="${l.ref}">${l.ref}</button>` : '<span class="text-ink3">—</span>'}</td><td class="hidden max-w-[260px] truncate text-ink2 lg:table-cell">${esc(l.msg)}</td></tr>`).join('')}</tbody></table>`;
}

function pageSuppliers() {
  const g = modeGate('Suppliers', 'table');
  if (g) return g;
  const list = D(S.suppliers);
  const st = ui.suppliers;
  if (!list.length) return pageHead({ title: 'Suppliers' }) + panel({ body: emptyBlock({ ic: 'server', title: 'No suppliers connected', body: 'Connect a supplier API (Dhru Fusion 6.1 or REST) to import its services and start dispatching orders.', cta: `<button class="btn btn-primary">${icon('plus', 'ic-sm')}Connect supplier</button>` }), flush: true });
  if (!list.find((s) => s.id === st.sel)) st.sel = list[0].id;
  const sp = list.find((s) => s.id === st.sel);
  const bad = list.filter((s) => s.enabled && s.status !== 'up').length;
  const low = list.filter((s) => s.enabled && supMetrics(s.id).low).length;
  const sub = list.length + ' suppliers' + (bad ? ', <span class="font-medium text-serious-fg">' + bad + ' not healthy</span>' : ', all healthy') + (low ? ', <span class="font-medium text-warn-fg">' + low + ' low on prepaid balance</span>' : '');
  return `${pageHead({ title: 'Suppliers', sub, actions: `<button class="btn" data-act="sup-connect">${icon('plus', 'ic-sm')}Connect supplier</button>` })}
  <div class="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"><section class="panel lg:sticky lg:top-16" aria-label="Supplier list"><div class="panel-h"><h2 class="panel-t flex-1">All suppliers</h2></div>${supList(list)}</section>${supDetail(sp)}</div>`;
}

CH.set('sup-ok', (el, w) => { const sp = sup(ui.suppliers.sel); if (!sp) return; drawLine(el, w, { pts: sp.hist.map((h) => ({ v: h.ok, t: h.t })), h: 150, color: 's1', fmt: (v) => Math.round(v) + '%', yMax: 100, yMin: 0, ticks: 4, unit: '%', ref: { v: 90, label: '90% target' }, xLabel: (p, full) => (full ? fmtDate(p.t) : fmtTime(p.t)) }); });
CH.set('sup-ms', (el, w) => { const sp = sup(ui.suppliers.sel); if (!sp) return; drawLine(el, w, { pts: sp.hist.map((h) => ({ v: h.ms, t: h.t })), h: 150, color: 's1', fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 's' : Math.round(v) + ''), ticks: 3, unit: ' ms', xLabel: (p, full) => (full ? fmtDate(p.t) : fmtTime(p.t)) }); });

actions['sup-select'] = (el) => { ui.suppliers.sel = el.dataset.id; render(); if (innerWidth < 1024) $('#sup-detail')?.scrollIntoView({ block: 'start' }); };
actions['sup-orders'] = (el, e) => { e.preventDefault(); go('orders', { tab: 'open' }); ui.orders.sup = el.dataset.id; render(); };
actions['sup-pause'] = () => { ui.suppliers.paused = !ui.suppliers.paused; render(); };
actions['sup-connect'] = () => modal({ title: 'Connect supplier', sub: 'The demo does not call real suppliers.', confirm: 'Connect', body: `<div class="space-y-3">${field('Name', '<input class="input" name="name" autofocus placeholder="e.g. Atlas IMEI">')}${field('API type', selectEl('api', 'Dhru Fusion 6.1', [['Dhru Fusion 6.1', 'Dhru Fusion 6.1'], ['REST v2', 'REST v2']], 'API type', '', 'w-full'))}${field('Base URL', '<input class="input" name="host" placeholder="api.example.com">')}${field('API key', '<input class="input" name="key" autocomplete="off">', 'Stored encrypted. Shown masked after saving.')}</div>`, onSubmit: (f) => { if (f.name.value.trim().length < 2) { f.name.setAttribute('aria-invalid', 'true'); return 'Enter a supplier name.'; } if (!/^[\w.-]+\.[a-z]{2,}/i.test(f.host.value.trim())) { f.host.setAttribute('aria-invalid', 'true'); return 'Enter a valid host, like api.example.com.'; } toast({ kind: 'info', title: 'Connection not saved', body: 'This demo has no real suppliers to connect to.' }); return true; } });

actions['sup-test'] = async (el) => {
  const sp = sup(el.dataset.id);
  el.disabled = true; el.innerHTML = icon('loader', 'ic-sm animate-spin') + 'Testing…';
  await sleep(1100);
  const code = sp.status === 'down' ? 503 : sp.status === 'degraded' ? 504 : 200;
  pushApiLog(sp.id, code, code === 200 ? 'OK' : code === 504 ? 'Gateway timeout' : 'Service unavailable');
  S.apiLog.find((l) => l.sid === sp.id).path = '/balance';
  S.apiLog.find((l) => l.sid === sp.id).method = 'GET';
  render();
  if (code === 200) toast({ kind: 'success', title: sp.name + ' is reachable', body: 'Authenticated, balance read in ' + msText(sp.p50) + '.' });
  else toast({ kind: 'error', title: sp.name + (code === 504 ? ' timed out' : ' is unavailable'), body: 'GET /balance returned ' + code + '. Orders sent now may stop for review.' });
};
actions['sup-sync'] = async (el) => {
  const sp = sup(el.dataset.id);
  if (sp.status === 'down') return toast({ kind: 'error', title: 'Can’t sync while ' + sp.name + ' is down', body: 'Try again once it recovers.' });
  el.disabled = true; el.innerHTML = icon('loader', 'ic-sm animate-spin') + 'Syncing…';
  await sleep(1300);
  sp.lastSync = Date.now();
  logAudit('System', 'synced services from', 'supplier', sp.id, sp.name, []);
  changed();
  const n = S.services.filter((s) => s.sup === sp.id).length;
  const below = belowFloor().filter((s) => s.sup === sp.id).length;
  toast({ kind: below ? 'info' : 'success', title: n + ' services checked', body: below ? 'No new cost changes. ' + below + ' still priced below its floor.' : 'No cost changes.' });
};
actions.topup = (el) => {
  const sp = sup(el.dataset.id || ui.suppliers.sel);
  const mt = supMetrics(sp.id);
  modal({
    title: 'Record top-up', sub: esc(sp.name) + ' · balance now ' + money(mt.balance), confirm: 'Record top-up',
    body: `<div class="space-y-3"><p class="text-sm text-ink2">Record money you already sent to the supplier. This moves it from Bank to Supplier prepaid and does not send a payment.</p>${field('Amount (USD)', '<input class="input" name="amount" inputmode="decimal" autofocus placeholder="500.00" aria-describedby="topup-after">')}${field('Bank reference', '<input class="input" name="ref" placeholder="Optional, e.g. wire ID">')}<p id="topup-after" class="rounded-md bg-sunken p-2.5 text-sm" aria-live="polite">New balance: ${money(mt.balance)}</p></div>`,
    onSubmit: (f) => {
      const v = round(parseFloat(f.amount.value), 2);
      if (!isFinite(v) || v <= 0) { f.amount.setAttribute('aria-invalid', 'true'); return 'Enter an amount greater than zero.'; }
      if (v > 50000) { f.amount.setAttribute('aria-invalid', 'true'); return 'Top-ups above $50,000 need a second approver. Split it or ask another admin.'; }
      topupSupplier(sp.id, v);
      toast({ kind: 'success', title: money(v) + ' recorded for ' + sp.name, body: 'Prepaid balance is now ' + money(S.prepaid[sp.id]) + '.' });
      return true;
    },
  });
  const f = $('#dlg form'), out = $('#topup-after');
  f.amount.addEventListener('input', () => { f.amount.removeAttribute('aria-invalid'); const v = parseFloat(f.amount.value); out.textContent = 'New balance: ' + money(mt.balance + (isFinite(v) && v > 0 ? v : 0)); });
};
function rerouteGroups(sid) {
  const groups = {}; let total = 0, stay = 0;
  for (const o of S.orders) {
    if (o.sup !== sid || !isOpen(o)) continue;
    const fb = svc(o.sid).fb;
    if (fb && sup(fb).enabled && sup(fb).status === 'up') { (groups[fb] = groups[fb] || []).push(o.id); total++; } else stay++;
  }
  return { groups, total, stay };
}
actions['sup-reroute'] = (el) => {
  const sp = sup(el.dataset.id);
  const r = rerouteGroups(sp.id);
  if (!r.total) return toast({ kind: 'info', title: 'Nothing to reroute', body: 'No open order has a healthy fallback.' });
  const lines = Object.entries(r.groups).map(([fb, ids]) => `<li class="flex justify-between gap-3"><span>To ${esc(sup(fb).name)}</span><span class="tabular-nums font-medium">${ids.length}</span></li>`).join('');
  modal({
    title: 'Reroute ' + r.total + ' open orders', sub: 'From ' + esc(sp.name), confirm: 'Reroute ' + r.total + ' orders',
    body: `<ul class="m-0 list-none divide-y divide-line rounded-md border border-line p-0 text-sm [&>li]:px-3 [&>li]:py-2">${lines}${r.stay ? `<li class="flex justify-between gap-3 text-ink2"><span>Stay here (no healthy fallback)</span><span class="tabular-nums">${r.stay}</span></li>` : ''}</ul><p class="mt-3 text-sm text-ink2">Each order is re-sent and its status becomes Processing. The new supplier cost applies to your margin. Every move is written to the audit log.</p>`,
    onSubmit: () => { let n = 0; for (const [fb, ids] of Object.entries(r.groups)) n += retryOrders(ids, fb); toast({ kind: 'success', title: n + ' orders rerouted', body: 'They are Processing with their fallback suppliers.' }); return true; },
  });
};
actions['sup-menu'] = (el) => {
  const sp = sup(el.dataset.id);
  const items = [{ label: 'Copy base URL', icon: 'copy', run: () => copyText('https://' + sp.host, 'Copied base URL') }, { label: 'See its orders', icon: 'orders', run: () => { go('orders', { tab: 'all' }); ui.orders.sup = sp.id; render(); } }, { sep: true }];
  items.push(sp.enabled ? { label: 'Disable supplier…', icon: 'ban', danger: true, run: () => supDisable(sp) } : { label: 'Enable supplier', icon: 'check', run: () => { setSupplierEnabled(sp.id, true); toast({ kind: 'success', title: sp.name + ' enabled', body: 'It can receive orders again.' }); } });
  openMenu(el, items, { width: 220 });
};
function supDisable(sp) {
  const n = S.services.filter((s) => s.sup === sp.id).length;
  const noFb = S.services.filter((s) => s.sup === sp.id && !s.fb).length;
  confirmDlg({ title: 'Disable ' + esc(sp.name) + '?', confirm: 'Disable supplier', kind: 'danger', body: `<p>New orders for its ${n} services go to their fallback supplier.${noFb ? ` <strong class="font-medium text-crit-fg">${noFb} of them have no fallback</strong> and will wait for manual dispatch.` : ''} Open orders keep their current supplier.</p><p class="mt-2">You can enable it again at any time.</p>`, run: () => { setSupplierEnabled(sp.id, false); toast({ kind: 'info', title: sp.name + ' disabled', body: 'No new orders will be sent to it.' }); } });
}

/* live log: add a call every few seconds while the page is open, without re-rendering the whole page */
setInterval(() => {
  if (ui.mode !== 'normal' || ui.suppliers.paused || document.hidden || parseHash().r.id !== 'suppliers' || $('dialog[open]')) return;
  const sp = sup(ui.suppliers.sel);
  if (!sp || !sp.enabled) return;
  pushApiLog(sp.id);
  const box = $('#apilog');
  if (box) box.innerHTML = logTable(sp.id);
}, 3500);
