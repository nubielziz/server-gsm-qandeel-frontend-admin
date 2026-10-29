/* Finance: ledger, deposit review, withdrawals, trial balance */
ui.finance.acct = '';
ui.fl = { sort: 'ts', dir: -1, page: 1 };
ui.fp = { sort: 'created', dir: -1, page: 1 };
ui.fw = { sort: 'created', dir: -1, page: 1 };
const acctName = (id) => ACCOUNTS.find((a) => a.id === id).name;
const payBadge = (s) => ({ pending: badge('b-warn', 'clock', 'Pending'), approved: badge('b-good', 'checkCircle', 'Approved'), rejected: badge('b-crit', 'xCircle', 'Rejected') }[s]);
const wdBadge = (s) => ({ pending: badge('b-warn', 'clock', 'Pending'), paid: badge('b-good', 'checkCircle', 'Paid'), rejected: badge('b-crit', 'xCircle', 'Rejected') }[s]);
const merLink = (id) => `<a class="link" href="#/merchants/${id}">${esc(mer(id).name)}</a>`;
const z = (v) => (ui.mode === 'empty' ? 0 : v);

function finStrip() {
  const pp = D(pendingPayments()), pw = D(pendingWithdrawals());
  const cells = [
    ['Bank', money0(z(S.acct.bank)), 'Cash received minus paid out'],
    ['Merchant wallets', money0(z(sum(Object.values(S.wallet), (v) => v))), 'What you owe merchants'],
    ['Held in open orders', money0(z(sum(Object.values(S.hold), (v) => v))), 'Reserved until each order settles'],
    ['Supplier prepaid', money0(z(S.acct.supplier_prepaid)), 'Balance across ' + S.suppliers.length + ' suppliers'],
    ['Waiting for review', money0(sum(pp, (p) => p.net) + sum(pw, (w) => w.amount)), pp.length + (pp.length === 1 ? ' deposit' : ' deposits') + ', ' + pw.length + (pw.length === 1 ? ' withdrawal' : ' withdrawals'), pp.length + pw.length ? 'text-warn-fg' : ''],
  ];
  return `<div class="panel mb-4 grid grid-cols-2 md:grid-cols-5 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line md:[&>*:nth-child(n+2)]:border-s md:[&>*:nth-child(n+2)]:border-line">${cells.map(([l, v, s, c]) => `<div class="p-3.5"><p class="text-xs text-ink3">${l}</p><p class="mt-1 text-lg font-semibold tabular-nums tracking-tight ${c || ''}">${v}</p><p class="mt-0.5 truncate text-xs text-ink3">${s}</p></div>`).join('')}</div>`;
}

function pageFinance() {
  const g = modeGate('Finance', 'table');
  if (g) return g;
  const st = ui.finance;
  const pp = D(pendingPayments()).length, pw = D(pendingWithdrawals()).length;
  const tabs = [['ledger', 'Ledger'], ['payments', 'Deposits', pp || null], ['withdrawals', 'Withdrawals', pw || null], ['accounts', 'Trial balance']];
  const body = { ledger: ledgerTab, payments: paymentsTab, withdrawals: withdrawalsTab, accounts: accountsTab }[st.tab]();
  const sub = pp + pw ? `<span class="font-medium text-warn-fg">${pp + pw} items need a decision.</span> Deposits and withdrawals change real balances, so each one is reviewed.` : 'Nothing is waiting. Every balance below comes from posted ledger entries.';
  return `${pageHead({ title: 'Finance', sub, actions: `<button class="btn" data-act="fin-export">${icon('download', 'ic-sm')}Export ledger CSV</button>` })}${finStrip()}<div class="panel">${tabsEl(tabs, st.tab, 'finance', 'Finance sections').replace('class="tabs"', 'class="tabs px-2"')}${body}</div>`;
}
actions['fin-export'] = () => toast({ kind: 'info', title: 'Export is not wired in the demo', body: 'In the real product this downloads the filtered ledger as CSV.' });

