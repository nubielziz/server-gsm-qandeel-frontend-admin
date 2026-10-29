/* Refunds, card disputes and payments: where storefront money goes back out. */
ui.rfT = { sort: 'created', dir: -1, page: 1, sel: new Set() };
ui.rfD = { sort: 'due', dir: 1, page: 1, sel: new Set() };
ui.rfP = { sort: 'created', dir: -1, page: 1, sel: new Set() };
ui.refunds.method = ui.refunds.method || '';

const refBadge = (st) => badge(...REFUND_STATUS[st]);
const dispBadge = (st) => badge(...DISPUTE_STATUS[st]);
const usd0 = (n) => money(n, n % 1 ? 2 : 0);

function refundStrip() {
  const b2c = S.orders.filter((o) => isB2C(o) && o.status !== 'rejected');
  const done = D(S.refunds).filter((r) => r.status === 'completed' && Date.now() - r.created < 30 * DAY);
  const need = D(S.refunds).filter((r) => r.status === 'requested' || r.status === 'failed');
  const open = D(S.disputes).filter((d) => d.status === 'needs_response' || d.status === 'under_review');
  const nextDue = D(S.disputes).filter((d) => d.status === 'needs_response').sort((a, b) => a.due - b.due)[0];
  const salesNow = sum(b2c.filter((o) => Date.now() - o.created < 30 * DAY), (o) => o.gross);
  return statGrid([
    { label: 'Refunded, 30 days', value: money0(sum(done, (r) => r.amount)), sub: done.length + ' refunds · ' + (salesNow ? pct((sum(done, (r) => r.amount) / salesNow) * 100) : '0%') + ' of sales', tip: 'Money sent back to customers. The VAT part comes back out of what you owe the tax office.' },
    { label: 'Waiting for you', value: need.length, cls: need.length ? 'text-warn-fg' : '', sub: need.length ? money0(sum(need, (r) => r.amount)) + ' · ' + D(S.refunds).filter((r) => r.status === 'failed').length + ' failed at the gateway' : 'No requests open' },
    { label: 'Card disputes open', value: open.length, cls: nextDue && nextDue.due - Date.now() < 3 * DAY ? 'text-crit-fg' : '', sub: nextDue ? 'Evidence for ' + nextDue.id + ' due in ' + ageText(nextDue.due - Date.now()) : open.length ? 'With the card network' : 'None open' },
    { label: 'Lost to chargebacks', value: money0(Math.max(0, S.acct.chargeback_loss || 0)), sub: 'All time, with the $15 dispute fees', tip: 'When a customer disputes a card payment and the bank sides with them, the money and a $15 fee are taken back. Keep the evidence pack ready for every order.' },
  ], 'Refund and dispute figures');
}

