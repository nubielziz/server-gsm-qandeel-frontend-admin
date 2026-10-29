/* Services & pricing: catalog table, price resolver, rules */
ui.services.tab = 'services';
const floorOf = (s) => round(s.cost + s.minProfit, 2);
const marginOf = (s) => ((s.price - s.cost) / s.price) * 100;
function svcRows() {
  const st = ui.services;
  const q = norm(st.q);
  return D(S.services).filter((s) => (!st.type || s.type === st.type) && (st.flag !== 'floor' || s.price < floorOf(s) - 0.004) && (st.flag !== 'disabled' || s.status === 'disabled') && (!q || norm(s.name + s.code + s.category).includes(q)));
}
const switchEl = (on, act, id, label) => `<button type="button" role="switch" class="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}" data-id="${id}"></button>`;
function pageServices() {
  const g = modeGate('Services & pricing', 'table');
  if (g) return g;
  const st = ui.services;
  const all = D(S.services);
  const below = all.filter((s) => s.status === 'active' && s.price < floorOf(s) - 0.004).length;
  const tabs = [['services', 'Services', all.length], ['resolver', 'Price resolver'], ['rules', 'Rules and groups']];
  let body = '';
  if (st.tab === 'services') body = servicesTab(all);
  else if (st.tab === 'resolver') body = resolverTab();
  else body = rulesTab();
  const head = pageHead({ title: 'Services & pricing', sub: below ? `<span class="font-medium text-serious-fg">${below} ${below === 1 ? 'service is' : 'services are'} priced below cost plus minimum profit.</span> Orders are charged the floor price until you update it.` : 'Every active service is priced above its floor.', actions: `<button class="btn" data-act="svc-sync">${icon('refresh', 'ic-sm')}Sync supplier costs</button>` });
  return `${head}<div class="panel">${tabsEl(tabs, st.tab, 'services', 'Pricing sections').replace('class="tabs"', 'class="tabs px-2"')}${body}</div>`;
}
function servicesTab(all) {
  const st = ui.services;
  const rows = svcRows();
  const filtersOn = st.q || st.type || st.flag;
  const cols = [
    { key: 'name', label: 'Service', val: (s) => s.name, render: (s) => `<span class="block max-w-[300px] truncate font-medium ${s.status === 'disabled' ? 'text-ink3' : ''}">${esc(s.name)}</span><span class="mono text-xs text-ink3">${s.code}</span>` },
    { key: 'type', label: 'Type', hide: 'md', val: (s) => TYPES.indexOf(s.type), render: (s) => typeTag(s.type) },
    { key: 'sup', label: 'Supplier', hide: 'xl', val: (s) => sup(s.sup).name, render: (s) => `${esc(sup(s.sup).name)}${s.fb ? `<p class="text-xs text-ink3">Fallback ${esc(sup(s.fb).name)}</p>` : '<p class="text-xs text-ink3">No fallback</p>'}` },
    { key: 'cost', label: 'Cost', num: true, val: (s) => s.cost, render: (s) => `${s.costWas ? `<span class="text-warn-fg" title="Supplier changed this from ${money(s.costWas)}">${icon('arrowUp', 'ic-xs inline')}</span> ` : ''}${money(s.cost)}` },
    { key: 'price', label: 'Price', num: true, val: (s) => s.price, render: (s) => { const bad = s.price < floorOf(s) - 0.004; return `<button type="button" class="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-hover ${bad ? 'font-medium text-crit-fg' : ''}" data-act="svc-edit" data-id="${s.id}" aria-label="Edit price of ${esc(s.name)}, now ${money(s.price)}">${bad ? icon('alert', 'ic-xs') : ''}${money(s.price)}${icon('edit', 'ic-xs text-ink3')}</button>${bad ? `<p class="text-xs text-crit-fg">Floor ${money(floorOf(s))}</p>` : ''}`; } },
    { key: 'margin', label: 'Margin', num: true, hide: 'sm', val: (s) => marginOf(s), render: (s) => `<span class="${marginOf(s) < 5 ? 'font-medium text-warn-fg' : ''}">${pct(marginOf(s), 1)}</span>` },
    { key: 'sla', label: 'SLA', num: true, hide: 'lg', val: (s) => s.sla, render: (s) => ageText(s.sla * MIN) },
    { key: 'auto', label: 'Auto', hide: 'md', render: (s) => switchEl(s.auto, 'svc-auto', s.id, 'Automation for ' + s.name) },
    { key: 'on', label: 'Enabled', render: (s) => switchEl(s.status === 'active', 'svc-on', s.id, 'Enable ' + s.name) },
    { key: 'more', label: '', cls: 'w-10', render: (s) => `<button class="btn btn-ghost btn-icon btn-sm" data-act="svc-menu" data-id="${s.id}" aria-label="Actions for ${esc(s.name)}" aria-haspopup="menu">${icon('more', 'ic-sm')}</button>` },
  ];
  const empty = all.length === 0
    ? emptyBlock({ ic: 'tag', title: 'No services yet', body: 'Import services from a connected supplier, then set your prices. Each service gets a cost, a floor and a margin.', cta: `<button class="btn btn-primary">${icon('download', 'ic-sm')}Import from supplier</button>` })
    : emptyBlock({ ic: 'filter', title: 'No services match', body: 'Try another search or remove a filter.', cta: `<button class="btn" data-act="svc-clear">Clear filters</button>` });
  const chip = (flag, label, ic) => `<button type="button" class="chip !h-8 !px-2.5 font-sans !text-sm ${st.flag === flag ? '!border-ink !bg-ink !text-surface' : 'hover:border-ink3'}" aria-pressed="${st.flag === flag}" data-act="svc-flag" data-v="${flag}">${icon(ic, 'ic-sm')}${label}</button>`;
  return `<div class="flex flex-wrap items-center gap-2 p-3">${searchEl('s-q', st.q, 'Search service, code, category')}${selectEl('s-type', st.type, [['', 'All types'], ...TYPES.map((t) => [t, t])], 'Filter by type', 'data-bind="s-type"')}${chip('floor', 'Below floor', 'alert')}${chip('disabled', 'Disabled', 'ban')}${filtersOn ? '<button class="btn btn-ghost btn-sm" data-act="svc-clear">Clear filters</button>' : ''}<span class="flex-1"></span><span class="text-xs text-ink3" aria-live="polite">${rows.length} ${rows.length === 1 ? 'service' : 'services'}</span></div><div class="border-t border-line">${table({ id: 'services', st, cols, rows, rowId: (s) => s.id, empty, caption: 'Services' })}</div>`;
}
binds['s-q'] = (el) => { ui.services.q = el.value; ui.services.page = 1; render(); };
binds['s-type'] = (el) => { ui.services.type = el.value; ui.services.page = 1; render(); };
actions['svc-clear'] = () => { Object.assign(ui.services, { q: '', type: '', flag: '', page: 1 }); render(); };
actions['svc-flag'] = (el) => { ui.services.flag = ui.services.flag === el.dataset.v ? '' : el.dataset.v; ui.services.page = 1; render(); };
actions['svc-on'] = (el) => { const s = svc(el.dataset.id); const on = s.status !== 'active'; setServiceField(s.id, 'status', on ? 'active' : 'disabled'); toast({ kind: 'success', title: s.name + (on ? ' enabled' : ' disabled'), body: on ? 'Merchants can order it again.' : 'Merchants no longer see it. Open orders continue.', ttl: 3200 }); };
actions['svc-auto'] = (el) => { const s = svc(el.dataset.id); setServiceField(s.id, 'auto', !s.auto); toast({ kind: 'info', title: 'Automation ' + (s.auto ? 'on' : 'off') + ' for ' + s.name, body: s.auto ? 'Orders go to the supplier automatically.' : 'New orders wait for an operator to dispatch them.', ttl: 3200 }); };
actions['svc-menu'] = (el) => { const s = svc(el.dataset.id); openMenu(el, [{ label: 'Edit price…', icon: 'edit', run: () => editPrice(s.id) }, { label: 'Trace a merchant price', icon: 'scale', run: () => { ui.services.rs = s.id; ui.services.tab = 'resolver'; render(); } }, { label: 'See orders', icon: 'orders', run: () => { go('orders', { tab: 'all' }); ui.orders.q = s.name; render(); } }], { width: 220 }); };
actions['svc-sync'] = async (el) => {
  el.disabled = true; el.innerHTML = icon('loader', 'ic-sm animate-spin') + 'Checking suppliers…';
  await sleep(1400);
  const live = S.suppliers.filter((s) => s.enabled && s.status !== 'down');
  logAudit('System', 'synced supplier costs', 'supplier', 'all', live.length + ' suppliers', []);
  changed();
  const bad = belowFloor().length;
  toast({ kind: bad ? 'info' : 'success', title: live.length + ' suppliers checked', body: bad ? 'No new cost changes. ' + bad + ' service is still below its floor.' : 'No cost changes.' });
};
function editPrice(id) {
  const s = svc(id);
  const floor = floorOf(s);
  modal({
    title: 'Edit price', sub: esc(s.name) + ' <span class="mono text-ink3">' + s.code + '</span>', confirm: 'Save price',
    body: `<div class="space-y-3"><dl class="dl !grid-cols-[130px_1fr]"><dt>Supplier cost</dt><dd class="tabular-nums">${money(s.cost)}${s.costWas ? ` <span class="text-warn-fg">(was ${money(s.costWas)})</span>` : ''}</dd><dt>Minimum profit</dt><dd class="tabular-nums">${money(s.minProfit)}</dd><dt>Floor</dt><dd class="font-medium tabular-nums">${money(floor)}</dd></dl>${field('Base price (USD)', `<input class="input" name="price" inputmode="decimal" autofocus value="${s.price.toFixed(2)}" aria-describedby="price-preview">`)}<p id="price-preview" class="rounded-md bg-sunken p-2.5 text-sm" aria-live="polite"></p></div>`,
    onSubmit: (f) => {
      const r = setPrice(s.id, f.price.value);
      if (r.error) { f.price.setAttribute('aria-invalid', 'true'); return r.error; }
      toast({ kind: 'success', title: 'Price updated', body: s.name + ' is now ' + money(s.price) + '. New orders use it.' });
      return true;
    },
  });
  const f = $('#dlg form'), prev = $('#price-preview');
  const upd = () => { const v = parseFloat(f.price.value); if (!isFinite(v) || v <= 0) { prev.textContent = 'Enter a price.'; return; } const m = v - s.cost; prev.innerHTML = `Profit ${money(m)} per order, margin ${pct((m / v) * 100, 1)}. ${v < floor ? `<span class="font-medium text-crit-fg">Below the floor of ${money(floor)}.</span>` : '<span class="text-good-fg font-medium">Above the floor.</span>'}`; };
  f.price.addEventListener('input', () => { f.price.removeAttribute('aria-invalid'); upd(); }); upd(); f.price.select();
}
actions['svc-edit'] = (el) => editPrice(el.dataset.id);