/* ---------- ledger ---------- */
function ledgerRows() {
  const st = ui.finance, q = norm(st.q);
  return D(S.journals).filter((j) => (!st.kind || j.kind === st.kind) && (!st.acct || j.entries.some((e) => e.acct === st.acct)) && (!q || norm(j.id + j.memo + (j.mid ? mer(j.mid).name : '') + (j.refId || '')).includes(q)));
}
function ledgerTab() {
  const st = ui.finance;
  const rows = ledgerRows();
  const cols = [
    { key: 'ts', label: 'Time', val: (j) => j.ts, render: (j) => `<span class="mono whitespace-nowrap text-ink2">${fmtDate(j.ts)}</span>` },
    { key: 'id', label: 'Journal', val: (j) => j.id, render: (j) => `<span class="mono font-medium">${j.id}</span>` },
    { key: 'kind', label: 'Type', val: (j) => KIND_LABEL[j.kind], render: (j) => `<span class="tag">${esc(KIND_LABEL[j.kind])}</span>` },
    { key: 'memo', label: 'Memo', hide: 'md', render: (j) => `<span class="block max-w-[360px] truncate text-ink2">${esc(j.memo)}</span>` },
    { key: 'who', label: 'Merchant', hide: 'lg', render: (j) => (j.mid && mer(j.mid) ? esc(mer(j.mid).name) : '<span class="text-ink3">—</span>') },
    { key: 'amount', label: 'Amount', num: true, val: (j) => j.amount, render: (j) => money(j.amount) },
    { key: 'by', label: 'By', hide: 'xl', render: (j) => `<span class="inline-flex items-center gap-1.5">${avatar(j.by)}${esc(j.by)}</span>` },
  ];
  const on = st.q || st.kind || st.acct;
  const empty = S.journals.length && ui.mode !== 'empty' ? emptyBlock({ ic: 'filter', title: 'No entries match', body: 'Try another search or remove a filter.', cta: '<button class="btn" data-act="fin-clear">Clear filters</button>' }) : emptyBlock({ ic: 'receipt', title: 'No ledger entries yet', body: 'Deposits, order holds and payouts are posted here as they happen. Each entry balances to zero.' });
  return `<div class="flex flex-wrap items-center gap-2 p-3">${searchEl('f-q', st.q, 'Search journal, memo, merchant')}${selectEl('f-kind', st.kind, [['', 'All types'], ...Object.entries(KIND_LABEL)], 'Filter by type', 'data-bind="f-kind"')}${st.acct ? `<button class="chip !h-8 !px-2.5 font-sans !text-sm" data-act="fin-acct-clear" aria-label="Remove account filter ${esc(acctName(st.acct))}">Account: ${esc(acctName(st.acct))}${icon('x', 'ic-xs')}</button>` : ''}${on ? '<button class="btn btn-ghost btn-sm" data-act="fin-clear">Clear filters</button>' : ''}<span class="flex-1"></span><span class="text-xs text-ink3" aria-live="polite">${num(rows.length)} ${rows.length === 1 ? 'entry' : 'entries'}</span></div><div class="border-t border-line">${table({ id: 'ledger', st: ui.fl, cols, rows, rowId: (j) => j.id, rowAct: 'jrn-open', empty, caption: 'Ledger journals' })}</div>`;
}
binds['f-q'] = (el) => { ui.finance.q = el.value; ui.fl.page = 1; render(); };
binds['f-kind'] = (el) => { ui.finance.kind = el.value; ui.fl.page = 1; render(); };
actions['fin-clear'] = () => { Object.assign(ui.finance, { q: '', kind: '', acct: '' }); ui.fl.page = 1; render(); };
actions['fin-acct-clear'] = () => { ui.finance.acct = ''; ui.fl.page = 1; render(); };
actions['jrn-open'] = (el) => {
  const j = S.journals.find((x) => x.id === el.dataset.id);
  if (!j) return;
  modal({ title: j.id + ' · ' + esc(KIND_LABEL[j.kind]), sub: fmtDate(j.ts) + ' · posted by ' + esc(j.by), size: 'dlg-lg', noFooter: true, body: `<p class="mb-3 text-sm text-ink2">${esc(j.memo)}</p>${journalTable(j)}<p class="mt-3 text-xs text-ink3">Debits equal credits. Posted entries are never edited. A mistake is fixed with a new reversing entry.</p>` });
};

