/* Risk and checks: paid orders held for a person, free IMEI lookups, the blocklist and the rules behind both. */
ui.rkI = { sort: 'ts', dir: -1, page: 1, sel: new Set() };
ui.rkB = { sort: 'ts', dir: -1, page: 1, sel: new Set() };

const CHECK_KIND = { blacklist: 'Blacklist', basic: 'Device info', icloud: 'iCloud status', sim_lock: 'SIM lock' };
const CHECK_RESULT = { clean: ['b-good', 'checkCircle', 'Clean'], blacklisted: ['b-crit', 'xCircle', 'Blacklisted'], locked: ['b-warn', 'lock', 'Locked'], unknown: ['b-neutral', 'info', 'Unknown'] };
const CHECK_SRC = { pre_order: 'Before an order', storefront_free: 'Free checker' };
const BLOCK_KIND = { email: 'Email', domain: 'Email domain', imei: 'IMEI', card: 'Card', country: 'Country' };
const BLOCK_SRC = { manual: 'Added by hand', auto: 'Automatic', chargeback: 'After a chargeback' };

/* ---------- review queue ---------- */
function heldCard(o) {
  const c = cus(o.cid), cs = custStats(c), rl = RISK_LABEL[c.risk], s = svc(o.sid), wait = Date.now() - o.created;
  return `<article class="panel" aria-label="Held order ${o.id}"><div class="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-line p-3.5">
      <div class="min-w-0 flex-1"><p class="flex flex-wrap items-center gap-2">${orderLink(o.id)}<span class="font-medium">${esc(s.name)}</span></p><p class="mt-0.5 text-sm text-ink2">${lm(o.gross, o.cur)}${o.cur !== 'USD' ? ' (' + money(o.gross) + ')' : ''} by ${B2C_METHODS[o.pay.method].label.toLowerCase()} · ${esc(o.device)} · <span class="mono">${fmtImei(o.input)}</span></p></div>
      <div class="text-end"><p class="text-xs text-ink3">Risk score</p>${scoreMeter(o.risk.score)}<p class="mt-0.5 text-xs ${wait > 3 * HOUR ? 'font-medium text-crit-fg' : 'text-ink3'}">Paid ${ago(o.created)}${wait > 3 * HOUR ? ', the customer is waiting' : ''}</p></div></div>
    <div class="grid gap-4 p-3.5 md:grid-cols-2"><div><h3 class="mb-1.5 text-xs font-medium text-ink3">Why it was held</h3><ul class="m-0 list-none space-y-1 p-0">${o.risk.signals.map((x) => `<li class="flex items-start gap-2 text-sm">${icon('alert', 'ic-sm mt-0.5 flex-none text-warn-fg')}${esc(x)}</li>`).join('') || '<li class="text-sm text-ink3">No single signal, the combined score was high.</li>'}</ul></div>
      <div><h3 class="mb-1.5 text-xs font-medium text-ink3">Who is buying</h3>${kv([['Customer', custLink(c.id) + ' ' + badge(rl[0], null, rl[1] + ' risk')], ['Email', esc(maskEmail(c.email))], ['Country', B2C_COUNTRIES[o.country].name], ['History', cs.orders > 1 ? `${cs.orders - 1} earlier ${cs.orders === 2 ? 'order' : 'orders'}, ${cs.refunds} refunds, ${cs.disputes} disputes` : 'First order']])}</div></div>
    <div class="flex flex-wrap items-center gap-2 border-t border-line bg-sunken px-3.5 py-2.5 rounded-b-lg"><button class="btn btn-primary" data-act="rk-approve" data-id="${o.id}">${icon('check', 'ic-sm')}Approve and send</button><button class="btn btn-danger" data-act="rk-refund" data-id="${o.id}" data-block="1">${icon('ban', 'ic-sm')}Refund and block</button><button class="btn" data-act="rk-refund" data-id="${o.id}" data-block="0">${icon('undo', 'ic-sm')}Refund only</button><span class="flex-1"></span><span class="text-xs text-ink3">The supplier has not been contacted.</span></div></article>`;
}
function tabQueue() {
  const held = D(heldOrders()), decided = D(S.orders).filter((o) => isB2C(o) && o.risk.reviewedAt).sort((a, b) => b.risk.reviewedAt - a.risk.reviewedAt);
  const d30 = decided.filter((o) => Date.now() - o.risk.reviewedAt < 30 * DAY);
  const oldest = held.length ? Math.min(...held.map((o) => o.created)) : null;
  const strip = statGrid([
    { label: 'Held now', value: held.length, cls: held.length ? 'text-warn-fg' : '', sub: held.length ? money0(sum(held, (o) => o.gross)) + ' captured, nothing sent' : 'Queue is clear' },
    { label: 'Longest wait', value: oldest ? ageText(Date.now() - oldest) : '–', cls: oldest && Date.now() - oldest > 3 * HOUR ? 'text-crit-fg' : '', sub: 'Customers are told it can take up to an hour' },
    { label: 'Decided, 30 days', value: d30.length, sub: d30.filter((o) => o.risk.outcome === 'approved').length + ' approved · ' + d30.filter((o) => o.risk.outcome === 'refunded').length + ' refunded' },
    { label: 'Held of all orders', value: pct((S.orders.filter((o) => isB2C(o) && o.risk.decision === 'review').length / Math.max(1, S.orders.filter(isB2C).length)) * 100), sub: 'Aim for under 10%', tip: 'Every held order delays a real customer. If this climbs, lower the number of rules that add points or raise the hold threshold.' },
  ], 'Risk queue figures');
  const recent = decided.slice(0, 6);
  const list = held.length ? `<div class="grid gap-4">${held.sort((a, b) => a.created - b.created).map(heldCard).join('')}</div>` : panel({ body: emptyBlock({ ic: 'shield', title: 'Nothing is being held', body: 'Orders with a high risk score wait here for a person. Right now every paid order went straight through.', cta: `<button class="btn" data-act="sim-sf-order">${icon('plus', 'ic-sm')}Simulate a storefront order</button>` }), flush: true });
  const hist = recent.length ? panel({ title: 'Decided recently', body: `<ul class="m-0 list-none divide-y divide-line p-0">${recent.map((o) => `<li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-sm"><span class="w-20 flex-none">${orderLink(o.id)}</span><span class="min-w-0 flex-1 truncate text-ink2">${esc(cus(o.cid).name)} · ${lm(o.gross, o.cur)}</span>${scoreMeter(o.risk.score)}${badge(o.risk.outcome === 'approved' ? 'b-good' : 'b-neutral', o.risk.outcome === 'approved' ? 'checkCircle' : 'undo', o.risk.outcome === 'approved' ? 'Approved' : 'Refunded')}<span class="w-24 flex-none text-end text-xs text-ink3">${esc(o.risk.reviewedBy)}, ${ago(o.risk.reviewedAt)}</span></li>`).join('')}</ul>`, flush: true, cls: 'mt-4' }) : '';
  return `${strip}${list}${hist}`;
}
actions['rk-approve'] = (el) => { const o = ord(el.dataset.id); approveHeld(o.id); toast({ kind: 'success', title: o.id + ' approved', body: 'Sent to ' + sup(o.sup).name + '. The customer gets the result by email.', ttl: 3200 }); };
actions['rk-refund'] = (el) => {
  const o = ord(el.dataset.id), block = el.dataset.block === '1', c = cus(o.cid);
  closeDrawer();
  confirmDlg({ title: (block ? 'Refund and block ' : 'Refund ') + o.id + '?', body: `<p>${lm(o.gross, o.cur)} goes back to ${esc(c.name)}’s ${o.pay.method === 'crypto' ? 'wallet by hand (crypto can’t be reversed automatically)' : 'card'}. The supplier is never contacted.</p>${block ? `<p class="mt-2">${esc(c.name)} is blocked: their email can’t place another order.</p>` : '<p class="mt-2">They can still order again later.</p>'}`, confirm: block ? 'Refund and block' : 'Refund', kind: 'danger', run: () => { refundAndBlock(o.id, block); toast({ kind: 'info', title: o.id + ' refunded', body: block ? c.name + ' is blocked.' : 'The customer was told by email.', ttl: 3000 }); } });
};

/* ---------- IMEI checks ---------- */
function checkRows() {
  const st = ui.risk, q = st.q.replace(/\s/g, '').toLowerCase();
  return D(S.imeiChecks).filter((c) => (!st.kind || c.kind === st.kind) && (!q || c.imei.includes(q) || c.model.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q)));
}
function tabChecks() {
  const all = D(S.imeiChecks), rows = checkRows(), st = ui.risk;
  const conv = all.filter((c) => c.converted);
  const bl = all.filter((c) => c.status === 'blacklisted');
  const strip = statGrid([
    { label: 'Checks, 30 days', value: num(all.length), sub: 'Free checker and pre-order checks' },
    { label: 'Became an order', value: all.length ? pct((conv.length / all.length) * 100) : '–', sub: conv.length + ' orders started from a check', tip: 'The free checker costs cents and brings buyers. Customers who see "eligible" go on to buy.' },
    { label: 'Blacklisted found', value: bl.length, sub: all.length ? pct((bl.length / all.length) * 100) + ' of checks · saved from a bad sale' : '', tip: 'These people were told before paying that nothing can unlock their phone. No order, no refund, no support ticket.' },
    { label: 'Lookup cost', value: money(sum(all, (c) => c.cost)), sub: 'Paid supplier lookups only' },
  ], 'IMEI check figures');
  const cols = [
    { key: 'imei', label: 'IMEI', val: (c) => c.imei, render: (c) => `<span class="mono">${fmtImei(c.imei)}</span>` },
    { key: 'device', label: 'Device', hide: 'sm', val: (c) => c.model, render: (c) => `<span class="text-ink2">${esc(c.brand)} ${esc(c.model)}</span>` },
    { key: 'kind', label: 'Check', hide: 'md', val: (c) => c.kind, render: (c) => typeTag(CHECK_KIND[c.kind]) },
    { key: 'status', label: 'Result', val: (c) => c.status, render: (c) => badge(...CHECK_RESULT[c.status]) },
    { key: 'src', label: 'From', hide: 'lg', render: (c) => `<span class="text-ink2">${CHECK_SRC[c.source]}</span>` },
    { key: 'cc', label: 'Country', hide: 'xl', render: (c) => `<span class="text-ink2">${c.country}</span>` },
    { key: 'conv', label: 'Order', hide: 'md', render: (c) => (c.converted ? orderLink(c.converted) : '<span class="text-ink3">–</span>') },
    { key: 'ts', label: 'When', val: (c) => c.ts, render: (c) => `<span class="text-ink2">${ago(c.ts)}</span>` },
  ];
  const toolbar = tblToolbar(`${searchEl('rk-q', st.q, 'Search IMEI or model')}${selectEl('rk-kind', st.kind, [['', 'All checks'], ...Object.entries(CHECK_KIND)], 'Filter by check type', 'data-bind="rk-kind"')}`, `${num(rows.length)} ${rows.length === 1 ? 'check' : 'checks'}`);
  return `${strip}<div class="panel">${toolbar}<div class="border-t border-line">${table({ id: 'rk-checks', st: ui.rkI, cols, rows, rowId: (c) => c.id, pageSize: 15, caption: 'IMEI checks', empty: emptyBlock({ ic: 'search', title: 'No checks found', body: all.length ? 'Try another search or check type.' : 'Checks from the public IMEI checker appear here.' }) })}</div></div>`;
}
binds['rk-q'] = (el) => { ui.risk.q = el.value; ui.rkI.page = 1; render(); };
binds['rk-kind'] = (el) => { ui.risk.kind = el.value; ui.rkI.page = 1; render(); };

/* ---------- blocklist ---------- */
function tabBlock() {
  const rows = D(S.risk.block);
  const cols = [
    { key: 'kind', label: 'Type', val: (b) => b.kind, render: (b) => typeTag(BLOCK_KIND[b.kind]) },
    { key: 'display', label: 'Blocked', val: (b) => b.display, render: (b) => `<span class="mono">${esc(b.display)}</span><p class="text-2xs text-ink3">${esc(b.reason)}</p>` },
    { key: 'src', label: 'How', hide: 'md', render: (b) => `<span class="text-ink2">${BLOCK_SRC[b.source]}</span>` },
    { key: 'by', label: 'By', hide: 'lg', render: (b) => `<span class="text-ink2">${esc(b.by)}</span>` },
    { key: 'ts', label: 'Added', hide: 'sm', val: (b) => b.ts, render: (b) => `<span class="text-ink2">${ago(b.ts)}</span>` },
    { key: 'a', label: '', render: (b) => `<button class="btn btn-sm" data-act="bl-remove" data-id="${b.id}">Remove</button>` },
  ];
  return panel({ title: 'Blocklist', sub: 'Anyone or anything on this list cannot place an order. Chargebacks add entries automatically. Network addresses live under Admins and access.', right: `<button class="btn btn-primary btn-sm" data-act="bl-add">${icon('plus', 'ic-sm')}Add</button>`, body: table({ id: 'rk-block', st: ui.rkB, cols, rows, rowId: (b) => b.id, caption: 'Blocklist', empty: emptyBlock({ ic: 'ban', title: 'Nothing is blocked', body: 'Add an email, domain, card or IMEI that should never be able to buy.', cta: `<button class="btn btn-primary" data-act="bl-add">${icon('plus', 'ic-sm')}Add to blocklist</button>` }) }), flush: true });
}
actions['bl-add'] = () => modal({
  title: 'Add to blocklist', sub: 'The order is refused at checkout and the customer sees a neutral message.',
  body: `<div class="space-y-3">${field('What to block', selectEl('kind', 'email', Object.entries(BLOCK_KIND).filter((k) => k[0] !== 'country'), 'Type', '', 'w-full'))}${field('Value', '<input class="input mono" name="v" type="text" placeholder="name@example.com" autocomplete="off" spellcheck="false">', 'An email, a domain like example.com, a 15-digit IMEI or a card fingerprint. IP addresses are blocked under Admins and access.')}${field('Reason', '<input class="input" name="why" type="text" placeholder="Card testing, stolen device…" autocomplete="off">', 'Only your team sees this.')}</div>`,
  confirm: 'Block',
  onSubmit: (f) => {
    const v = f.v.value.trim(), why = f.why.value.trim();
    if (!v) { f.v.setAttribute('aria-invalid', 'true'); return 'Enter what to block.'; }
    if (f.kind.value === 'imei' && !/^\d{15}$/.test(v.replace(/\s/g, ''))) { f.v.setAttribute('aria-invalid', 'true'); return 'An IMEI has 15 digits.'; }
    if (!why) { f.why.setAttribute('aria-invalid', 'true'); return 'Add a short reason so the next person knows why.'; }
    const b = addBlock(f.kind.value, f.kind.value === 'imei' ? fmtImei(v.replace(/\s/g, '')) : v, why);
    if (!b) { f.v.setAttribute('aria-invalid', 'true'); return 'That is already on the blocklist.'; }
    toast({ kind: 'success', title: 'Added to the blocklist', body: BLOCK_KIND[b.kind] + ' ' + b.display, ttl: 2800 });
    return true;
  },
});
actions['bl-remove'] = (el) => { const b = S.risk.block.find((x) => x.id === el.dataset.id); confirmDlg({ title: 'Remove from the blocklist?', body: `<p><span class="mono">${esc(b.display)}</span> will be able to order again.</p>`, confirm: 'Remove', run: () => { removeBlock(b.id); toast({ kind: 'info', title: 'Removed', ttl: 2200 }); } }); };

/* ---------- rules ---------- */
function tabRules() {
  const rows = S.risk.rules.map((r) => `<li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3"><div class="min-w-0 flex-1 basis-64"><p class="text-sm font-medium">${esc(r.label)}${r.id === 'rr6' ? ' <span class="tag">Same as Settings</span>' : ''}</p><p class="text-xs text-ink3">${esc(r.hint)}</p></div>${r.value != null ? `<label class="flex items-center gap-2 text-sm"><span class="sr-only">Value for ${esc(r.label)}</span><input class="input w-20 text-end tabular-nums" type="text" inputmode="numeric" value="${r.value}" data-bind="rk-val" data-id="${r.id}" ${r.on ? '' : 'disabled'} autocomplete="off"><span class="text-ink3">${esc(r.unit)}</span></label>` : ''}${switchEl(r.on, 'rk-rule', r.id, (r.on ? 'Turn off: ' : 'Turn on: ') + r.label)}</li>`).join('');
  const hold = riskRule('rr2'), blk = riskRule('rr3');
  return `<div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">${panel({ title: 'Rules', sub: 'Each signal adds points to an order. Under the hold line it goes straight through, above it a person decides, above the block line it is refused.', body: `<ul class="m-0 list-none divide-y divide-line p-0">${rows}</ul>`, flush: true })}
    ${panel({ title: 'How scoring works', body: `<div class="space-y-3 p-3.5 text-sm text-ink2"><div class="flex h-2 overflow-hidden rounded-full" aria-hidden="true"><i class="bg-good-dot" style="width:${hold.value}%"></i><i class="bg-warn-dot" style="width:${Math.max(0, blk.value - hold.value)}%"></i><i class="bg-crit-dot" style="width:${Math.max(0, 100 - blk.value)}%"></i></div>
      <ul class="m-0 list-none space-y-1.5 p-0"><li><span class="font-medium text-good-fg">0 to ${hold.value - 1}</span> goes straight to the supplier.</li><li><span class="font-medium text-warn-fg">${hold.value} to ${blk.value - 1}</span> is held for a person.</li><li><span class="font-medium text-crit-fg">${blk.value} and up</span> is refused before the customer pays.</li></ul>
      <p class="text-xs text-ink3">Typical signals: a new customer with a large first order (+18), a disposable mailbox (+22), a card from another country than the IP (+25), an email tied to a past chargeback (+40).</p></div>`, flush: true })}</div>`;
}
actions['rk-rule'] = (el) => { const r = riskRule(el.dataset.id); setRule(r.id, { on: !r.on }); toast({ kind: 'success', title: r.on ? 'Rule on' : 'Rule off', body: r.label, ttl: 2400 }); };
binds['rk-val'] = (el, e) => {
  if (e && e.type !== 'change') return;
  const r = riskRule(el.dataset.id), v = parseInt(el.value, 10);
  if (!(v >= 0)) { toast({ kind: 'error', title: 'Enter a number', ttl: 2200 }); render(); return; }
  if (r.id === 'rr2' && v >= riskRule('rr3').value) { toast({ kind: 'error', title: 'The hold line must be below the block line', body: 'Block starts at ' + riskRule('rr3').value + '.', ttl: 3200 }); render(); return; }
  if (r.id === 'rr3' && v <= riskRule('rr2').value) { toast({ kind: 'error', title: 'The block line must be above the hold line', body: 'Hold starts at ' + riskRule('rr2').value + '.', ttl: 3200 }); render(); return; }
  if (v !== r.value) setRule(r.id, { value: v });
};

function pageRisk() {
  const g = modeGate('Risk & checks', 'table');
  if (g) return g;
  const tab = ui.risk.tab;
  const tabs = tabsEl([['queue', 'Review queue', D(heldOrders()).length || null], ['checks', 'IMEI checks'], ['block', 'Blocklist', D(S.risk.block).length], ['rules', 'Rules']], tab, 'risk', 'Risk sections');
  const body = { queue: tabQueue, checks: tabChecks, block: tabBlock, rules: tabRules }[tab]();
  return `${pageHead({ title: 'Risk & checks', sub: 'Storefront customers pay first, so fraud shows up as chargebacks. These checks stop most of it before a supplier is paid.' })}<div class="mb-4">${tabs}</div>${body}`;
}