/* ---------- refunds ---------- */
function refundRows() {
  return D(S.refunds).filter((r) => !ui.refunds.status || r.status === ui.refunds.status);
}
function tabRefunds() {
  const st = ui.refunds, rows = refundRows();
  const cols = [
    { key: 'id', label: 'Refund', val: (r) => r.id, render: (r) => `<p class="mono font-medium">${r.id}</p><p class="text-2xs">${orderLink(r.oid)}</p>` },
    { key: 'who', label: 'Customer', hide: 'md', render: (r) => custLink(r.cid) },
    { key: 'reason', label: 'Reason', hide: 'sm', render: (r) => `<p class="max-w-[22rem] truncate text-ink2" title="${esc(r.reason)}">${esc(r.reason)}</p>${r.note ? `<p class="max-w-[22rem] truncate text-2xs ${r.status === 'failed' ? 'text-crit-fg' : 'text-ink3'}" title="${esc(r.note)}">${esc(r.note)}</p>` : ''}` },
    { key: 'amount', label: 'Amount', num: true, val: (r) => r.amount, render: (r) => `${lm(r.amount, r.cur)}${r.cur !== 'USD' ? `<p class="text-2xs text-ink3">${money(r.amount)}</p>` : ''}${r.partial ? '<p class="text-2xs text-ink3">Partial</p>' : ''}` },
    { key: 'status', label: 'Status', val: (r) => r.status, render: (r) => refBadge(r.status) },
    { key: 'created', label: 'When', hide: 'lg', val: (r) => r.created, render: (r) => `<span class="text-ink2">${ago(r.created)}</span><p class="text-2xs text-ink3">${esc(r.by)}${r.auto ? ' (automatic)' : ''}</p>` },
    { key: 'a', label: '', render: (r) => (r.status === 'requested' ? `<div class="flex justify-end gap-1.5"><button class="btn btn-sm btn-primary" data-act="rf-approve" data-id="${r.id}">Approve…</button><button class="btn btn-sm" data-act="rf-decline" data-id="${r.id}">Decline</button></div>` : r.status === 'failed' ? `<button class="btn btn-sm btn-primary" data-act="rf-retry" data-id="${r.id}">${icon('refresh', 'ic-xs')}Retry</button>` : '') },
  ];
  const seg = segEl([['', 'All'], ['requested', 'Needs approval'], ['failed', 'Failed'], ['completed', 'Refunded'], ['rejected', 'Declined']], st.status, 'rf-status', '', 'Refund status');
  return panel({ title: 'Refunds', sub: 'Failed unlocks are refunded automatically. Everything else (changed mind, wrong service, goodwill) waits here for a person.', right: seg, body: table({ id: 'rf-refunds', st: ui.rfT, cols, rows, rowId: (r) => r.id, pageSize: 12, caption: 'Refunds', empty: emptyBlock({ ic: 'undo', title: st.status ? 'No refunds with this status' : 'No refunds yet', body: st.status ? 'Choose another status to see more.' : 'Refunds appear here when a customer asks or an order fails.', cta: st.status ? '<button class="btn" data-act="rf-status" data-v="">Show all</button>' : '' }) }), flush: true });
}
actions['rf-status'] = (el) => { ui.refunds.status = el.dataset.v; ui.rfT.page = 1; render(); };
actions['rf-retry'] = (el) => { const r = S.refunds.find((x) => x.id === el.dataset.id); retryRefund(r.id); toast({ kind: 'success', title: r.id + ' refunded', body: lm(r.amount, r.cur) + ' went back to the customer.', ttl: 3000 }); };
actions['rf-approve'] = (el) => {
  const r = S.refunds.find((x) => x.id === el.dataset.id), o = ord(r.oid), delivered = o.status === 'completed';
  modal({
    title: 'Approve ' + r.id, sub: `${esc(cus(o.cid).name)} · ${o.id} · paid ${lm(o.gross, o.cur)}${o.cur !== 'USD' ? ' (' + money(o.gross) + ')' : ''}`,
    body: `<div class="space-y-3"><p class="rounded-md bg-sunken p-2.5 text-sm text-ink2"><span class="text-xs text-ink3">Their reason</span><br>${esc(r.reason)}</p>
      ${field('Refund amount (USD)', `<input class="input mono" name="amt" type="text" inputmode="decimal" value="${r.amount.toFixed(2)}" autocomplete="off">`, `Up to ${money(o.gross)}. Enter less to refund only part of the order.`)}
      ${delivered ? `<p class="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">${icon('alert', 'ic-sm mt-0.5 flex-none')}<span>The unlock was delivered, so the supplier cost of ${money(o.cost)} is not coming back. You lose that on a full refund.</span></p>` : ''}
      ${o.pay.method === 'crypto' ? `<p class="flex gap-2 rounded-md bg-sunken p-2.5 text-sm text-ink2">${icon('info', 'ic-sm mt-0.5 flex-none')}<span>This was paid in crypto, which the gateway cannot reverse. Mark it as paid after you send the USDT yourself.</span></p>` : `<p class="text-xs text-ink3">Goes back to the same card. It shows on their statement in 5 to 10 days.</p>`}</div>`,
    confirm: 'Refund now',
    onSubmit: (f) => { const v = parseFloat(f.amt.value); if (!(v > 0) || v > o.gross + 0.004) { f.amt.setAttribute('aria-invalid', 'true'); return 'Enter an amount between $0.01 and ' + money(o.gross) + '.'; } approveRefund(r.id, v); toast({ kind: 'success', title: r.id + ' refunded', body: money(v) + ' returned. Revenue and VAT were reversed in the ledger.', action: { label: 'Show entries', run: () => showJournals('order', o.id, 'Entries for ' + o.id) }, ttl: 5000 }); return true; },
  });
};
actions['rf-decline'] = (el) => {
  const r = S.refunds.find((x) => x.id === el.dataset.id), o = ord(r.oid);
  modal({
    title: 'Decline ' + r.id, sub: `${o.id} · ${lm(r.amount, r.cur)}`,
    body: field('Message to the customer', `<textarea class="input" name="why" rows="3" placeholder="The order was delivered on ${fmtDay(o.doneAt || o.created)}, so under our terms it can’t be refunded…">Your unlock was delivered and the service started at your request, so under our refund policy it can’t be refunded. If the phone is still locked, reply with a photo of the message and we will check it again.</textarea>`, 'Sent by email. The reason is also kept with the order.'),
    confirm: 'Decline request', kind: 'danger',
    onSubmit: (f) => { const t = f.why.value.trim(); if (t.length < 10) { f.why.setAttribute('aria-invalid', 'true'); return 'Give the customer a reason, at least a sentence.'; } declineRefund(r.id, t); toast({ kind: 'info', title: r.id + ' declined', body: 'The customer has the reason by email.', ttl: 2800 }); return true; },
  });
};