/* ---------- deposits ---------- */
function paymentsTab() {
  const st = ui.finance;
  const all = D(S.payments);
  const cnt = (s) => all.filter((p) => p.status === s).length;
  const rows = st.payTab === 'all' ? all : all.filter((p) => p.status === st.payTab);
  const cols = [
    { key: 'created', label: 'Submitted', val: (p) => p.created, render: (p) => `<span class="whitespace-nowrap text-ink2">${ago(p.created)}</span>` },
    { key: 'id', label: 'Deposit', val: (p) => p.id, render: (p) => `<span class="mono font-medium">${p.id}</span>` },
    { key: 'mid', label: 'Merchant', val: (p) => mer(p.mid).name, render: (p) => `<span class="font-medium">${esc(mer(p.mid).name)}</span>${p.note ? `<p class="max-w-[380px] py-0.5 text-xs ${p.status === 'pending' ? 'text-warn-fg' : 'text-ink3'}">${esc(p.note)}</p>` : ''}` },
    { key: 'method', label: 'Method', hide: 'md', val: (p) => METHODS[p.method].label, render: (p) => esc(METHODS[p.method].label) },
    { key: 'gross', label: 'Amount', num: true, val: (p) => p.gross, render: (p) => money(p.gross) },
    { key: 'net', label: 'Credited', num: true, hide: 'lg', val: (p) => p.net, render: (p) => `${money(p.net)}${p.fee ? `<p class="text-xs text-ink3">fee ${money(p.fee)}</p>` : ''}` },
    { key: 'status', label: 'Status', val: (p) => p.status, render: (p) => payBadge(p.status) },
    { key: 'act', label: '', cls: 'w-24', render: (p) => `<span class="btn btn-sm" aria-hidden="true">${p.status === 'pending' ? 'Review' : 'Details'}</span>` },
  ].filter((c) => c.key !== 'status' || st.payTab === 'all'); // the filter already says which status every row has
  const empty = st.payTab === 'pending' && all.length ? emptyBlock({ ic: 'checkCircle', title: 'No deposits waiting', body: 'Bank, USDT and Wise deposits appear here until someone checks the proof of payment. Card deposits are credited automatically.', cta: '<button class="btn" data-act="pay-tab" data-v="all">See all deposits</button>' }) : emptyBlock({ ic: 'receipt', title: 'No deposits yet', body: 'When a merchant pays by bank, USDT, Wise or card it shows up here.' });
  const seg = `<div class="seg" role="group" aria-label="Deposit status">${[['pending', 'Pending', cnt('pending')], ['approved', 'Approved', cnt('approved')], ['rejected', 'Rejected', cnt('rejected')], ['all', 'All', all.length]].map(([v, l, n]) => `<button type="button" aria-pressed="${st.payTab === v}" data-act="pay-tab" data-v="${v}">${l} <span class="tabular-nums text-ink3">${n}</span></button>`).join('')}</div>`;
  return `<div class="flex flex-wrap items-center gap-2 p-3">${seg}<span class="flex-1"></span><span class="text-xs text-ink3">Card deposits are credited on payment and skip review.</span></div><div class="border-t border-line">${table({ id: 'pay', st: ui.fp, cols, rows, rowId: (p) => p.id, rowAct: 'pay-open', empty, caption: 'Deposits' })}</div>`;
}
actions['pay-tab'] = (el) => { ui.finance.payTab = el.dataset.v; ui.fp.page = 1; render(); };
function payDialog(id) {
  const p = pay(id), m = mer(p.mid);
  const fresh = p.status === 'pending';
  const ms = merStats(m.id, 30);
  const proof = p.receipt ? `<dt>Receipt</dt><dd class="flex items-center gap-1.5">${icon('file', 'ic-sm text-ink3')}<span class="mono">${esc(p.receipt)}</span></dd>` : '';
  const warn = p.note && fresh ? `<div class="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="note">${icon('alert', 'mt-px flex-none')}<span>${esc(p.note)}</span></div>` : '';
  const rej = p.status === 'rejected' ? `<div class="flex gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg" role="note">${icon('xCircle', 'mt-px flex-none')}<span>Rejected by ${esc(p.reviewedBy)} ${ago(p.reviewedAt)}: ${esc(p.note)}</span></div>` : '';
  const foot = fresh ? `<div class="dlg-f -mx-4 -mb-4 mt-4"><button type="button" class="btn" data-close>Close</button><button type="button" class="btn btn-danger" data-act="pay-reject" data-id="${p.id}">Reject…</button><button type="button" class="btn btn-primary" data-act="pay-approve" data-id="${p.id}">${icon('check', 'ic-sm')}Approve and credit ${money(p.net)}</button></div>` : `<div class="dlg-f -mx-4 -mb-4 mt-4"><button type="button" class="btn" data-act="journal" data-rt="payment" data-rid="${p.id}" data-title="Ledger entries for ${p.id}">View ledger entries</button><button type="button" class="btn btn-primary" data-close>Close</button></div>`;
  modal({ title: (fresh ? 'Review deposit ' : 'Deposit ') + p.id, sub: esc(m.name) + ' · ' + esc(METHODS[p.method].label), noFooter: true,
    body: `<div class="space-y-3">${warn}${rej}<dl class="dl !grid-cols-[120px_1fr]"><dt>Merchant</dt><dd>${merLink(m.id)} <span class="text-ink3">· ${GROUPS.find((g) => g.id === m.group).name}</span></dd><dt>Submitted</dt><dd>${fmtDate(p.created)} (${ago(p.created)})</dd><dt>Reference</dt><dd class="mono break-all">${esc(p.ref)}</dd>${proof}<dt>Amount paid</dt><dd class="font-medium tabular-nums">${money(p.gross)}</dd><dt>Fee</dt><dd class="tabular-nums">${p.fee ? money(p.fee) + ' (' + pct((p.fee / p.gross) * 100, 0) + ')' : 'None'}</dd><dt>Credited to wallet</dt><dd class="font-medium tabular-nums">${money(p.net)}</dd><dt>Wallet now</dt><dd class="tabular-nums">${money(walletOf(m.id))}${fresh ? ` <span class="text-ink3">→ ${money(walletOf(m.id) + p.net)}</span>` : ''}</dd><dt>Spend, 30 days</dt><dd class="tabular-nums">${money0(ms.spend)} in ${ms.orders} orders</dd></dl>${fresh ? '<p class="text-xs text-ink3">Check that the amount on the proof matches the amount above before approving. Approval credits the wallet immediately.</p>' : ''}</div>${foot}` });
}
actions['pay-open'] = (el) => payDialog(el.dataset.id);
actions['pay-approve'] = (el) => { const p = pay(el.dataset.id); reviewPayment(p.id, true); closeDlg(); toast({ kind: 'success', title: p.id + ' approved', body: money(p.net) + ' credited to ' + mer(p.mid).name + '. Wallet is now ' + money(walletOf(p.mid)) + '.', action: { label: 'View entries', run: () => showJournals('payment', p.id, 'Ledger entries for ' + p.id) } }); };
actions['pay-reject'] = (el) => {
  const p = pay(el.dataset.id);
  modal({ title: 'Reject ' + p.id, sub: esc(mer(p.mid).name) + ' · ' + money(p.gross), confirm: 'Reject deposit', kind: 'danger', body: `<div class="space-y-3">${field('Reason', selectEl('why', '', [['', 'Choose a reason'], ['Receipt amount does not match the transfer', 'Receipt amount does not match'], ['Payment not received in the bank account', 'Payment not received'], ['Transaction hash not found on-chain', 'Transaction hash not found'], ['Receipt is unreadable or incomplete', 'Receipt unreadable'], ['Other', 'Other']], 'Reason', '', 'w-full'))}${field('Message to merchant', '<textarea class="input min-h-[72px] py-2" name="note" rows="3" placeholder="Visible to the merchant"></textarea>')}<p class="text-xs text-ink3">The merchant’s wallet is not changed. They see the reason and can submit a new deposit.</p></div>`,
    onSubmit: (f) => { if (!f.why.value) { f.why.setAttribute('aria-invalid', 'true'); return 'Choose a reason so the merchant knows what to fix.'; } reviewPayment(p.id, false, (f.why.value === 'Other' ? '' : f.why.value) + (f.note.value.trim() ? (f.why.value === 'Other' ? '' : '. ') + f.note.value.trim() : '') || 'Rejected'); toast({ kind: 'info', title: p.id + ' rejected', body: mer(p.mid).name + ' was told why. No money moved.' }); return true; } });
};

