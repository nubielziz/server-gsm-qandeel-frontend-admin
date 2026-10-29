/* Orders: queue tabs, filters, bulk actions, detail drawer */
ui.orders.chan = ''; ui.orders.tab = 'open'; ui.orders.sort = 'sla'; ui.orders.dir = -1; ui.orders.cursor = null; ui.orders.reply = {};
const STATUS_RANK = { review: 0, processing: 1, queued: 2, completed: 3, rejected: 4 };
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
function ordersFiltered(withTab = true) {
  const st = ui.orders;
  const q = norm(st.q);
  return D(S.orders).filter((o) => {
    if (withTab) {
      if (st.tab === 'open' && !isOpen(o)) return false;
      if (st.tab !== 'all' && st.tab !== 'open' && o.status !== st.tab) return false;
    }
    if (st.type && svc(o.sid).type !== st.type) return false;
    if (st.sup && o.sup !== st.sup) return false;
    if (st.mer && o.mid !== st.mer) return false;
    if (st.chan === 'b2b' && isB2C(o)) return false;
    if (st.chan === 'storefront' && !isB2C(o)) return false;
    if (st.flag === 'sla' && !isBreach(o)) return false;
    if (q && !norm([o.id, o.input, o.ref, buyerOf(o).name, svc(o.sid).name].join(' ')).includes(q)) return false;
    return true;
  });
}
function slaCell(o) {
  if (!isOpen(o)) return `<span class="tabular-nums text-ink3" title="Created to ${o.status === 'completed' ? 'completed' : 'rejected'}">${dur(Math.max(0, o.doneAt - o.created))}</span>`;
  const sla = slaMs(o), age = Date.now() - o.created, ratio = age / sla;
  const late = o.status !== 'review' && ratio >= 1;
  const cls = late ? 'text-crit-fg' : ratio >= 0.7 && o.status !== 'review' ? 'text-warn-fg' : 'text-ink2';
  const bar = late ? 'rgb(var(--crit-dot))' : ratio >= 0.7 ? 'rgb(var(--warn-dot))' : 'rgb(var(--neutral-dot))';
  if (o.status === 'review') return `<div class="min-w-[96px] whitespace-nowrap"><p class="tabular-nums text-ink2">${ageText(age)}</p><p class="text-2xs text-ink3">waiting for review</p></div>`;
  /* a full red bar on every late row says nothing the text does not, so only partial progress gets a bar */
  if (late) return `<div class="min-w-[112px] whitespace-nowrap"><p class="tabular-nums font-medium text-crit-fg">${icon('clock', 'ic-xs mr-1 inline')}${ageText(age)}</p><p class="text-2xs text-crit-fg">Late by ${ageText(age - sla)}</p></div>`;
  return `<div class="flex min-w-[112px] items-center gap-2 whitespace-nowrap"><div class="min-w-0"><p class="tabular-nums ${cls}">${ageText(age)}</p><div class="meter mt-1 w-14" role="presentation"><i style="width:${Math.min(100, ratio * 100)}%;background:${bar}"></i></div></div><span class="text-2xs text-ink3">of ${ageText(sla)}</span></div>`;
}
const SINGLE_STATUS_TABS = ['review', 'queued', 'processing', 'completed', 'rejected'];
function orderCols() {
  const cols = [
    { key: 'id', label: 'Order', val: (o) => o.created, render: (o) => `<button type="button" class="link mono font-medium" data-act="order-open" data-id="${o.id}">${o.id}</button><p class="text-2xs text-ink3">${ago(o.created)}</p>` },
    { key: 'merchant', label: 'Buyer', val: (o) => buyerOf(o).name, render: buyerCell },
    { key: 'service', label: 'Service / input', val: (o) => svc(o.sid).name, render: (o) => `<span class="block max-w-[260px]"><span class="flex items-center gap-1.5">${typeTag(svc(o.sid).type)}<span class="truncate">${esc(svc(o.sid).name)}</span>${o.qty > 1 ? `<span class="text-xs text-ink3">×${o.qty}</span>` : ''}</span><span class="mono block truncate text-2xs text-ink3">${esc(fmtImei(o.input))}</span></span>` },
    ...(SINGLE_STATUS_TABS.includes(ui.orders.tab) ? [] : [{ key: 'status', label: 'Status', val: (o) => STATUS_RANK[o.status], render: (o) => orderBadge(o.status) }]), // the tab already names the status
  ];
  if (ui.orders.tab === 'review') cols.push({ key: 'reason', label: 'Why it stopped', render: (o) => `<span class="block min-w-[220px] max-w-[300px] text-xs leading-4 text-ink2">${esc(o.reason || '')}</span>` });
  cols.push(
    { key: 'supplier', label: 'Supplier', hide: 'xl', val: (o) => sup(o.sup).name, render: (o) => `<span class="block max-w-[120px] truncate text-ink2">${esc(sup(o.sup).name)}</span>${sup(o.sup).status !== 'up' ? `<span class="text-2xs text-serious-fg">${sup(o.sup).status}</span>` : ''}` },
    { key: 'sla', label: 'SLA', val: (o) => (isOpen(o) ? 10 + (Date.now() - o.created) / slaMs(o) : (o.doneAt || 0) / 1e15), render: slaCell },
    { key: 'price', label: 'Price', num: true, val: (o) => o.price, render: (o) => money(o.price) + (isB2C(o) ? `<p class="text-2xs text-ink3">paid ${lm(o.gross, o.cur)}</p>` : '') },
    { key: 'profit', label: 'Profit', num: true, hide: 'md', val: (o) => orderProfit(o), render: (o) => `<span class="${orderProfit(o) < 0 ? 'text-crit-fg' : ''}">${money(orderProfit(o))}</span>` },
    { key: 'more', label: '', cls: 'w-10', render: (o) => `<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="order-menu" data-id="${o.id}" aria-label="Actions for ${o.id}" aria-haspopup="menu">${icon('more', 'ic-sm')}</button>` },
  );
  return cols;
}
function bulkBar() {
  const st = ui.orders;
  const sel = [...st.sel].map(ord).filter(Boolean);
  if (!sel.length) return '';
  const el = sel.filter(isOpen);
  return `<div class="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2" role="region" aria-label="Bulk actions"><span class="text-sm font-medium text-accent-ink">${sel.length} selected</span><span class="text-xs text-ink2">${el.length === sel.length ? money(sum(el, (o) => o.price)) + ' at stake' : el.length + ' can be changed, ' + (sel.length - el.length) + ' already closed'}</span><span class="flex-1"></span><button class="btn btn-sm" data-act="bulk-complete" ${el.length ? '' : 'disabled'}>${icon('check', 'ic-sm')}Complete…</button><button class="btn btn-sm" data-act="bulk-retry" ${el.length ? '' : 'disabled'}>${icon('refresh', 'ic-sm')}Retry</button><button class="btn btn-sm" data-act="bulk-reroute" ${el.length ? '' : 'disabled'} aria-haspopup="menu">${icon('server', 'ic-sm')}Reroute${icon('chevD', 'ic-xs')}</button><button class="btn btn-sm btn-danger" data-act="bulk-reject" ${el.length ? '' : 'disabled'}>${icon('ban', 'ic-sm')}Reject…</button><button class="btn btn-sm btn-ghost" data-act="bulk-clear">Clear</button></div>`;
}
function pageOrders() {
  const g = modeGate('Orders', 'table');
  if (g) return g;
  const st = ui.orders;
  const all = D(S.orders);
  const cnt = (f) => all.filter(f).length;
  const tabs = [['open', 'Open', cnt(isOpen)], ['review', 'Needs review', cnt((o) => o.status === 'review')], ['queued', 'Queued', cnt((o) => o.status === 'queued')], ['processing', 'Processing', cnt((o) => o.status === 'processing')], ['completed', 'Completed', cnt((o) => o.status === 'completed')], ['rejected', 'Rejected', cnt((o) => o.status === 'rejected')], ['all', 'All', all.length]];
  const rows = ordersFiltered();
  st.visible = rows.map((o) => o.id);
  const filtersOn = st.q || st.type || st.sup || st.mer || st.flag || st.chan;
  const merchOpts = [['', 'All merchants'], ...S.merchants.filter((m) => m.status !== 'pending').map((m) => [m.id, m.name])];
  const toolbar = `<div class="flex flex-wrap items-center gap-2 p-3">${searchEl('o-q', st.q, 'Search ID, IMEI, buyer, reference')}${selectEl('o-type', st.type, [['', 'All types'], ...TYPES.map((t) => [t, t])], 'Filter by type', 'data-bind="o-type"')}${selectEl('o-sup', st.sup, [['', 'All suppliers'], ...S.suppliers.map((s) => [s.id, s.name])], 'Filter by supplier', 'data-bind="o-sup"')}${selectEl('o-chan', st.chan, [['', 'All channels'], ['b2b', 'Merchants (API and portal)'], ['storefront', 'Storefront']], 'Filter by channel', 'data-bind="o-chan"')}${selectEl('o-mer', st.mer, merchOpts, 'Filter by merchant', 'data-bind="o-mer"', 'hidden md:inline-flex')}<button type="button" class="chip !h-8 !px-2.5 font-sans !text-sm ${st.flag === 'sla' ? '!border-crit-dot !bg-crit-bg !text-crit-fg' : 'hover:border-ink3'}" aria-pressed="${st.flag === 'sla'}" data-act="flag-sla">${icon('clock', 'ic-sm')}Past SLA</button>${filtersOn ? `<button class="btn btn-ghost btn-sm" data-act="orders-clear">Clear filters</button>` : ''}<span class="flex-1"></span><span class="text-xs text-ink3" aria-live="polite">${num(rows.length)} ${rows.length === 1 ? 'order' : 'orders'}</span></div>`;
  const emptyTrue = all.length === 0;
  const empty = emptyTrue
    ? emptyBlock({ ic: 'orders', title: 'No orders yet', body: 'Orders placed by merchants through the Dhru-compatible API or the portal land here and are routed to suppliers automatically. Only the ones that need a person stay in this queue.', cta: `<button class="btn btn-primary" data-act="sim-order">${icon('plus', 'ic-sm')}Simulate an order</button>` })
    : filtersOn
      ? emptyBlock({ ic: 'filter', title: 'No orders match these filters', body: 'Try a different search or remove a filter.', cta: `<button class="btn" data-act="orders-clear">Clear filters</button>` })
      : st.tab === 'review' ? emptyBlock({ ic: 'checkCircle', title: 'Nothing needs review', body: 'Every order is flowing through automation.' }) : emptyBlock({ ic: 'inbox', title: 'No ' + (st.tab === 'open' ? 'open' : st.tab) + ' orders', body: 'New orders appear here as they arrive.' });
  const tbl = table({ id: 'orders', st, cols: orderCols(), rows, rowId: (o) => o.id, selectable: true, rowAct: 'order-open', cursor: st.cursor, empty, caption: 'Orders' });
  const head = pageHead({ title: 'Orders', sub: `${cnt(isOpen)} open${cnt(isBreach) ? `, ${cnt(isBreach)} past SLA` : ''}. Press <span class="kbd">j</span> <span class="kbd">k</span> to move, <span class="kbd">Enter</span> to open.`, actions: `<button class="btn" data-act="orders-export" ${rows.length ? '' : 'disabled'}>${icon('download', 'ic-sm')}Export CSV</button>` });
  return `${head}<div class="panel">${tabsEl(tabs, st.tab, 'orders', 'Order status').replace('class="tabs"', 'class="tabs px-2"')}${toolbar}${bulkBar()}<div class="border-t border-line">${tbl}</div></div>`;
}
binds['o-q'] = (el) => { ui.orders.q = el.value; ui.orders.page = 1; render(); };
binds['o-type'] = (el) => { ui.orders.type = el.value; ui.orders.page = 1; render(); };
binds['o-sup'] = (el) => { ui.orders.sup = el.value; ui.orders.page = 1; render(); };
binds['o-mer'] = (el) => { ui.orders.mer = el.value; ui.orders.page = 1; render(); };
binds['o-chan'] = (el) => { ui.orders.chan = el.value; ui.orders.page = 1; render(); };
actions['flag-sla'] = () => { ui.orders.flag = ui.orders.flag === 'sla' ? '' : 'sla'; ui.orders.page = 1; render(); };
actions['orders-clear'] = () => { Object.assign(ui.orders, { q: '', type: '', sup: '', mer: '', flag: '', chan: '', page: 1 }); render(); };
actions['bulk-clear'] = () => { ui.orders.sel.clear(); render(); };
actions['orders-export'] = () => {
  const rows = ordersFiltered();
  const csv = ['id,created,channel,buyer,service,input,status,supplier,price,cost'].concat(rows.map((o) => [o.id, new Date(o.created).toISOString(), isB2C(o) ? 'storefront' : 'merchant', buyerOf(o).name, svc(o.sid).name, o.input, o.status, sup(o.sup).name, o.price, o.cost].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'orders-' + ui.orders.tab + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast({ kind: 'success', title: 'Exported ' + rows.length + ' orders', body: a.download, ttl: 3000 });
};

/* ----- single order actions ----- */
function openOrder(id) { ui.orders.cursor = id; openDrawer(() => orderDrawer(id)); }
actions['order-open'] = (el) => openOrder(el.dataset.id);
actions['order-menu'] = (el) => {
  const o = ord(el.dataset.id), open = isOpen(o);
  openMenu(el, [
    { label: 'Open details', icon: 'panel', run: () => openOrder(o.id) },
    { label: 'Copy IMEI / input', icon: 'copy', run: () => copyText(o.input, 'Copied') },
    ...(isHeld(o) ? [{ sep: true }, { label: 'Approve and send', icon: 'check', run: () => actions['rk-approve']({ dataset: { id: o.id } }) }, { label: 'Refund only…', icon: 'undo', run: () => actions['rk-refund']({ dataset: { id: o.id, block: '0' } }) }, { label: 'Refund and block…', icon: 'ban', danger: true, run: () => actions['rk-refund']({ dataset: { id: o.id, block: '1' } }) }]
      : open ? [{ sep: true }, { label: 'Complete…', icon: 'check', run: () => completeDialog([o.id]) }, { label: 'Retry on ' + sup(o.sup).name, icon: 'refresh', run: () => doRetry([o.id]) }, { label: isB2C(o) ? 'Cancel and refund…' : 'Reject…', icon: 'ban', danger: true, run: () => rejectDialog([o.id]) }]
        : canRefund(o) ? [{ sep: true }, { label: 'Refund…', icon: 'undo', run: () => actions['o-refund']({ dataset: { id: o.id } }) }] : []),
  ], { width: 220 });
};
function doRetry(ids, supId) {
  const n = retryOrders(ids, supId);
  toast({ kind: 'success', title: n + (n === 1 ? ' order' : ' orders') + (supId ? ' rerouted to ' + sup(supId).name : ' re-sent'), body: 'Status is now Processing.' });
}
function completeDialog(ids) {
  const os = ids.map(ord).filter((o) => o && isOpen(o));
  if (!os.length) return;
  const one = os.length === 1;
  const tpl = [['unlock', 'Unlock confirmed by carrier. Insert a non-supported SIM to verify.'], ['info', 'Status: Clean. Carrier: unlocked. Region: EU.'], ['server', 'Delivered to {input}. Activation takes under 2 minutes.'], ['file', 'File delivered. Check your downloads.'], ['custom', '']];
  const first = defaultReply(os[0]);
  modal({
    title: one ? 'Complete ' + os[0].id : 'Complete ' + os.length + ' orders', sub: 'Settles ' + money(sum(os, (o) => o.price)) + ' of revenue and ' + money(sum(os, (o) => o.cost)) + ' of supplier cost to the ledger.', confirm: one ? 'Complete order' : 'Complete ' + os.length + ' orders',
    body: `<div class="space-y-3">${field('Reply template', selectEl('tpl', 'custom', [['custom', 'Write my own'], ['unlock', 'Unlock confirmed'], ['info', 'Info delivered'], ['server', 'Credits delivered'], ['file', 'File delivered']], 'Reply template', 'data-tpl'))}${field('Reply sent to the ' + (os.every(isB2C) ? 'customer' : os.some(isB2C) ? 'buyer' : 'merchant'), `<textarea class="input" name="reply" rows="3" autofocus>${esc(first)}</textarea>`, one ? '' : 'Use <span class="mono">{input}</span> to insert each order’s IMEI or account.')}</div>`,
    onSubmit: (f) => {
      const reply = f.reply.value.trim();
      if (!reply) { f.reply.setAttribute('aria-invalid', 'true'); return 'Write a reply. The merchant sees it as the order result.'; }
      const n = completeOrders(os.map((o) => o.id), (o) => reply.replace(/\{input\}/g, o.input));
      ui.orders.sel.clear();
      toast({ kind: 'success', title: n + (n === 1 ? ' order completed' : ' orders completed'), body: money(sum(os, (o) => o.price)) + ' settled to revenue.', action: one ? { label: 'View ledger', run: () => showJournals('order', os[0].id, 'Ledger entries for ' + os[0].id) } : null });
      return true;
    },
  });
  $('#dlg [data-tpl]').onchange = (e) => { const t = tpl.find((x) => x[0] === e.target.value); if (t && t[0] !== 'custom') $('#dlg [name=reply]').value = t[1]; };
}
function rejectDialog(ids) {
  const os = ids.map(ord).filter((o) => o && isOpen(o));
  if (!os.length) return;
  modal({
    title: os.length === 1 ? (isB2C(os[0]) ? 'Cancel ' : 'Reject ') + os[0].id : 'Reject ' + os.length + ' orders', sub: os.every(isB2C) ? (os.length === 1 ? 'The customer is' : 'The customers are') + ' refunded ' + money(sum(os, (o) => o.gross)) + ' to the original payment method and told why.' : os.some(isB2C) ? 'Merchants are refunded to their wallet and customers to their card. Both see the reason.' : 'The merchant is refunded ' + money(sum(os, (o) => o.price)) + ' straight away and sees the reason.', confirm: os.every(isB2C) ? 'Cancel and refund' : 'Reject and refund', kind: 'danger',
    body: `<div class="space-y-3">${field('Reason', selectEl('reason', '', [['', 'Choose a reason'], ...REJECT_REASONS.map((r) => [r, r]), ['other', 'Other…']], 'Reason', '', 'w-full'))}<div data-other class="hidden">${field('Reason shown to the buyer', '<input class="input" name="other" maxlength="120" placeholder="Short and specific">')}</div></div>`,
    onSubmit: (f) => {
      let r = f.reason.value;
      if (!r) { f.reason.setAttribute('aria-invalid', 'true'); return 'Choose a reason. The merchant sees it with the refund.'; }
      if (r === 'other') { r = f.other.value.trim(); if (!r) { f.other.setAttribute('aria-invalid', 'true'); return 'Add the reason the merchant should see.'; } }
      const n = rejectOrders(os.map((o) => o.id), r);
      ui.orders.sel.clear();
      toast({ kind: 'success', title: n + (n === 1 ? ' order rejected' : ' orders rejected'), body: os.every(isB2C) ? money(sum(os, (o) => o.gross)) + ' refunded to cards.' : money(sum(os, (o) => o.price)) + ' refunded to wallets.' });
      return true;
    },
  });
  $('#dlg [name=reason]').onchange = (e) => $('#dlg [data-other]').classList.toggle('hidden', e.target.value !== 'other');
}
actions['o-complete'] = (el) => {
  const o = ord(el.dataset.id);
  const ta = $('#reply-' + o.id);
  const reply = ta ? ta.value.trim() : '';
  if (!reply) { ta && ta.focus(); toast({ kind: 'error', title: 'Write a reply first', body: 'The merchant sees it as the order result.' }); return; }
  completeOrders([o.id], reply);
  delete ui.orders.reply[o.id];
  toast({ kind: 'success', title: o.id + ' completed', body: money(o.price) + ' settled to revenue.', action: { label: 'View ledger', run: () => showJournals('order', o.id, 'Ledger entries for ' + o.id) } });
};
actions['o-reject'] = (el) => rejectDialog([el.dataset.id]);
actions['o-retry'] = (el) => {
  const o = ord(el.dataset.id);
  const items = S.suppliers.filter((s) => s.enabled).map((s) => ({ label: (s.id === o.sup ? 'Retry on ' : 'Reroute to ') + s.name + (s.status !== 'up' ? ' (' + s.status + ')' : ''), icon: s.id === o.sup ? 'refresh' : 'server', disabled: s.status === 'down', run: () => doRetry([o.id], s.id) }));
  openMenu(el, items, { width: 240, align: 'start' });
};
binds.reply = (el) => { ui.orders.reply[el.dataset.id] = el.value; };

/* ----- bulk ----- */
const selOpen = () => [...ui.orders.sel].filter((id) => ord(id) && isOpen(ord(id)));
actions['bulk-complete'] = () => completeDialog(selOpen());
actions['bulk-reject'] = () => rejectDialog(selOpen());
actions['bulk-retry'] = () => { doRetry(selOpen()); ui.orders.sel.clear(); render(); };
actions['bulk-reroute'] = (el) => {
  const ids = selOpen();
  openMenu(el, S.suppliers.filter((s) => s.enabled).map((s) => ({ label: s.name + (s.status !== 'up' ? ' (' + s.status + ')' : ''), icon: 'server', disabled: s.status === 'down', run: () => { doRetry(ids, s.id); ui.orders.sel.clear(); render(); } })), { width: 240, align: 'start' });
};

/* ----- drawer ----- */
function orderDrawer(id) {
  const o = ord(id), b2c = isB2C(o), c = b2c ? cus(o.cid) : null, m = b2c ? null : mer(o.mid), s = svc(o.sid), sp = sup(o.sup);
  const open = isOpen(o), held = isHeld(o);
  const profit = orderProfit(o);
  const sla = slaMs(o), age = ageMs(o);
  const sources = { base: 'Base price', group: 'Group price', client: 'Client override', retail: 'Storefront price' };
  /* the black button is the action the page itself recommends: a supplier timeout or a late order on an unhealthy supplier points at retry/reroute, anything else at completing it */
  const retryFirst = open && !held && ((o.status === 'review' && o.reason === REVIEW_REASONS.timeout) || (isBreach(o) && sp.status !== 'up'));
  const wallet = o.status === 'completed' ? 'Settled to revenue' : o.status === 'rejected' ? (b2c ? 'Refunded to the customer' : 'Released to wallet') : b2c ? 'Held in customer_funds' : 'Held in client_hold';
  const why = held ? `<div class="mb-4 flex gap-2.5 rounded-lg bg-serious-bg p-3 text-serious-fg" role="note">${icon('shield', 'mt-px')}<div class="text-sm"><p class="font-medium">Paid, held by the risk engine</p><p class="mt-0.5">${esc(o.reason)}</p><p class="mt-1.5 text-xs">The money is captured but nothing has gone to the supplier. Approve it to send, or refund the customer.</p></div></div>`
    : o.status === 'review' ? `<div class="mb-4 flex gap-2.5 rounded-lg bg-serious-bg p-3 text-serious-fg" role="note">${icon('alert', 'mt-px')}<div class="text-sm"><p class="font-medium">Stopped for review</p><p class="mt-0.5">${esc(o.reason)}</p><p class="mt-1.5 text-xs">${o.reason === REVIEW_REASONS.timeout ? 'Retry once the supplier recovers, or reroute to ' + (s.fb ? sup(s.fb).name : 'another supplier') + '.' : o.reason === REVIEW_REASONS.manual ? 'Dispatch it to the supplier by hand, then complete it with the reply.' : 'Check the details, then complete it with a reply or ' + (b2c ? 'cancel it with a refund' : 'reject it with a refund') + '.'}</p></div></div>` : '';
  const who = b2c ? 'customer' : 'merchant';
  const result = o.status === 'completed' ? `<div class="mb-4"><h3 class="mb-1.5 text-xs font-medium text-ink3">Result sent to ${who}</h3><p class="rounded-md border border-line bg-sunken p-2.5 text-sm">${esc(o.reply)}</p></div>` : o.status === 'rejected' ? `<div class="mb-4"><h3 class="mb-1.5 text-xs font-medium text-ink3">${b2c ? 'Cancelled' : 'Rejected'}</h3><p class="rounded-md border border-line bg-sunken p-2.5 text-sm">${esc(o.reason)}</p></div>` : '';
  const buyerRow = b2c
    ? `<dt>Customer</dt><dd><a class="link" href="#/customers/${c.id}">${esc(c.name)}</a> <span class="text-ink3">· ${B2C_COUNTRIES[o.country].name} · storefront${c.hasAccount ? '' : ', guest'}</span><p class="text-xs text-ink3">${esc(maskEmail(c.email))}</p></dd>`
    : `<dt>Merchant</dt><dd><button class="link" data-act="go" data-route="merchants" data-p="${esc(JSON.stringify({ id: m.id }))}">${esc(m.name)}</button> <span class="text-ink3">· ${m.city}, ${m.cc} · ${GROUPS.find((g) => g.id === m.group).name}</span></dd>`;
  const money_ = b2c
    ? `<tr><td class="px-3 py-2 text-ink2">Customer paid</td><td class="px-3 py-2 text-end font-medium tabular-nums">${lm(o.gross, o.cur)}${o.cur !== 'USD' ? `<p class="text-2xs font-normal text-ink3">${money(o.gross)} at ${o.fx} ${o.cur}</p>` : ''}</td></tr>
        ${o.tax > 0 ? `<tr><td class="px-3 py-2 text-ink2">VAT ${pct(o.taxRate * 100)}</td><td class="px-3 py-2 text-end tabular-nums text-ink2">${money(o.tax)}</td></tr>` : ''}
        <tr><td class="px-3 py-2 text-ink2">Price before VAT</td><td class="px-3 py-2 text-end tabular-nums">${money(o.price)}</td></tr>
        <tr><td class="px-3 py-2 text-ink2">Supplier cost</td><td class="px-3 py-2 text-end tabular-nums">${money(o.cost)}</td></tr>
        <tr><td class="px-3 py-2 text-ink2">Gateway fee</td><td class="px-3 py-2 text-end tabular-nums">${money(o.fee)}</td></tr>
        <tr><td class="px-3 py-2 text-ink2">Profit</td><td class="px-3 py-2 text-end font-medium tabular-nums ${profit < 0 ? 'text-crit-fg' : ''}">${money(profit)} <span class="font-normal text-ink3">${pct((profit / o.price) * 100, 1)}</span></td></tr>`
    : `<tr><td class="px-3 py-2 text-ink2">Charged to merchant</td><td class="px-3 py-2 text-end font-medium tabular-nums">${money(o.price)}</td></tr>
        <tr><td class="px-3 py-2 text-ink2">Supplier cost</td><td class="px-3 py-2 text-end tabular-nums">${money(o.cost)}</td></tr>
        <tr><td class="px-3 py-2 text-ink2">Profit</td><td class="px-3 py-2 text-end font-medium tabular-nums ${profit < 0 ? 'text-crit-fg' : ''}">${money(profit)} <span class="font-normal text-ink3">${pct((profit / o.price) * 100, 1)}</span></td></tr>`;
  const payBlock = b2c ? `<h3 class="mb-1.5 text-xs font-medium text-ink3">Payment and risk</h3>
    <div class="mb-5 rounded-lg border border-line p-3 text-sm">${kv([['Payment', chargeBadge(o.pay.status) + ' <span class="text-ink2">' + B2C_METHODS[o.pay.method].label + ', ' + esc(o.pay.brand) + '</span>'], ['Gateway ref', `<span class="mono text-xs">${esc(o.pay.ref)}</span>`], ['3D Secure', o.pay.threeDS ? 'Passed' : o.pay.method === 'crypto' ? 'Not applicable' : '<span class="text-warn-fg">Not used</span>'], ['Risk score', scoreMeter(o.risk.score) + (o.risk.signals.length ? `<ul class="m-0 mt-1 list-none p-0 text-xs text-ink2">${o.risk.signals.map((x) => `<li>• ${esc(x)}</li>`).join('')}</ul>` : '<span class="text-xs text-ink3">No risk signals</span>')], o.risk.reviewedBy ? ['Reviewed by', esc(o.risk.reviewedBy) + ', ' + ago(o.risk.reviewedAt) + ', ' + (o.risk.outcome === 'approved' ? 'approved' : 'refunded')] : null, ['Tracking link', `<button type="button" class="mono inline-flex items-center gap-1 text-xs text-ink2 hover:text-ink" data-act="copy" data-v="https://gsmsupply.example/track/${esc(o.token)}" data-label="tracking link">gsmsupply.example/track/${esc(o.token)}${icon('copy', 'ic-xs')}</button>`]])}</div>` : '';
  const foot = held
    ? `<div class="drawer-f"><button class="btn btn-primary" data-act="rk-approve" data-id="${o.id}">${icon('check', 'ic-sm')}Approve and send</button><button class="btn" data-act="rk-refund" data-id="${o.id}" data-block="0">${icon('undo', 'ic-sm')}Refund only</button><span class="flex-1"></span><button class="btn btn-danger" data-act="rk-refund" data-id="${o.id}" data-block="1">${icon('ban', 'ic-sm')}Refund and block…</button></div>`
    : open ? `<div class="drawer-f"><button class="btn ${retryFirst ? '' : 'btn-primary'}" data-act="o-complete" data-id="${o.id}">${icon('check', 'ic-sm')}Complete</button><button class="btn ${retryFirst ? 'btn-primary' : ''}" data-act="o-retry" data-id="${o.id}" aria-haspopup="menu">${icon('refresh', 'ic-sm')}Retry or reroute${icon('chevD', 'ic-xs')}</button><span class="flex-1"></span><button class="btn btn-danger" data-act="o-reject" data-id="${o.id}">${icon('ban', 'ic-sm')}${b2c ? 'Cancel and refund…' : 'Reject…'}</button></div>`
      : `<div class="drawer-f"><span class="flex-1 text-xs text-ink3">${canRefund(o) ? 'Delivered and paid. A refund after delivery loses the supplier cost.' : 'This order is closed.'}</span>${canRefund(o) ? `<button class="btn" data-act="o-refund" data-id="${o.id}">${icon('undo', 'ic-sm')}Refund…</button>` : ''}<button class="btn" data-act="close-drawer">Close</button></div>`;
  return `<div class="flex h-full flex-col">
  <div class="drawer-h"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 id="drawer-title" class="mono text-lg font-semibold">${o.id}</h2>${orderBadge(o.status)}${b2c ? '<span class="tag">Storefront</span>' : ''}</div><p class="mt-0.5 text-xs text-ink3">Created ${fmtDate(o.created)} via ${esc(o.chan)} · ${ago(o.created)}</p></div><button class="btn btn-ghost btn-icon" data-act="close-drawer" aria-label="Close details">${icon('x')}</button></div>
  <div class="drawer-b">
    ${why}
    <dl class="dl mb-5">
      ${buyerRow}
      <dt>Service</dt><dd>${typeTag(s.type)} ${esc(s.name)}${o.qty > 1 ? ` <span class="text-ink3">× ${o.qty}</span>` : ''}<p class="mono text-xs text-ink3">${s.code}</p></dd>
      <dt>${s.type === 'IMEI' ? 'IMEI' : s.type === 'Server' ? 'Account' : s.type === 'Remote' ? 'Serial' : 'Model'}</dt><dd><span class="mono">${esc(fmtImei(o.input))}</span> <button class="btn btn-ghost btn-icon btn-sm align-middle" data-act="copy" data-v="${esc(o.input)}" data-label="input" aria-label="Copy ${esc(o.input)}">${icon('copy', 'ic-sm')}</button></dd>
      ${o.device ? `<dt>Device</dt><dd>${esc(o.device)}</dd>` : ''}
      <dt>Supplier</dt><dd>${esc(sp.name)} ${supBadge(sp)}<p class="text-xs text-ink3">Ref <span class="mono">${esc(o.ref)}</span> · ${o.attempts} ${o.attempts === 1 ? 'attempt' : 'attempts'}</p></dd>
      <dt>SLA</dt><dd>${held ? 'Clock starts when it is approved' : open ? `Target ${ageText(sla)}, now ${ageText(age)}${o.status !== 'review' && age > sla ? ` <span class="font-medium text-crit-fg">(late by ${ageText(age - sla)})</span>` : ''}` : `${ageText(sla)} target, finished in ${dur(Math.max(0, o.doneAt - o.created))}`}</dd>
    </dl>
    <h3 class="mb-1.5 text-xs font-medium text-ink3">Money</h3>
    <div class="mb-5 rounded-lg border border-line">
      <table class="w-full text-sm"><tbody class="divide-y divide-line">
        ${money_}
      </tbody></table>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-sunken px-3 py-2 text-xs text-ink3"><span>${wallet}</span><span aria-hidden="true">·</span><span>${sources[o.source] || 'Base price'}</span><span class="flex-1"></span>${b2c ? '' : `<button class="link" data-act="trace" data-m="${m.id}" data-s="${s.id}">How was this priced?</button>`}<button class="link" data-act="journal" data-rt="order" data-rid="${o.id}" data-title="Ledger entries for ${o.id}">Ledger entries</button></div>
    </div>
    ${payBlock}
    ${result}
    ${open && !held ? `<div class="mb-5"><label class="label" for="reply-${o.id}">Reply to send when completing</label><textarea id="reply-${o.id}" class="input" rows="2" data-bind="reply" data-id="${o.id}">${esc(ui.orders.reply[o.id] ?? defaultReply(o))}</textarea></div>` : ''}
    <h3 class="mb-2 text-xs font-medium text-ink3">Timeline</h3>
    ${timeline(o.events)}
  </div>
  ${foot}
  </div>`;
}
actions['o-refund'] = (el) => {
  const o = ord(el.dataset.id), left = refundable(o), c = cus(o.cid);
  closeDrawer();
  modal({
    title: 'Refund ' + o.id, sub: `${esc(c.name)} · paid ${lm(o.gross, o.cur)}${o.cur !== 'USD' ? ' (' + money(o.gross) + ')' : ''}`,
    body: `<div class="space-y-3">${field('Amount to refund (USD)', `<input class="input mono" name="amt" type="text" inputmode="decimal" value="${left.toFixed(2)}" autocomplete="off">`, `Up to ${money(left)}. VAT is returned in proportion.`)}${field('Reason', '<input class="input" name="why" type="text" placeholder="Goodwill, duplicate payment, wrong service…" autocomplete="off">', 'The customer sees this in their email.')}
      ${o.status === 'completed' ? `<p class="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">${icon('alert', 'ic-sm mt-0.5 flex-none')}<span>This unlock was delivered. Refunding returns the money but not the ${money(o.cost)} paid to the supplier.</span></p>` : ''}</div>`,
    confirm: 'Refund', kind: 'danger',
    onSubmit: (f) => { const v = parseFloat(f.amt.value), why = f.why.value.trim(); if (!(v > 0) || v > left + 0.004) { f.amt.setAttribute('aria-invalid', 'true'); return 'Enter an amount between $0.01 and ' + money(left) + '.'; } if (!why) { f.why.setAttribute('aria-invalid', 'true'); return 'Add a short reason.'; } issueRefund(o.id, v, why); toast({ kind: 'success', title: money(v) + ' refunded', body: o.id + ': revenue and VAT reversed in the ledger.', action: { label: 'Show entries', run: () => showJournals('order', o.id, 'Entries for ' + o.id) }, ttl: 5000 }); return true; },
  });
};
actions.trace = (el) => { ui.services.rm = el.dataset.m; ui.services.rs = el.dataset.s; closeDrawer(); go('services'); setTimeout(() => $('#resolver')?.scrollIntoView({ block: 'start' }), 60); };

/* ----- keyboard: j / k / Enter / x on the orders table ----- */
document.addEventListener('keydown', (e) => {
  if (parseHash().r.id !== 'orders' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) || $('dialog[open]')) return;
  const ids = ui.orders.visible || [];
  if (!ids.length) return;
  const pageIds = ids.slice((ui.orders.page - 1) * PAGE, ui.orders.page * PAGE);
  let i = pageIds.indexOf(ui.orders.cursor);
  if (e.key === 'j') i = Math.min(pageIds.length - 1, i + 1);
  else if (e.key === 'k') i = Math.max(0, i < 0 ? 0 : i - 1);
  else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); return openOrder(pageIds[i]); }
  else if (e.key === 'x' && i >= 0) { const id = pageIds[i]; ui.orders.sel.has(id) ? ui.orders.sel.delete(id) : ui.orders.sel.add(id); return render(); }
  else return;
  e.preventDefault();
  ui.orders.cursor = pageIds[i];
  $$('#main tr[data-cursor]').forEach((r) => r.removeAttribute('data-cursor'));
  const row = $(`#main tr[data-rid="${pageIds[i]}"]`);
  if (row) { row.setAttribute('data-cursor', '1'); row.scrollIntoView({ block: 'nearest' }); }
});
