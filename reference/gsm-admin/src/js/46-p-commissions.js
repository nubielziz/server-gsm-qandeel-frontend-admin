/* Commissions: accruals to approve, agents, plans */
ui.ca = { sort: 'created', dir: -1, page: 1, sel: ui.commissions.sel };
const caBadge = (s) => (s === 'accrued' ? badge('b-warn', 'clock', 'Accrued') : badge('b-good', 'checkCircle', 'Approved'));
const planOf = (m) => S.plans.find((p) => p.id === m.plan);
const agents = () => S.merchants.filter((m) => m.isAgent);

function comStrip() {
  const ac = D(accrued());
  const appr = D(S.accruals).filter((a) => a.status === 'approved' && Date.now() - a.approvedAt < 30 * DAY);
  const rev30 = sum(S.orders.filter((o) => o.status === 'completed' && !isB2C(o) && Date.now() - o.doneAt < 30 * DAY), (o) => o.price);
  const comm30 = sum(D(S.accruals).filter((a) => Date.now() - a.created < 30 * DAY), (a) => a.amount);
  const cells = [
    ['Ready to approve', money(sum(ac, (a) => a.amount)), ac.length + ' accruals, ' + new Set(ac.map((a) => a.agent)).size + ' agents', ac.length ? 'text-warn-fg' : ''],
    ['Approved, 30 days', money(sum(appr, (a) => a.amount)), appr.length + ' accruals paid into wallets'],
    ['Earned, 30 days', money(comm30), 'Approved plus waiting'],
    ['Share of revenue', rev30 ? pct((comm30 / rev30) * 100, 1) : '0%', 'Commission as % of 30-day merchant revenue'],
  ];
  return `<div class="panel mb-4 grid grid-cols-2 md:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line md:[&>*:nth-child(n+2)]:border-s md:[&>*:nth-child(n+2)]:border-line">${cells.map(([l, v, s, c]) => `<div class="p-3.5"><p class="text-xs text-ink3">${l}</p><p class="mt-1 text-lg font-semibold tabular-nums tracking-tight ${c || ''}">${v}</p><p class="mt-0.5 truncate text-xs text-ink3">${s}</p></div>`).join('')}</div>`;
}

function pageCommissions() {
  const g = modeGate('Commissions', 'table');
  if (g) return g;
  const st = ui.commissions;
  const n = D(accrued()).length;
  const tabs = [['accruals', 'Accruals', n || null], ['agents', 'Agents'], ['plans', 'Plans']];
  const body = { accruals: accrualsTab, agents: agentsTab, plans: plansTab }[st.tab]();
  const sub = n ? `<span class="font-medium text-warn-fg">${n} accruals are ready to approve.</span> Approving pays the agent into their wallet and posts it to the ledger.` : 'Nothing is waiting. Approved commissions are already in the agents’ wallets.';
  return `${pageHead({ title: 'Commissions', sub })}${comStrip()}<div class="panel">${tabsEl(tabs, st.tab, 'commissions', 'Commission sections').replace('class="tabs"', 'class="tabs px-2"')}${body}</div>`;
}