/* ---------- withdrawals ---------- */
function withdrawalsTab() {
  const all = D(S.withdrawals);
  const cols = [
    { key: 'created', label: 'Requested', val: (w) => w.created, render: (w) => `<span class="whitespace-nowrap text-ink2">${ago(w.created)}</span>` },
    { key: 'id', label: 'Request', val: (w) => w.id, render: (w) => `<span class="mono font-medium">${w.id}</span>` },
    { key: 'mid', label: 'Merchant', val: (w) => mer(w.mid).name, render: (w) => `<span class="font-medium">${esc(mer(w.mid).name)}</span>` },
    { key: 'method', label: 'Method', hide: 'md', render: (w) => esc(w.method) },
    { key: 'amount', label: 'Amount', num: true, val: (w) => w.amount, render: (w) => money(w.amount) },
    { key: 'wallet', label: 'Wallet now', num: true, hide: 'lg', val: (w) => walletOf(w.mid), render: (w) => `<span class="${walletOf(w.mid) < w.amount && w.status === 'pending' ? 'font-medium text-crit-fg' : ''}">${money(walletOf(w.mid))}</span>` },
    { key: 'status', label: 'Status', val: (w) => w.status, render: (w) => wdBadge(w.status) },
    { key: 'act', label: '', cls: 'w-24', render: (w) => `<span class="btn btn-sm" aria-hidden="true">${w.status === 'pending' ? 'Review' : 'Details'}</span>` },
  ];
  const empty = emptyBlock({ ic: 'upload', title: 'No withdrawal requests', body: 'When a merchant asks to take money out of their wallet, the request lands here for approval.' });
  return `<div class="border-t border-line">${table({ id: 'wd', st: ui.fw, cols, rows: all, rowId: (w) => w.id, rowAct: 'wd-open', empty, caption: 'Withdrawals' })}</div>`;
}
function wdDialog(id) {
  const w = IDX.w.get(id), m = mer(w.mid);
  const fresh = w.status === 'pending';
  const bal = walletOf(m.id);
  const short = fresh && bal < w.amount;
  const foot = fresh ? `<div class="dlg-f -mx-4 -mb-4 mt-4"><button type="button" class="btn" data-close>Close</button><button type="button" class="btn btn-danger" data-act="wd-reject" data-id="${w.id}">Reject</button><button type="button" class="btn btn-primary" data-act="wd-pay" data-id="${w.id}" ${short ? 'disabled' : ''}>${icon('check', 'ic-sm')}Approve and mark paid</button></div>` : `<div class="dlg-f -mx-4 -mb-4 mt-4"><button type="button" class="btn" data-act="journal" data-rt="withdrawal" data-rid="${w.id}" data-title="Ledger entries for ${w.id}">View ledger entries</button><button type="button" class="btn btn-primary" data-close>Close</button></div>`;
  modal({ title: (fresh ? 'Review withdrawal ' : 'Withdrawal ') + w.id, sub: esc(m.name) + ' · ' + money(w.amount) + ' by ' + esc(w.method), noFooter: true,
    body: `<div class="space-y-3">${short ? `<div class="flex gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg" role="alert">${icon('alert', 'mt-px flex-none')}<span>The wallet holds ${money(bal)}, less than the ${money(w.amount)} requested. Reject it or ask the merchant to request less.</span></div>` : ''}<dl class="dl !grid-cols-[120px_1fr]"><dt>Merchant</dt><dd>${merLink(m.id)}</dd><dt>Requested</dt><dd>${fmtDate(w.created)} (${ago(w.created)})</dd><dt>Method</dt><dd>${esc(w.method)}</dd><dt>Amount</dt><dd class="font-medium tabular-nums">${money(w.amount)}</dd><dt>Wallet now</dt><dd class="tabular-nums">${money(bal)}${fresh && !short ? ` <span class="text-ink3">→ ${money(bal - w.amount)} after payout</span>` : ''}</dd><dt>Held in orders</dt><dd class="tabular-nums">${money(holdOf(m.id))}</dd>${w.reviewedBy ? `<dt>${w.status === 'paid' ? 'Paid by' : 'Reviewed by'}</dt><dd>${esc(w.reviewedBy)} ${ago(w.reviewedAt)}</dd>` : ''}</dl>${fresh ? '<p class="text-xs text-ink3">Send the money first, then mark it paid. This debits the wallet and credits Bank.</p>' : ''}</div>${foot}` });
}
actions['wd-open'] = (el) => wdDialog(el.dataset.id);
actions['wd-pay'] = (el) => { const w = IDX.w.get(el.dataset.id); const r = reviewWithdrawal(w.id, true); if (r && r.error) return toast({ kind: 'error', title: 'Can’t approve ' + w.id, body: r.error }); closeDlg(); toast({ kind: 'success', title: w.id + ' marked paid', body: money(w.amount) + ' debited from ' + mer(w.mid).name + '. Wallet is now ' + money(walletOf(w.mid)) + '.' }); };
actions['wd-reject'] = (el) => { const w = IDX.w.get(el.dataset.id); confirmDlg({ title: 'Reject ' + w.id + '?', confirm: 'Reject request', kind: 'danger', body: `<p>${esc(mer(w.mid).name)}’s wallet stays at ${money(walletOf(w.mid))}. They see that the request was rejected.</p>`, run: () => { reviewWithdrawal(w.id, false); toast({ kind: 'info', title: w.id + ' rejected', body: 'No money moved.' }); } }); };