/* ---------- disputes ---------- */
function evidenceFor(d) {
  const o = ord(d.oid), c = cus(d.cid), cs = consentsFor(o), prior = custOrders(c.id).filter((x) => x.id !== o.id && x.status === 'completed' && x.pay.status === 'captured');
  const tks = S.tickets.filter((t) => t.oid === o.id || (t.who.type === 'customer' && t.who.id === c.id && Math.abs(t.created - o.created) < 5 * DAY));
  const rows = [
    { ok: true, title: 'Payment record', body: `${o.pay.brand}, ${lm(o.gross, o.cur)} captured ${fmtDate(o.created)}. Gateway ref <span class="mono">${esc(o.pay.ref)}</span>.`, w: 1 },
    { ok: o.pay.threeDS, title: '3D Secure authentication', body: o.pay.threeDS ? 'The cardholder passed the bank’s own check. For fraud disputes this usually shifts liability to the bank.' : 'No 3D Secure on this payment. The bank can claim the cardholder did not authorise it.', w: o.pay.threeDS ? 3 : 0 },
    { ok: !!o.doneAt, title: 'Proof of delivery', body: o.doneAt ? `Result delivered ${fmtDate(o.doneAt)} to ${esc(maskEmail(c.email))}: “${esc((o.reply || 'Unlock confirmed').slice(0, 90))}”` : 'Not delivered yet.', w: o.doneAt ? 3 : 0 },
    { ok: true, title: 'Terms the customer accepted', body: cs.map((x) => esc(x.what)).join('; ') + '. Recorded from IP ' + cs[0].ip + '.', w: 2 },
    { ok: prior.length > 0, title: 'Order history', body: prior.length ? `${prior.length} earlier paid ${prior.length === 1 ? 'order' : 'orders'} from the same customer that were not disputed.` : 'First order from this customer.', w: prior.length ? 1 : 0 },
    { ok: tks.length === 0, title: 'Customer contact', body: tks.length ? `${tks.length} support ${tks.length === 1 ? 'ticket' : 'tickets'} around this order: ${tks.map((t) => esc(t.subject)).join('; ')}.` : 'The customer never contacted support about this order.', w: tks.length ? 0 : 1 },
  ];
  const score = sum(rows, (x) => x.w);
  return { rows, strength: score >= 8 ? ['b-good', 'checkCircle', 'Strong'] : score >= 5 ? ['b-warn', 'alert', 'Fair'] : ['b-crit', 'xCircle', 'Weak'], score };
}
function tabDisputes() {
  const rows = D(S.disputes);
  const cols = [
    { key: 'id', label: 'Dispute', val: (d) => d.id, render: (d) => `<p class="mono font-medium">${d.id}</p><p class="text-2xs">${orderLink(d.oid)}</p>` },
    { key: 'who', label: 'Customer', hide: 'md', render: (d) => custLink(d.cid) },
    { key: 'reason', label: 'Reason', hide: 'sm', render: (d) => `<p class="text-ink2">${esc(d.code)}</p><p class="max-w-[20rem] truncate text-2xs text-ink3" title="${esc(d.note)}">${esc(d.note)}</p>` },
    { key: 'amount', label: 'At stake', num: true, val: (d) => d.amount, render: (d) => `${lm(d.amount, d.cur)}<p class="text-2xs text-ink3">+ ${money0(d.fee)} fee</p>` },
    { key: 'due', label: 'Evidence due', hide: 'lg', val: (d) => d.due, render: (d) => (d.status === 'needs_response' ? dueText(d.due) : `<span class="text-ink3">${d.status === 'under_review' ? 'Sent ' + ago(d.submittedAt) : 'Closed ' + ago(d.resolvedAt)}</span>`) },
    { key: 'status', label: 'Status', val: (d) => d.status, render: (d) => dispBadge(d.status) },
    { key: 'a', label: '', render: (d) => `<button class="btn btn-sm ${d.status === 'needs_response' ? 'btn-primary' : ''}" data-act="dp-open" data-id="${d.id}">${d.status === 'needs_response' ? 'Prepare evidence' : 'View'}</button>` },
  ];
  return panel({ title: 'Card disputes', sub: 'A dispute is a customer asking their bank to take the money back. You have a few days to send proof; missing the date loses it automatically.', body: table({ id: 'rf-disputes', st: ui.rfD, cols, rows, rowId: (d) => d.id, caption: 'Card disputes', empty: emptyBlock({ ic: 'scale', title: 'No disputes', body: 'When a customer disputes a payment with their bank, it is listed here with a deadline.' }) }), flush: true });
}
actions['dp-open'] = (el) => {
  const d = S.disputes.find((x) => x.id === el.dataset.id), o = ord(d.oid), c = cus(d.cid), ev = evidenceFor(d);
  const need = d.status === 'needs_response';
  const outcome = d.status === 'won' ? `<p class="flex gap-2 rounded-md bg-good-bg p-2.5 text-sm text-good-fg">${icon('checkCircle', 'ic-sm mt-0.5 flex-none')}<span>Won. The bank accepted the proof and kept the payment. The $${d.fee} fee stays with the gateway.</span></p>` : d.status === 'lost' ? `<p class="flex gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg">${icon('xCircle', 'ic-sm mt-0.5 flex-none')}<span>Lost. ${money(d.amount)} and the $${d.fee} fee were taken back, and the customer is blocked.</span></p>` : d.status === 'under_review' ? `<p class="flex gap-2 rounded-md bg-sunken p-2.5 text-sm text-ink2">${icon('clock', 'ic-sm mt-0.5 flex-none')}<span>Evidence sent ${ago(d.submittedAt)}. The card network decides in 30 to 75 days. Nothing more to do.</span></p>` : '';
  modal({
    size: 'dlg-lg', title: `${d.id} · ${esc(d.code)}`, sub: `${esc(c.name)} · ${o.id} · ${lm(d.amount, d.cur)} · opened ${ago(d.opened)}`, noFooter: !need,
    body: `<div class="space-y-3">${outcome}${need ? `<p class="flex gap-2 rounded-md ${d.due - Date.now() < 3 * DAY ? 'bg-crit-bg text-crit-fg' : 'bg-warn-bg text-warn-fg'} p-2.5 text-sm">${icon('clock', 'ic-sm mt-0.5 flex-none')}<span>Evidence is due in <strong>${ageText(d.due - Date.now())}</strong>. Winning keeps ${money(d.amount)}; losing costs that plus a ${money0(d.fee)} fee.</span></p>` : ''}
      <div class="flex items-center gap-2"><h3 class="text-sm font-semibold">Evidence pack</h3>${badge(...ev.strength)}<span class="text-xs text-ink3">compiled from the order record</span></div>
      <ul class="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">${ev.rows.map((x) => `<li class="flex items-start gap-2.5 px-3 py-2 text-sm"><span class="mt-0.5 flex-none ${x.ok ? 'text-good-fg' : 'text-warn-fg'}">${icon(x.ok ? 'checkCircle' : 'alert', 'ic-sm')}</span><div class="min-w-0"><p class="font-medium">${x.title}</p><p class="text-ink2">${x.body}</p></div></li>`).join('')}</ul>
      ${need && ev.strength[2] === 'Weak' ? `<p class="text-sm text-ink2">The case is weak: no 3D Secure and little else to show. Accepting now avoids spending time on a likely loss. ${c.status === 'blocked' ? '' : 'The customer will be blocked either way.'}</p>` : ''}
      ${need ? `<div class="dlg-f -mx-4 -mb-4 mt-4"><button type="button" class="btn" data-close>Not now</button><button type="button" class="btn btn-danger" data-act="dp-accept" data-id="${d.id}">Accept the loss</button><button type="button" class="btn btn-primary" data-act="dp-submit" data-id="${d.id}">Submit evidence</button></div>` : ''}</div>`,
  });
};
actions['dp-submit'] = (el) => { closeDlg(); submitEvidence(el.dataset.id); toast({ kind: 'success', title: 'Evidence submitted', body: el.dataset.id + ' is now with the card network. You will be told the result.', ttl: 3600 }); };
actions['dp-accept'] = (el) => {
  const d = S.disputes.find((x) => x.id === el.dataset.id);
  closeDlg();
  confirmDlg({ title: 'Accept the loss on ' + d.id + '?', body: `<p>${money(d.amount)} and the ${money0(d.fee)} dispute fee are written off as a chargeback loss. The customer is blocked from ordering again.</p><p class="mt-2">This can’t be undone.</p>`, confirm: 'Accept ' + money(d.amount + d.fee) + ' loss', kind: 'danger', run: () => { acceptDispute(d.id); toast({ kind: 'info', title: d.id + ' closed as lost', body: 'The customer is blocked.', ttl: 3200 }); } });
};