/* ----- accruals ----- */
function accrualRows() {
  const st = ui.commissions;
  return D(S.accruals).filter((a) => (st.status === 'all' || a.status === st.status) && (!st.agent || a.agent === st.agent));
}
function accrualsTab() {
  const st = ui.commissions;
  const rows = accrualRows();
  const sel = st.status === 'accrued';
  const cols = [
    { key: 'created', label: 'Earned', val: (a) => a.created, render: (a) => `<span class="whitespace-nowrap text-ink2">${ago(a.created)}</span>` },
    { key: 'id', label: 'Accrual', hide: 'md', val: (a) => a.id, render: (a) => `<span class="mono">${a.id}</span>` },
    { key: 'agent', label: 'Agent', val: (a) => mer(a.agent).name, render: (a) => `<span class="font-medium">${esc(mer(a.agent).name)}</span>` },
    { key: 'mid', label: 'Referred merchant', hide: 'sm', val: (a) => mer(a.mid).name, render: (a) => esc(mer(a.mid).name) },
    { key: 'order', label: 'Order', hide: 'lg', render: (a) => `<button class="link mono" data-act="order-open" data-id="${a.orderId}">${a.orderId}</button>` },
    { key: 'base', label: 'Order revenue', num: true, hide: 'md', val: (a) => a.base, render: (a) => money(a.base) },
    { key: 'rate', label: 'Rate', num: true, hide: 'md', val: (a) => a.rate, render: (a) => pct(a.rate * 100, 0) },
    { key: 'amount', label: 'Commission', num: true, val: (a) => a.amount, render: (a) => `<span class="font-medium">${money(a.amount)}</span>` },
    { key: 'status', label: 'Status', val: (a) => a.status, render: (a) => caBadge(a.status) },
  ];
  const all = D(S.accruals);
  const cnt = (s) => all.filter((a) => a.status === s).length;
  const seg = `<div class="seg" role="group" aria-label="Accrual status">${[['accrued', 'Ready', cnt('accrued')], ['approved', 'Approved', cnt('approved')], ['all', 'All', all.length]].map(([v, l, c]) => `<button type="button" aria-pressed="${st.status === v}" data-act="ca-status" data-v="${v}">${l} <span class="tabular-nums text-ink3">${num(c)}</span></button>`).join('')}</div>`;
  const ids = [...st.sel].filter((id) => { const a = S.accruals.find((x) => x.id === id); return a && a.status === 'accrued'; });
  const selRows = S.accruals.filter((a) => ids.includes(a.id));
  const bar = ids.length ? `<div class="flex flex-wrap items-center gap-2 border-t border-line bg-accent-soft px-3.5 py-2" role="region" aria-label="Bulk actions"><span class="text-sm font-medium text-accent-ink">${ids.length} selected</span><span class="text-xs text-ink2">${money(sum(selRows, (a) => a.amount))} to ${new Set(selRows.map((a) => a.agent)).size} ${new Set(selRows.map((a) => a.agent)).size === 1 ? 'agent' : 'agents'}</span><span class="flex-1"></span><button class="btn btn-sm" data-act="ca-clear">Clear</button><button class="btn btn-sm btn-primary" data-act="ca-approve">${icon('check', 'ic-sm')}Approve ${ids.length}</button></div>` : '';
  const empty = st.status === 'accrued' && all.length ? emptyBlock({ ic: 'checkCircle', title: 'All caught up', body: 'No commissions are waiting. New accruals appear when a referred merchant’s order completes.', cta: '<button class="btn" data-act="ca-status" data-v="approved">See approved</button>' }) : emptyBlock({ ic: 'percent', title: 'No commissions yet', body: 'When a merchant referred by an agent completes an order, the agent earns a commission here.' });
  const agentSel = selectEl('ca-agent', st.agent, [['', 'All agents'], ...agents().map((m) => [m.id, m.name])], 'Filter by agent', 'data-bind="ca-agent"');
  const selAll = sel && accrualRows().length > 0 ? `<button class="btn btn-ghost btn-sm" data-act="ca-select-all">Select all ${num(accrualRows().length)}</button>` : '';
  return `<div class="flex flex-wrap items-center gap-2 p-3">${seg}${agentSel}${selAll}<span class="flex-1"></span><span class="hidden text-xs text-ink3 md:inline">Normally approved after 7 days to cover refunds. You can approve earlier.</span></div>${bar}<div class="border-t border-line">${table({ id: 'ca', st: ui.ca, cols, rows, rowId: (a) => a.id, selectable: sel, empty, caption: 'Commission accruals' })}</div>`;
}
actions['ca-status'] = (el) => { ui.commissions.status = el.dataset.v; ui.ca.page = 1; ui.commissions.sel.clear(); render(); };
binds['ca-agent'] = (el) => { ui.commissions.agent = el.value; ui.ca.page = 1; ui.commissions.sel.clear(); render(); };
actions['ca-clear'] = () => { ui.commissions.sel.clear(); render(); };
actions['ca-select-all'] = () => { accrualRows().forEach((a) => ui.commissions.sel.add(a.id)); render(); };
actions['ca-approve'] = () => {
  const st = ui.commissions;
  const list = S.accruals.filter((a) => st.sel.has(a.id) && a.status === 'accrued');
  if (!list.length) return;
  const by = new Map();
  list.forEach((a) => by.set(a.agent, (by.get(a.agent) || 0) + a.amount));
  const lines = [...by].sort((a, b) => b[1] - a[1]).map(([id, v]) => `<li class="flex justify-between gap-3"><span>${esc(mer(id).name)}</span><span class="tabular-nums font-medium">${money(v)}</span></li>`).join('');
  const total = sum(list, (a) => a.amount);
  modal({ title: 'Approve ' + list.length + (list.length === 1 ? ' commission' : ' commissions'), sub: money(total) + ' will be paid into agent wallets', confirm: 'Approve ' + money(total),
    body: `<ul class="m-0 list-none divide-y divide-line rounded-md border border-line p-0 text-sm [&>li]:px-3 [&>li]:py-2">${lines}</ul><p class="mt-3 text-sm text-ink2">Each agent’s wallet is credited now and Commission expense is debited. This can’t be undone. A mistake is fixed with a reversing wallet adjustment.</p>`,
    onSubmit: () => { const r = approveAccruals(list.map((a) => a.id)); st.sel.clear(); render(); toast({ kind: 'success', title: r.count + ' commissions approved', body: money(r.total) + ' credited to ' + by.size + (by.size === 1 ? ' agent wallet.' : ' agent wallets.') }); return true; } });
};

