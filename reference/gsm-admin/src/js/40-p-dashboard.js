/* Dashboard: the work queue first, a slim scoreboard, then trends */
function delta(cur, prev, { lowerBetter = false, kind = 'pct', unit = '' } = {}) {
  if (!prev) return `<span class="text-ink3">No earlier data</span>`;
  const d = kind === 'pp' ? cur - prev : ((cur - prev) / prev) * 100;
  if (Math.abs(d) < 0.05) return `<span class="inline-flex items-center gap-1 text-ink3">${icon('arrowR', 'ic-xs')}No change</span>`;
  const up = d > 0, good = lowerBetter ? !up : up;
  return `<span class="inline-flex items-center gap-1 font-medium ${good ? 'text-good-fg' : 'text-crit-fg'}">${icon(up ? 'arrowUp' : 'arrowDown', 'ic-xs')}${Math.abs(d).toFixed(1)}${kind === 'pp' ? ' pts' : '%'}<span class="sr-only">${good ? ', better' : ', worse'}</span></span>`;
}
function statStrip() {
  const days = ui.period;
  const { cur, prev } = ui.mode === 'empty' ? { cur: statsFor(0, 0), prev: statsFor(0, 0) } : periodStats(days, ui.scope);
  const lab = days === 1 ? '24h' : days + 'D';
  const empty = ui.mode === 'empty';
  const vs = days === 1 ? '24 hours' : days + ' days';
  const cell = (label, value, d, tip) => `<div class="min-w-0 p-3 sm:p-3.5"><p><button type="button" class="-mx-1 inline-flex h-6 items-center gap-1 rounded px-1 text-xs text-ink3 hover:text-ink" data-act="note" data-title="${esc(label)}" data-note="${esc(tip + ' Arrows compare with the previous ' + vs + '.')}" aria-haspopup="dialog">${label}${icon('info', 'ic-xs')}</button></p><div class="mt-0.5 flex flex-wrap items-baseline gap-x-2"><p class="text-2xl font-semibold tabular-nums tracking-tight">${value}</p><p class="text-xs">${empty ? '<span class="text-ink3">No data yet</span>' : d}</p></div></div>`;
  const cells = [
    cell('Revenue', empty ? '$0' : money0(cur.revenue), delta(cur.revenue, prev.revenue), 'Price of completed orders in the period.'),
    cell('Gross profit', empty ? '$0' : money0(cur.profit), delta(cur.profit, prev.profit), 'Completed order price minus supplier cost.'),
    cell('Orders', empty ? '0' : num(cur.orders), delta(cur.orders, prev.orders), 'Orders created in the period, any status.'),
    cell('Success rate', empty ? '–' : pct(cur.success, 1), delta(cur.success, prev.success, { kind: 'pp' }), 'Completed divided by completed plus rejected.'),
    cell('Median turnaround', empty ? '–' : dur(cur.median), delta(cur.median, prev.median, { lowerBetter: true }), 'Median time from order created to completed.'),
  ];
  /* 2 columns on mobile: the odd fifth cell spans both so no half-row hole is left */
  return `<section class="panel mb-4 grid grid-cols-2 md:grid-cols-5" aria-label="Key figures for the last ${lab}">${cells.map((c, i) => `<div class="border-line ${i === 4 ? 'col-span-2 md:col-span-1' : ''} ${i ? 'md:border-s' : ''} ${i % 2 && i < 4 ? 'border-s' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''}">${c}</div>`).join('')}</section>`;
}
const ATTN = { crit: ['b-crit-solid', 'xCircle'], serious: ['b-serious', 'alert'], warn: ['b-warn', 'clock'], info: ['b-neutral', 'info'] };
const ATTN_CAP = 6;
function attentionPanel() {
  const all = ui.mode === 'empty' ? [] : attention(ui.scope);
  const items = ui.attnAll ? all : all.slice(0, ATTN_CAP);
  const more = all.length - ATTN_CAP;
  const row = (it) => `<li class="attn-row px-3.5 py-2.5"><span class="attn-b">${badge(ATTN[it.sev][0], ATTN[it.sev][1], sevLabel[it.sev])}</span><p class="attn-t text-sm ${it.sev === 'crit' ? 'font-semibold' : 'font-medium'}">${esc(it.title)}</p><p class="attn-m text-xs text-ink3">${esc(it.meta)}</p>${it.act ? `<button class="btn btn-sm attn-a" data-act="topup" data-id="${it.id2}">${esc(it.cta)}</button>` : `<button class="btn btn-sm attn-a" data-act="go" data-route="${it.go.route}" data-p="${esc(JSON.stringify(it.go))}">${esc(it.cta)}${icon('arrowR', 'ic-xs')}</button>`}</li>`;
  const body = all.length
    ? `<ul id="attn-list" class="m-0 list-none divide-y divide-line p-0">${items.map(row).join('')}</ul>${more > 0 ? `<div class="border-t border-line px-3.5 py-2"><button type="button" class="btn btn-ghost btn-sm -ms-2.5" data-act="attn-more" aria-expanded="${!!ui.attnAll}" aria-controls="attn-list">${icon('chevD', 'ic-sm transition-transform ' + (ui.attnAll ? 'rotate-180' : ''))}${ui.attnAll ? 'Show fewer' : 'Show ' + more + ' more'}</button></div>` : ''}`
    : ui.mode === 'empty'
      ? emptyBlock({ ic: 'inbox', title: 'Nothing needs you yet', body: 'When orders start coming in, the ones that need a decision, late suppliers, low balances and pending payments appear here, most urgent first.', cta: `<button class="btn" data-act="sim-order">${icon('plus', 'ic-sm')}Simulate an order</button>` })
      : emptyBlock({ ic: 'checkCircle', title: 'All clear', body: 'No late orders, supplier problems or pending approvals right now.' });
  return panel({ title: 'Needs attention', sub: all.length ? all.length + ' open, most urgent first' : '', flush: true, body, id: 'attention' });
}
function queuePanel() {
  const q = ui.mode === 'empty' ? TYPES.map((t) => ({ type: t, open: 0, review: 0, breach: 0, oldest: 0 })) : queueByType(ui.scope);
  const tot = sum(q, (r) => r.open);
  const seg = (n, c) => (n > 0 ? `<i style="flex:${n} 1 0;background:rgb(var(--${c}))"></i>` : '');
  const body = `<ul class="m-0 list-none divide-y divide-line p-0">${q.map((r) => `<li><button class="block w-full px-3.5 py-2.5 text-start hover:bg-hover" data-act="go" data-route="orders" data-p="${esc(JSON.stringify({ tab: 'open', type: r.type, chan: ui.scope === 'b2c' ? 'storefront' : ui.scope === 'b2b' ? 'b2b' : '' }))}" aria-label="${r.type}: ${r.open} open, ${r.review} need review, ${r.breach} past SLA. Open the queue"><div class="flex items-center gap-2">${typeTag(r.type)}<span class="text-sm font-medium tabular-nums">${r.open} open</span><span class="flex-1"></span>${r.breach ? badge('b-crit', 'clock', r.breach + ' late') : ''}${r.review ? badge('b-serious', 'alert', r.review + ' review') : ''}</div><div class="qbar mt-2" role="presentation">${seg(r.open - r.review - r.breach, 'neutral-dot')}${seg(r.review, 'serious-dot')}${seg(r.breach, 'crit-dot')}</div><p class="mt-1 text-xs text-ink3">${r.open ? 'Oldest ' + ageText(r.oldest) : 'Queue is empty'}</p></button></li>`).join('')}</ul>`;
  return panel({ title: 'Open queue by type', sub: tot + ' orders waiting. Bars split on time, review and late.', flush: true, body });
}
function supplierPanel() {
  const rows = ui.mode === 'empty' ? [] : S.suppliers;
  const body = rows.length
    ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">Supplier health</caption><thead><tr><th scope="col">Supplier</th><th scope="col">Status</th><th scope="col" class="num hidden sm:table-cell">1h success</th><th scope="col" class="num hidden md:table-cell">p50</th><th scope="col" class="num">Prepaid</th></tr></thead><tbody>${rows.map((sp) => { const mt = supMetrics(sp.id); const last = sp.hist[sp.hist.length - 1]; return `<tr class="row" data-act="go" data-route="suppliers" data-p="${esc(JSON.stringify({ sel: sp.id }))}"><td><span class="font-medium">${esc(sp.name)}</span></td><td>${supBadge(sp)}</td><td class="num hidden sm:table-cell">${pct(last.ok, 0)}</td><td class="num hidden md:table-cell">${last.ms ? msText(last.ms) : '–'}</td><td class="num ${mt.low ? 'font-medium text-warn-fg' : ''}">${mt.low ? icon('alert', 'ic-xs mr-1 inline') : ''}${money0(mt.balance)}</td></tr>`; }).join('')}</tbody></table></div>`
    : emptyBlock({ ic: 'server', title: 'No suppliers connected', body: 'Add a supplier API to route orders. Dhru Fusion 6.1 and REST suppliers are supported.', cta: `<button class="btn">${icon('plus', 'ic-sm')}Add supplier</button>` });
  return panel({ title: 'Supplier health', sub: 'Last hour', flush: true, body });
}
const SCOPE_LABEL = { all: 'all channels', b2b: 'merchants', b2c: 'the storefront' };
function chartSpan() {
  let rng = ui.chartRange, note = '';
  if (rng === '12M' && ui.scope === 'b2c') { rng = '30D'; note = 'The storefront has no yearly history yet, so this shows 30 days.'; }
  let rows;
  if (rng === '12M') {
    rows = monthly().map((r) => ({ ...r }));
    if (ui.scope === 'all') { const last = rows[rows.length - 1]; for (const r of daily(30, 'b2c')) for (const x of SERIES) last[x.key] += r[x.key]; note = 'Storefront orders from the last 30 days are included in the latest month.'; }
  } else rows = daily(rng === '7D' ? 7 : 30, ui.scope);
  if (ui.mode === 'empty') rows = rows.map((r) => ({ ...r, IMEI: 0, Server: 0, Remote: 0, File: 0 }));
  return { rng, rows, note };
}
function chartPanel() {
  const { rng, rows, note } = chartSpan();
  const totalAll = sum(rows, (r) => sum(SERIES, (s) => r[s.key]));
  CH.set('orders-type', (el, w) => drawStacked(el, w, { rows, series: SERIES, h: 236 }));
  const right = `<div class="flex flex-wrap items-center gap-2">${segEl([['7D', '7D'], ['30D', '30D'], ['12M', '12M']], ui.chartRange, 'chart-range', '', 'Date range')}${segEl([['chart', 'Chart'], ['table', 'Table']], ui.chartView, 'chart-view', '', 'View')}</div>`;
  const body = totalAll === 0 && ui.mode === 'empty'
    ? emptyBlock({ ic: 'layers', title: 'No orders in this range', body: 'Order volume by service type shows up here once orders arrive.' })
    : `<div id="chart-frame" class="transition-opacity">${ui.chartView === 'chart' ? `<div class="mb-2">${stackLegend(rows)}</div>${chartBox('orders-type', 236, `Stacked bar chart of orders per ${rng === '12M' ? 'month' : 'day'} by service type, ${rng}, for ${SCOPE_LABEL[ui.scope]}. ${totalAll} orders in total. Use the Table view for exact numbers.`)}` : seriesTable(rows)}</div>`;
  return panel({ title: 'Orders by type', sub: `${num(totalAll)} orders from ${SCOPE_LABEL[ui.scope]}, ${rng === '12M' ? 'monthly (older months are synthetic)' : 'per day'}${note ? '. ' + note : ''}`, right, body });
}
function channelPanel() {
  const days = ui.chartRange === '7D' ? 7 : 30;
  const rows = dailyRevenue(days).map((r) => (ui.mode === 'empty' ? { ...r, B2B: 0, B2C: 0 } : r));
  const ser = [{ key: 'B2B', label: 'Merchants', c: 's1' }, { key: 'B2C', label: 'Storefront', c: 's2' }];
  CH.set('rev-channel', (el, w) => drawStacked(el, w, { rows, series: ser, h: 200, fmt: money0, yFmt: (v) => '$' + compact(v), unit: 'in revenue' }));
  const tot = ser.map((x) => [x, sum(rows, (r) => r[x.key])]), all = tot[0][1] + tot[1][1];
  const legend = tot.map(([x, t]) => `<span class="inline-flex items-center gap-1.5 text-xs text-ink2"><span class="h-2 w-2 rounded-sm" style="background:rgb(var(--${x.c}))"></span>${x.label} <span class="font-medium tabular-nums text-ink">${money0(t)}</span></span>`).join('');
  const body = all === 0
    ? emptyBlock({ ic: 'wallet', title: 'No completed orders in this range', body: 'Revenue from merchants and from the storefront shows up here as orders complete.' })
    : `<div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">${legend}<span class="text-xs text-ink3">Storefront share ${pct((tot[1][1] / all) * 100)}</span></div>${chartBox('rev-channel', 200, `Stacked bar chart of daily completed revenue, merchants against the storefront, last ${days} days. ${money0(tot[0][1])} from merchants and ${money0(tot[1][1])} from the storefront.`)}`;
  return panel({ title: 'Revenue by channel', sub: `Completed orders, last ${days} days, before VAT`, body });
}
function storefrontPanel() {
  const t0 = Date.now() - 30 * DAY, empty = ui.mode === 'empty';
  const os = empty ? [] : S.orders.filter((o) => isB2C(o) && o.created >= t0);
  const checks = empty ? 0 : S.imeiChecks.filter((c) => c.ts >= t0).length, aband = empty ? 0 : S.checkouts.filter((c) => c.created >= t0).length;
  const done = os.filter((o) => o.status === 'completed').length;
  const steps = [['Visitors (estimated)', Math.round(checks * 5.6)], ['Checked an IMEI', checks], ['Started checkout', os.length + aband], ['Paid', os.length], ['Delivered', done]];
  const max = steps[0][1] || 1;
  const funnel = `<ol class="m-0 list-none space-y-2.5 p-0" aria-label="Storefront funnel, last 30 days">${steps.map(([l, n], i) => `<li><div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"><span class="text-ink2">${l}</span><span class="tabular-nums"><strong class="font-semibold">${num(n)}</strong>${i && steps[i - 1][1] ? ` <span class="text-xs text-ink3">${pct((n / steps[i - 1][1]) * 100)} of the step before</span>` : ''}</span></div><div class="meter mt-1 w-full"><i style="width:${n ? Math.max(1.5, (n / max) * 100) : 0}%;background:rgb(var(--s2))"></i></div></li>`).join('')}</ol>`;
  const paid = os.filter((o) => o.status !== 'rejected'), ss = supportStats();
  const refunded = sum(S.refunds.filter((r) => r.status === 'completed' && r.created >= t0), (r) => r.amount), sales = sum(paid, (o) => o.gross);
  const kpi = (l, v, tip) => `<div class="min-w-0"><dt class="text-xs text-ink3">${l}</dt><dd class="mt-0.5 text-lg font-semibold tabular-nums">${v}</dd>${tip ? `<p class="text-2xs text-ink3">${tip}</p>` : ''}</div>`;
  const kpis = `<dl class="m-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3.5 sm:grid-cols-3">${kpi('Average order', empty || !paid.length ? '–' : money(sales / paid.length), 'Paid, with VAT')}${kpi('Refund rate', empty || !sales ? '–' : pct((refunded / sales) * 100), 'Of money taken')}${kpi('Dispute rate', empty || !os.length ? '–' : pct((S.disputes.filter((d) => d.opened >= t0).length / os.length) * 100, 2), 'Disputes per order')}${kpi('First reply', empty || !ss.firstReply ? '–' : dur(ss.firstReply), 'Median, support')}${kpi('Satisfaction', empty || !ss.csatN ? '–' : ss.csat.toFixed(1) + ' / 5', ss.csatN + ' ratings')}${kpi('Held for review', empty ? '–' : heldOrders().length, 'Waiting for a person')}</dl>`;
  const body = !empty && !os.length && !checks
    ? emptyBlock({ ic: 'store', title: 'No storefront activity yet', body: 'Visits, IMEI checks and orders from the public site appear here.', cta: `<button class="btn" data-act="sim-sf-order">${icon('plus', 'ic-sm')}Simulate a storefront order</button>` })
    : funnel + kpis;
  return panel({ title: 'Storefront funnel', sub: 'Last 30 days. Visitor numbers are estimated from IMEI checks.', body });
}
function topCustomersPanel() {
  const days = ui.period, t0 = Date.now() - days * DAY;
  const rows = ui.mode === 'empty' ? [] : S.customers.map((c) => { const os = custOrders(c.id).filter((o) => o.created >= t0 && o.status !== 'rejected'); return { c, n: os.length, spend: sum(os, (o) => o.gross) }; }).filter((r) => r.n).sort((a, b) => b.spend - a.spend).slice(0, 5);
  const body = rows.length
    ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">Top customers by spend</caption><thead><tr><th scope="col">Customer</th><th scope="col" class="num">Orders</th><th scope="col" class="num">Spend</th></tr></thead><tbody>${rows.map((r) => `<tr class="row" data-act="go" data-route="customers" data-p="${esc(JSON.stringify({ id: r.c.id }))}"><td><span class="font-medium">${esc(r.c.name)}</span> <span class="mono text-2xs text-ink3">${r.c.country}</span></td><td class="num">${r.n}</td><td class="num">${money0(r.spend)}</td></tr>`).join('')}</tbody></table></div>`
    : emptyBlock({ ic: 'user', title: 'No customer orders yet', body: 'Your best storefront customers appear here.' });
  return panel({ title: 'Top customers', sub: `Storefront, by spend, last ${days === 1 ? '24 hours' : days + ' days'}`, flush: true, body });
}
function topMerchantsPanel() {
  const days = ui.period;
  const rows = ui.mode === 'empty' ? [] : S.merchants.filter((m) => m.status !== 'pending').map((m) => ({ m, ...merStats(m.id, days) })).filter((r) => r.orders).sort((a, b) => b.spend - a.spend).slice(0, 6);
  const body = rows.length
    ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">Top merchants by spend</caption><thead><tr><th scope="col">Merchant</th><th scope="col" class="num">Orders</th><th scope="col" class="num">Spend</th><th scope="col" class="num hidden sm:table-cell">Wallet</th></tr></thead><tbody>${rows.map((r) => `<tr class="row" data-act="go" data-route="merchants" data-p="${esc(JSON.stringify({ id: r.m.id }))}"><td><span class="font-medium">${esc(r.m.name)}</span> <span class="mono text-ink3">${r.m.cc}</span></td><td class="num">${r.orders}</td><td class="num">${money0(r.spend)}</td><td class="num hidden sm:table-cell ${walletOf(r.m.id) < 0 ? 'text-crit-fg' : ''}">${money0(walletOf(r.m.id))}</td></tr>`).join('')}</tbody></table></div>`
    : emptyBlock({ ic: 'users', title: 'No merchant activity yet', body: 'Your highest-spending merchants appear here.' });
  return panel({ title: 'Top merchants', sub: `By spend, last ${days === 1 ? '24 hours' : days + ' days'}`, flush: true, body });
}
function pageDashboard() {
  const g = modeGate('Dashboard', 'dashboard');
  if (g) return g;
  const now = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(Date.now());
  const scope = segEl([['all', 'All'], ['b2b', 'Merchants'], ['b2c', 'Storefront']], ui.scope, 'dash-scope', '', 'Channel');
  const head = pageHead({ title: 'Dashboard', sub: `${now}. Showing ${SCOPE_LABEL[ui.scope]}. Figures cover orders created in the selected period.`, actions: `<div class="flex flex-wrap items-center gap-2">${scope}${segEl([[1, '24h'], [7, '7D'], [14, '14D']], ui.period, 'period', '', 'Period')}</div>` });
  const sc = ui.scope;
  return `${head}${statStrip()}
  <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
    <div class="min-w-0 space-y-4">${attentionPanel()}${chartPanel()}${sc === 'all' ? channelPanel() : ''}${sc !== 'b2b' ? storefrontPanel() : ''}</div>
    <div class="min-w-0 space-y-4">${queuePanel()}${supplierPanel()}${sc !== 'b2c' ? topMerchantsPanel() : ''}${sc !== 'b2b' ? topCustomersPanel() : ''}</div>
  </div>`;
}
actions['dash-scope'] = (el) => { ui.scope = el.dataset.v; render(); };
actions['attn-more'] = () => { ui.attnAll = !ui.attnAll; render(); const b = $('[data-act="attn-more"]'); b && b.focus(); };
actions.period = (el) => { ui.period = +el.dataset.v; render(); };
actions['chart-range'] = (el) => { ui.chartRange = el.dataset.v; const f = $('#chart-frame'); if (f) f.style.opacity = '.45'; setTimeout(render, 140); };
actions['chart-view'] = (el) => { ui.chartView = el.dataset.v; render(); };
actions['sim-order'] = () => { ui.mode = 'normal'; const o = simulateOrder(); toast({ kind: 'info', title: o.id + ' received', body: 'The dashboard is back to normal data.' }); };