/* ---------- trial balance ---------- */
function accountsTab() {
  const rows = ACCOUNTS.map((a) => { const v = z(S.acct[a.id] || 0); return { a, dr: v > 0 ? v : 0, cr: v < 0 ? -v : 0 }; });
  const tdr = round(sum(rows, (r) => r.dr), 2), tcr = round(sum(rows, (r) => r.cr), 2);
  const wallets = round(sum(Object.values(S.wallet), (v) => v), 2);
  const ok = Math.abs(tdr - tcr) < 0.005;
  const checks = [
    [ok, 'Debits equal credits', money(tdr) + ' on both sides'],
    [Math.abs(wallets - z(-S.acct.client_wallet || 0)) < 0.005, 'Client wallets account equals the sum of merchant wallets', money(wallets)],
    [Math.abs(sum(Object.values(S.prepaid), (v) => v) - z(S.acct.supplier_prepaid || 0)) < 0.005, 'Supplier prepaid account equals the sum of supplier balances', money(z(S.acct.supplier_prepaid || 0))],
  ];
  return `<div class="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"><div class="border-b border-line xl:border-b-0 xl:border-e"><div class="tbl-wrap"><table class="tbl" aria-label="Trial balance"><thead><tr><th scope="col">Account</th><th scope="col">Type</th><th scope="col" class="num">Debit</th><th scope="col" class="num">Credit</th><th scope="col" class="w-24"><span class="sr-only">Entries</span></th></tr></thead><tbody>${rows.map(({ a, dr, cr }) => `<tr><td class="font-medium">${a.name}<span class="mono ms-2 text-2xs text-ink3">${a.id}</span></td><td class="text-ink2">${a.type}</td><td class="num">${dr ? money(dr) : '<span class="text-ink3">—</span>'}</td><td class="num">${cr ? money(cr) : '<span class="text-ink3">—</span>'}</td><td class="text-end"><button class="btn btn-ghost btn-sm" data-act="fin-acct" data-id="${a.id}" aria-label="View ledger entries for ${esc(a.name)}">Entries</button></td></tr>`).join('')}</tbody><tfoot><tr class="font-medium"><td colspan="2">Total</td><td class="num">${money(tdr)}</td><td class="num">${money(tcr)}</td><td></td></tr></tfoot></table></div></div>
  <div class="p-3.5"><h3 class="panel-t">Integrity checks</h3><ul class="m-0 mt-2 list-none space-y-2.5 p-0">${checks.map(([good, t, d]) => `<li class="flex items-start gap-2.5">${good ? `<span class="mt-px text-good-fg">${icon('checkCircle', 'ic-sm')}</span>` : `<span class="mt-px text-crit-fg">${icon('xCircle', 'ic-sm')}</span>`}<div class="min-w-0"><p class="text-sm font-medium">${t}</p><p class="text-xs text-ink3">${good ? 'Passes' : 'Does not match'}. ${d}</p></div></li>`).join('')}</ul><p class="mt-4 text-xs text-ink3">Balances are never stored directly. They are the sum of posted journal entries, so any number on this page can be traced to the entries behind it.</p></div></div>`;
}
actions['fin-acct'] = (el) => { ui.finance.acct = el.dataset.id; ui.finance.tab = 'ledger'; ui.fl.page = 1; render(); };