/* ----- agents ----- */
function agentsTab() {
  const rows = D(agents()).map((m) => {
    const refs = S.merchants.filter((x) => x.referredBy === m.id);
    const acc = S.accruals.filter((a) => a.agent === m.id);
    const pending = sum(acc.filter((a) => a.status === 'accrued'), (a) => a.amount);
    const paid = sum(acc.filter((a) => a.status === 'approved'), (a) => a.amount);
    const rev = sum(S.orders.filter((o) => refs.some((r) => r.id === o.mid) && o.status === 'completed' && Date.now() - o.doneAt < 30 * DAY), (o) => o.price);
    return { m, plan: planOf(m), refs, pending, paid, rev };
  });
  const cols = [
    { key: 'name', label: 'Agent', val: (r) => r.m.name, render: (r) => `<a class="link font-medium" href="#/merchants/${r.m.id}">${esc(r.m.name)}</a><p class="text-xs text-ink3">${esc(r.m.city)}, ${r.m.cc}</p>` },
    { key: 'plan', label: 'Plan', val: (r) => r.plan.rate, render: (r) => `${esc(r.plan.name)} <span class="text-ink3">${pct(r.plan.rate * 100, 0)}</span>` },
    { key: 'refs', label: 'Referred', num: true, hide: 'sm', val: (r) => r.refs.length, render: (r) => r.refs.length + '<p class="max-w-[200px] truncate text-xs text-ink3">' + esc(r.refs.map((x) => x.name).join(', ')) + '</p>' },
    { key: 'rev', label: 'Their revenue, 30 d', num: true, hide: 'md', val: (r) => r.rev, render: (r) => money0(r.rev) },
    { key: 'pending', label: 'Ready to approve', num: true, val: (r) => r.pending, render: (r) => (r.pending ? `<button class="link tabular-nums" data-act="ca-agent-go" data-id="${r.m.id}">${money(r.pending)}</button>` : '<span class="text-ink3">—</span>') },
    { key: 'paid', label: 'Approved, all time', num: true, hide: 'lg', val: (r) => r.paid, render: (r) => money(r.paid) },
  ];
  return `<div class="border-t border-line">${table({ id: 'ca-agents', st: ui.cag, cols, rows, rowId: (r) => r.m.id, pageSize: 0, empty: emptyBlock({ ic: 'users', title: 'No agents yet', body: 'Put a merchant on a commission plan and set “referred by” on the merchants they bring in.' }), caption: 'Agents' })}</div>`;
}
ui.cag = { sort: 'pending', dir: -1, page: 1 };
actions['ca-agent-go'] = (el) => { Object.assign(ui.commissions, { tab: 'accruals', status: 'accrued', agent: el.dataset.id }); ui.commissions.sel.clear(); ui.ca.page = 1; render(); };

/* ----- plans ----- */
function plansTab() {
  const rows = D(S.plans);
  const cols = [
    { key: 'name', label: 'Plan', render: (p) => `<span class="font-medium">${esc(p.name)}</span><p class="text-xs text-ink3">${esc(p.note)}</p>` },
    { key: 'rate', label: 'Rate', num: true, render: (p) => pct(p.rate * 100, 1) },
    { key: 'basis', label: 'Paid on', hide: 'md', render: (p) => esc(p.basis) },
    { key: 'min', label: 'Minimum payout', num: true, hide: 'lg', render: (p) => money0(p.minPayout) },
    { key: 'agents', label: 'Agents', num: true, render: (p) => S.merchants.filter((m) => m.plan === p.id).length },
    { key: 'edit', label: '', cls: 'w-24', render: (p) => `<button class="btn btn-sm" data-act="plan-edit" data-id="${p.id}" aria-label="Edit ${esc(p.name)} plan">Edit rate…</button>` },
  ];
  return `<div class="border-t border-line">${table({ id: 'ca-plans', st: ui.cpl, cols, rows, rowId: (p) => p.id, sortable: false, pageSize: 0, empty: emptyBlock({ ic: 'percent', title: 'No plans', body: 'Create a plan to start paying referral commissions.' }), caption: 'Commission plans' })}</div><p class="border-t border-line p-3.5 text-xs text-ink3">A rate change applies to orders completed after you save it. Accruals already earned keep the rate they were earned at.</p>`;
}
ui.cpl = { sort: '', dir: 1, page: 1 };
actions['plan-edit'] = (el) => {
  const p = S.plans.find((x) => x.id === el.dataset.id);
  modal({ title: 'Edit ' + p.name + ' plan', sub: 'Currently ' + pct(p.rate * 100, 1) + ' of order revenue', confirm: 'Save rate',
    body: `<div class="space-y-3">${field('Rate (% of order revenue)', `<input class="input" name="rate" inputmode="decimal" autofocus value="${(p.rate * 100).toFixed(1)}" aria-describedby="rate-hint">`, 'Between 0.5 and 15. Applies to orders completed from now on.')}</div>`,
    onSubmit: (f) => { const v = parseFloat(f.rate.value); if (!isFinite(v) || v < 0.5 || v > 15) { f.rate.setAttribute('aria-invalid', 'true'); return 'Enter a rate between 0.5 and 15.'; } const was = p.rate; p.rate = round(v / 100, 4); logAudit(ME, 'changed rate of', 'plan', p.id, p.name + ' plan', [{ field: 'rate', from: pct(was * 100, 1), to: pct(p.rate * 100, 1) }]); changed(); toast({ kind: 'success', title: p.name + ' plan is now ' + pct(p.rate * 100, 1), body: 'New completed orders earn this rate.' }); return true; } });
};