/* ----- resolver ----- */
function resolverTab() {
  const st = ui.services;
  const ms = S.merchants.filter((m) => m.status !== 'pending');
  if (!ms.length || !S.services.length) return emptyBlock({ ic: 'scale', title: 'Nothing to resolve yet', body: 'Add a merchant and a service to see how a price is built.' });
  const m = mer(st.rm) || ms[0], s = svc(st.rs) || S.services[0];
  const q = resolveWith(S, m, s);
  const stepIcon = { win: ['checkCircle', 'text-good-fg', 'Used'], apply: ['checkCircle', 'text-good-fg', 'Applied'], skip: ['ban', 'text-ink3', 'Skipped'], none: ['more', 'text-ink3', 'Not set'] };
  const valueOf = (x) => {
    if (x.state === 'skip') return x.id === 'base' ? `<span class="font-normal text-ink3 line-through">${money(x.value)}</span>` : '';
    if (x.id === 'category') return x.value ? (x.value > 0 ? '+' : '\u2212') + pct(Math.abs(x.value) * 100, 0) : '';
    if (x.id === 'discount') return x.value ? '\u2212' + pct(x.value * 100, 0) : '';
    return x.value != null ? money(x.value) : '';
  };
  /* the steps that decided the price carry the tint; skipped and unset steps recede */
  const steps = q.steps.map((x, i) => {
    const [ic, cls, word] = stepIcon[x.state];
    const live = x.state === 'win' || x.state === 'apply', dim = !live;
    const showAfter = x.after != null && !dim && (typeof x.value !== 'number' || Math.abs(x.value - x.after) > 0.004);
    return `<li class="flex items-start gap-3 px-3.5 py-2.5 ${live ? 'bg-sunken' : ''}"><span class="mono mt-0.5 w-4 flex-none text-ink3">${i + 1}</span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2"><span class="text-sm ${live ? 'font-semibold' : 'font-medium text-ink3'}">${x.label}</span><span class="inline-flex items-center gap-1 text-xs ${cls}">${icon(ic, 'ic-xs')}${word}</span></div><p class="text-xs text-ink3">${esc(x.note)}</p></div><div class="text-end tabular-nums"><p class="text-sm ${live ? 'font-semibold' : 'font-medium'}">${valueOf(x)}</p>${showAfter ? `<p class="text-xs text-ink3">= ${money(x.after)}</p>` : ''}</div></li>`;
  }).join('');
  const floorRow = `<li class="flex items-start gap-3 px-3.5 py-2.5"><span class="mono mt-0.5 w-4 flex-none text-ink3">6</span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2"><span class="text-sm font-medium">Floor check</span>${q.clamped ? badge('b-warn', 'alert', 'Raised to floor') : badge('b-good', 'check', 'Above floor')}</div><p class="text-xs text-ink3">Cost ${money(s.cost)} plus minimum profit ${money(s.minProfit)} = ${money(q.floor)}. The price can never go lower.</p></div><div class="text-end tabular-nums"><p class="text-sm font-medium">${money(q.floor)}</p>${q.clamped ? `<p class="text-xs text-ink3">${money(q.raw)} → ${money(q.price)}</p>` : ''}</div></li>`;
  const bySt = GROUPS.map((g) => { const fake = { ...m, group: g.id, id: '__none' }; const r = resolveWith(S, fake, s); return { g, r }; });
  const controls = `<div class="grid gap-3 border-b border-line p-3.5 sm:grid-cols-2" id="resolver">${field('Merchant', selectEl('rm', m.id, ms.map((x) => [x.id, x.name + ' (' + GROUPS.find((g) => g.id === x.group).name + ')']), 'Merchant', 'data-bind="rm"', 'w-full'))}${field('Service', selectEl('rs', s.id, S.services.map((x) => [x.id, x.name]), 'Service', 'data-bind="rs"', 'w-full'))}</div>`;
  return `${controls}<div class="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div class="border-b border-line xl:border-b-0 xl:border-e"><p class="px-3.5 pt-3 text-xs text-ink3">First match wins: a client override, then a group service price. Otherwise the base price takes the category rule and then the group discount.</p><ol class="m-0 mt-2 list-none divide-y divide-line border-t border-line p-0">${steps}${floorRow}</ol></div>
  <div class="p-3.5"><p class="text-xs text-ink3">${esc(m.name)} pays</p><p class="mt-1 text-3xl font-semibold tabular-nums tracking-tight">${money(q.price)}</p><p class="mt-1 text-sm text-ink2">Profit <span class="font-medium tabular-nums">${money(q.margin)}</span> per order, ${pct((q.margin / q.price) * 100, 1)} margin. Source: <strong class="font-medium">${{ base: 'base price', group: 'group price', client: 'client override' }[q.source]}</strong>.</p>
  <h3 class="mb-2 mt-5 text-xs font-medium text-ink3">Same service, other groups</h3><table class="w-full text-sm"><tbody class="divide-y divide-line">${bySt.map(({ g, r }) => `<tr><td class="py-1.5 ${g.id === m.group ? 'font-medium' : 'text-ink2'}">${g.name}${g.id === m.group ? ' <span class="text-xs text-ink3">(this merchant)</span>' : ''}</td><td class="py-1.5 text-end tabular-nums">${money(r.price)}${r.clamped ? ` <span class="text-xs text-warn-fg">floor</span>` : ''}</td></tr>`).join('')}</tbody></table><p class="mt-2 text-xs text-ink3">Group rows ignore this merchant’s personal override.</p></div></div>`;
}
binds.rm = (el) => { ui.services.rm = el.value; render(); };
binds.rs = (el) => { ui.services.rs = el.value; render(); };