/* ---------- payments ---------- */
function tabPayments() {
  const all = D(S.orders).filter((o) => isB2C(o)), m = ui.refunds.method;
  const rows = all.filter((o) => !m || o.pay.method === m);
  const methodRows = Object.keys(B2C_METHODS).map((k) => {
    const os = all.filter((o) => o.pay.method === k), vol = sum(os, (o) => o.gross), fees = sum(os, (o) => o.fee);
    const disp = S.disputes.filter((d) => os.some((o) => o.id === d.oid)).length, ref = S.refunds.filter((r) => r.status === 'completed' && os.some((o) => o.id === r.oid)).length;
    return { k, n: os.length, vol, fees, rate: vol ? (fees / vol) * 100 : 0, disp, ref };
  });
  const summary = `<div class="tbl-wrap"><table class="tbl" aria-label="Payment methods compared"><thead><tr><th scope="col">Method</th><th scope="col" class="num">Payments</th><th scope="col" class="num">Volume</th><th scope="col" class="num">Gateway fees</th><th scope="col" class="num hidden sm:table-cell">Fee rate</th><th scope="col" class="num hidden md:table-cell">Refunds</th><th scope="col" class="num hidden md:table-cell">Disputes</th></tr></thead><tbody>${methodRows.map((r) => `<tr><td class="font-medium">${B2C_METHODS[r.k].label}</td><td class="num">${r.n}</td><td class="num">${money0(r.vol)}</td><td class="num">${money(r.fees)}</td><td class="num hidden sm:table-cell">${pct(r.rate)}</td><td class="num hidden md:table-cell">${r.ref}</td><td class="num hidden md:table-cell">${r.disp}</td></tr>`).join('')}</tbody></table></div>`;
  const cols = [
    { key: 'id', label: 'Order', val: (o) => o.id, render: (o) => orderLink(o.id) },
    { key: 'who', label: 'Customer', hide: 'md', render: (o) => custLink(o.cid) },
    { key: 'method', label: 'Method', hide: 'sm', val: (o) => o.pay.method, render: (o) => `<span class="text-ink2">${B2C_METHODS[o.pay.method].label}</span><p class="text-2xs text-ink3">${esc(o.pay.brand)}</p>` },
    { key: 'gross', label: 'Paid', num: true, val: (o) => o.gross, render: (o) => `${lm(o.gross, o.cur)}${o.cur !== 'USD' ? `<p class="text-2xs text-ink3">${money(o.gross)}</p>` : ''}` },
    { key: 'fee', label: 'Fee', num: true, hide: 'lg', val: (o) => o.fee, render: (o) => money(o.fee) },
    { key: 'status', label: 'Payment', val: (o) => o.pay.status, render: (o) => chargeBadge(o.pay.status) },
    { key: 'created', label: 'When', hide: 'sm', val: (o) => o.created, render: (o) => `<span class="text-ink2">${ago(o.created)}</span>` },
  ];
  const seg = segEl([['', 'All methods'], ['card', 'Card'], ['wallet', 'Apple / Google Pay'], ['crypto', 'Crypto']], m, 'rf-method', '', 'Payment method');
  return `<div class="grid gap-4">${panel({ title: 'By payment method', sub: 'What each way of paying costs you and how often it ends in a refund or dispute.', body: summary, flush: true })}${panel({ title: 'Storefront payments', right: seg, body: table({ id: 'rf-payments', st: ui.rfP, cols, rows, rowId: (o) => o.id, pageSize: 12, caption: 'Storefront payments', empty: emptyBlock({ ic: 'wallet', title: 'No payments', body: 'Storefront payments appear here the moment they are captured.' }) }), flush: true })}</div>`;
}
actions['rf-method'] = (el) => { ui.refunds.method = el.dataset.v; ui.rfP.page = 1; render(); };

function pageRefunds() {
  const g = modeGate('Refunds & disputes', 'table');
  if (g) return g;
  const tab = ui.refunds.tab;
  const tabs = tabsEl([['refunds', 'Refunds', D(S.refunds).filter((r) => r.status === 'requested' || r.status === 'failed').length || null], ['disputes', 'Card disputes', D(S.disputes).filter((d) => d.status === 'needs_response').length || null], ['payments', 'Payments']], tab, 'refunds', 'Refund sections');
  const body = { refunds: tabRefunds, disputes: tabDisputes, payments: tabPayments }[tab]();
  return `${pageHead({ title: 'Refunds & disputes', sub: 'Money going back to storefront customers, and the bank claims that try to take it back.' })}${refundStrip()}<div class="mb-4">${tabs}</div>${body}`;
}