/* ----- rules ----- */
function rulesTab() {
  const groups = GROUPS.map((g) => `<tr><td class="font-medium">${g.name}</td><td class="num">${g.discount ? '-' + pct(g.discount * 100, 0) : 'None'}</td><td class="num">${S.merchants.filter((m) => m.group === g.id).length}</td></tr>`).join('');
  const cat = Object.entries(S.categoryRules);
  const catRow = cat.length ? cat.map(([c, a]) => `<tr><td class="font-medium">${c}</td><td class="num">${a > 0 ? '+' : ''}${pct(a * 100, 0)}</td><td class="text-end"><button class="btn btn-sm" data-act="cat-off" data-c="${c}">Turn off</button></td></tr>`).join('') : `<tr><td class="text-ink3" colspan="2">No category rules. Carrier unlock prices use the base price.</td><td class="text-end"><button class="btn btn-sm" data-act="cat-on">Add promo: Carrier unlock -2%</button></td></tr>`;
  const fixed = [...Object.entries(S.groupPrices).map(([k, v]) => ({ scope: 'Group ' + GROUPS.find((g) => g.id === k.split('|')[0]).name, code: k.split('|')[1], v })), ...Object.entries(S.clientPrices).map(([k, v]) => ({ scope: mer(k.split('|')[0]).name, mid: k.split('|')[0], code: k.split('|')[1], v }))];
  return `<div class="grid gap-0 divide-y divide-line">
  <div><div class="panel-h !border-b-0"><div class="flex-1"><h2 class="panel-t">Price groups</h2><p class="panel-s">Discount applied to base prices</p></div></div><table class="tbl"><thead><tr><th scope="col">Group</th><th scope="col" class="num">Discount</th><th scope="col" class="num">Merchants</th></tr></thead><tbody>${groups}</tbody></table></div>
  <div><div class="panel-h !border-b-0"><div class="flex-1"><h2 class="panel-t">Category rules</h2><p class="panel-s">Applied before the group discount. Changes affect new orders only.</p></div></div><table class="tbl"><thead><tr><th scope="col">Category</th><th scope="col" class="num">Adjustment</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>${catRow}</tbody></table></div>
  <div><div class="panel-h !border-b-0"><div class="flex-1"><h2 class="panel-t">Fixed prices</h2><p class="panel-s">Group service prices and client overrides. These skip every other rule.</p></div></div><table class="tbl"><thead><tr><th scope="col">Applies to</th><th scope="col">Service</th><th scope="col" class="num">Price</th></tr></thead><tbody>${fixed.map((r) => `<tr><td>${r.mid ? `<a class="link" href="#/merchants/${r.mid}">${esc(r.scope)}</a>` : esc(r.scope)}</td><td>${esc(S.services.find((s) => s.code === r.code).name)}</td><td class="num font-medium">${money(r.v)}</td></tr>`).join('')}</tbody></table></div>
  <div class="p-3.5 text-sm text-ink2"><h2 class="panel-t mb-1">Floor policy</h2><p>No price can go below <strong class="font-medium">supplier cost plus minimum profit</strong>. Minimum profit defaults to 6% of cost, at least $0.02. When a supplier raises a cost, orders are charged the new floor until you update the price.</p></div></div>`;
}
actions['cat-off'] = (el) => { delete S.categoryRules[el.dataset.c]; logAudit(ME, 'removed category rule', 'service', 'rule', el.dataset.c, [{ field: 'adjustment', from: '-2%', to: 'none' }]); changed(); toast({ kind: 'success', title: 'Rule removed', body: 'New orders use the base price.' }); };
actions['cat-on'] = () => { S.categoryRules['Carrier unlock'] = -0.02; logAudit(ME, 'added category rule', 'service', 'rule', 'Carrier unlock', [{ field: 'adjustment', from: 'none', to: '-2%' }]); changed(); toast({ kind: 'success', title: 'Promo added', body: 'Carrier unlocks are 2% cheaper on new orders.' }); };
