/* Settings for the storefront: how customers pay, what tax and currency they see, the policies they agree to, and the emails they get. */
ui.stT = { sort: '', dir: 1, page: 1, sel: new Set() };
ui.stF = { sort: '', dir: 1, page: 1, sel: new Set() };
ui.stN = { sort: '', dir: 1, page: 1, sel: new Set() };

/* ---------- payment methods ---------- */
function gatewayCard(g) {
  return `<article class="panel p-3.5" aria-label="${esc(g.name)}"><div class="flex items-start gap-3"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-semibold">${esc(g.name)}</h3>${typeTag(g.audience)}${badge(g.mode === 'Live' ? 'b-good' : 'b-neutral', g.mode === 'Live' ? 'bolt' : 'file', g.mode)}</div><p class="mt-1 text-sm text-ink2">${esc(g.desc)}</p></div>${switchEl(g.on, 'st-gw', g.id, (g.on ? 'Turn off ' : 'Turn on ') + g.name)}</div>
    ${kv([['Pays with', esc(g.methods)], ['Fee', esc(g.fee)], ['Refunds', g.refunds ? 'Sent back automatically' : 'By hand'], ['3D Secure', g.threeDS ? 'Required' : 'Not applicable'], ['Volume, 30 days', g.volume ? money0(g.volume) : '<span class="text-ink3">–</span>']])}</article>`;
}
function tabGateways() {
  const gws = D(S.settings.gateways), pubOn = gws.filter((g) => g.on && /B2C/.test(g.audience));
  const warn = gws.length && !pubOn.length ? `<div class="mb-4 flex gap-2 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">${icon('alert', 'ic-sm mt-0.5 flex-none')}<span><strong class="font-medium">Customers can’t pay.</strong> Every storefront payment method is off, so the checkout shows no way to pay. Turn one on.</span></div>` : '';
  return `${warn}<div class="grid gap-4 md:grid-cols-2">${gws.map(gatewayCard).join('') || emptyBlock({ ic: 'wallet', title: 'No payment methods', body: 'Connect a card gateway to start selling.' })}</div>
    <p class="mt-3 text-xs text-ink3">Storefront payments are taken before an order is sent anywhere. Merchants on the API pay from their wallet instead, so bank transfer and Wise only apply to them.</p>`;
}
actions['st-gw'] = (el) => {
  const g = S.settings.gateways.find((x) => x.id === el.dataset.id), on = !g.on;
  if (!on && g.audience.includes('B2C')) {
    const others = S.settings.gateways.filter((x) => x.id !== g.id && x.on && x.audience.includes('B2C'));
    if (!others.length) { confirmDlg({ title: 'Turn off the last storefront payment method?', body: '<p>Customers will not be able to pay. The checkout keeps working but shows no payment option.</p>', confirm: 'Turn off', kind: 'danger', run: () => { setGateway(g.id, false); toast({ kind: 'info', title: g.name + ' is off', ttl: 2400 }); } }); return; }
  }
  setGateway(g.id, on);
  toast({ kind: 'success', title: g.name + (on ? ' is on' : ' is off'), body: on ? 'Customers can pay with it at checkout.' : 'It no longer shows at checkout.', ttl: 2600 });
};

/* ---------- tax and currency ---------- */
function tabTax() {
  const taxes = D(S.settings.taxes), cur = D(S.settings.currencies), stale = staleCurrencies();
  const tcols = [
    { key: 'name', label: 'Country', render: (t) => `<p class="font-medium">${esc(t.name)}</p><p class="text-2xs text-ink3">${t.cc}</p>` },
    { key: 'rate', label: 'Added to the price', num: true, render: (t) => (t.rate ? pct(t.rate) + ' ' + t.type : '<span class="text-ink3">No tax</span>') },
    { key: 'scheme', label: 'Reported through', hide: 'sm', render: (t) => (t.scheme === 'Not collected' ? '<span class="text-ink3">Not collected</span>' : `<span class="text-ink2">${esc(t.scheme)}</span>`) },
    { key: 'since', label: 'Rate since', hide: 'md', render: (t) => `<span class="text-ink2">${fmtDay(t.since)}</span>` },
  ];
  const ccols = [
    { key: 'code', label: 'Currency', render: (c) => `<p class="font-medium">${c.code}</p><p class="text-2xs text-ink3">${c.code === 'USD' ? 'Base currency' : B2C_SYM[c.code] ? 'Shown as ' + B2C_SYM[c.code] : ''}</p>` },
    { key: 'rate', label: 'Per $1', num: true, render: (c) => `<span class="tabular-nums">${c.rate}</span>` },
    { key: 'markup', label: 'Markup', num: true, hide: 'sm', render: (c) => (c.code === 'USD' ? '<span class="text-ink3">–</span>' : pct(c.markup)) },
    { key: 'updated', label: 'Rate updated', render: (c) => (c.code === 'USD' ? '<span class="text-ink3">–</span>' : Date.now() - c.updated > 24 * HOUR ? `<span class="inline-flex items-center gap-1 font-medium text-warn-fg">${icon('alert', 'ic-xs')}${ago(c.updated)}</span>` : `<span class="text-ink2">${ago(c.updated)}</span>`) },
    { key: 'shown', label: 'Offered', render: (c) => (c.code === 'USD' ? '<span class="text-ink3">Always</span>' : switchEl(c.shown, 'st-fx-shown', c.code, 'Offer prices in ' + c.code)) },
    { key: 'a', label: '', render: (c) => (c.code === 'USD' ? '' : `<div class="flex justify-end gap-1.5"><button class="btn btn-sm" data-act="st-fx-refresh" data-id="${c.code}">${icon('refresh', 'ic-xs')}Refresh</button><button class="btn btn-sm" data-act="st-fx-edit" data-id="${c.code}">Markup</button></div>`) },
  ];
  const banner = stale.length ? `<div class="flex flex-wrap items-center gap-3 border-b border-line bg-warn-bg px-3.5 py-2.5 text-sm text-warn-fg">${icon('alert', 'ic-sm flex-none')}<span class="min-w-0 flex-1">The ${stale.map((c) => c.code).join(', ')} rate is ${ago(Math.min(...stale.map((c) => c.updated)))} old. Customers are quoted a price that may be off by a few percent.</span><button class="btn btn-sm" data-act="st-fx-all">Refresh now</button></div>` : '';
  return `<div class="grid gap-4">${panel({ title: 'Currencies', sub: 'Prices are set in dollars and shown in the customer’s currency, rounded to a clean ending. The rate is fixed on the order, so a later move does not change what they paid.', body: banner + table({ id: 'st-fx', st: ui.stF, cols: ccols, rows: cur, rowId: (c) => c.code, sortable: false, pageSize: 0, caption: 'Currencies', empty: emptyBlock({ ic: 'globe', title: 'No currencies', body: 'Add the currencies you want to show.' }) }), flush: true })}
    ${panel({ title: 'Tax by country', sub: 'The price shown to a customer already includes tax for their country. This is what is added, not what you must register for: your accountant decides where you report it.', body: table({ id: 'st-tax', st: ui.stT, cols: tcols, rows: taxes, rowId: (t) => t.cc, sortable: false, pageSize: 0, caption: 'Tax by country', empty: emptyBlock({ ic: 'percent', title: 'No countries', body: 'Add the countries you sell to.' }) }), flush: true })}</div>`;
}
actions['st-fx-shown'] = (el) => { const c = S.settings.currencies.find((x) => x.code === el.dataset.id); setFx(c.code, { shown: !c.shown }); toast({ kind: 'success', title: c.code + (c.shown ? ' is offered' : ' is hidden'), ttl: 2200 }); };
actions['st-fx-refresh'] = (el) => { refreshFx(el.dataset.id); const c = S.settings.currencies.find((x) => x.code === el.dataset.id); toast({ kind: 'success', title: c.code + ' rate refreshed', body: '1 USD = ' + c.rate + ' ' + c.code, ttl: 2600 }); };
actions['st-fx-all'] = () => { const s = staleCurrencies(); s.forEach((c) => refreshFx(c.code)); toast({ kind: 'success', title: s.length + (s.length === 1 ? ' rate refreshed' : ' rates refreshed'), ttl: 2600 }); };
actions['st-fx-edit'] = (el) => {
  const c = S.settings.currencies.find((x) => x.code === el.dataset.id);
  modal({ title: c.code + ' markup', sub: 'Added on top of the market rate to cover exchange fees and small moves.',
    body: field('Markup (%)', `<input class="input mono" name="m" type="text" inputmode="decimal" value="${c.markup}" autocomplete="off">`, 'Typical: 1 to 3. Above 5 customers will notice.'),
    confirm: 'Save',
    onSubmit: (f) => { const v = parseFloat(f.m.value); if (!(v >= 0 && v <= 10)) { f.m.setAttribute('aria-invalid', 'true'); return 'Enter a markup between 0 and 10.'; } setFx(c.code, { markup: v }); toast({ kind: 'success', title: c.code + ' markup is ' + pct(v), ttl: 2400 }); return true; } });
};

/* ---------- policies ---------- */
const POLICY_ROWS = [
  { key: 'guestCheckout', label: 'Guest checkout', hint: 'Customers can buy with just an email. Off means everyone must create an account first, which loses most first-time buyers.' },
  { key: 'require3ds', label: 'Require 3D Secure', hint: 'The bank checks the cardholder. Fewer fraud chargebacks, a few more abandoned payments. This is also the 3D Secure rule under Risk & checks.' },
  { key: 'withdrawalWaiver', label: 'Ask for the cancel-right waiver at checkout', hint: 'In the UK and EU, a digital service that starts at once only skips the 14-day cancel right if the customer clearly agrees. Have a lawyer confirm the wording for each country you sell to.' },
  { key: 'autoRefundFailed', label: 'Refund failed unlocks automatically', hint: 'When a supplier rejects the order, the customer is refunded without waiting for a person.' },
  { key: 'imeiPrecheck', label: 'Check the IMEI before payment', hint: 'A blacklisted phone is turned away before the customer pays, so no refund is ever needed.' },
  { key: 'refundHoursBeforeDispatch', label: 'Cancel freely within', unit: 'hours of paying, if not yet sent', hint: 'Until the order goes to a supplier the customer can cancel on their own.' },
  { key: 'abandonedMinutes', label: 'Send a reminder after', unit: 'minutes at checkout', hint: 'One email to people who left an address and did not pay.' },
  { key: 'imeiRetentionDays', label: 'Keep the IMEI for', unit: 'days after the order', hint: 'Then it is removed from the order. An IMEI tied to a person is personal data, so keep this as short as support allows.' },
];
function tabPolicies() {
  const p = S.settings.policies;
  const rows = POLICY_ROWS.map((r) => {
    const ctl = typeof p[r.key] === 'boolean' ? switchEl(p[r.key], 'st-pol', r.key, (p[r.key] ? 'Turn off: ' : 'Turn on: ') + r.label) : `<label class="flex items-center gap-2 text-sm"><span class="sr-only">${esc(r.label)}</span><input class="input w-20 text-end tabular-nums" type="text" inputmode="numeric" value="${p[r.key]}" data-bind="st-polv" data-id="${r.key}" autocomplete="off"><span class="text-ink3">${esc(r.unit)}</span></label>`;
    const danger = (r.key === 'withdrawalWaiver' && !p.withdrawalWaiver) || (r.key === 'require3ds' && !p.require3ds);
    return `<li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3"><div class="min-w-0 flex-1 basis-72"><p class="text-sm font-medium">${esc(r.label)}</p><p class="text-xs text-ink3">${esc(r.hint)}</p>${danger ? `<p class="mt-1 flex items-center gap-1.5 text-xs font-medium text-warn-fg">${icon('alert', 'ic-xs')}${r.key === 'require3ds' ? 'Without 3D Secure the bank can blame you for fraud chargebacks.' : 'Without this, customers can cancel for 14 days after you have already paid the supplier.'}</p>` : ''}</div>${ctl}</li>`;
  }).join('');
  return panel({ title: 'Policies', sub: 'The rules customers agree to at checkout. Changes apply to the next order and are written to the audit log.', body: `<ul class="m-0 list-none divide-y divide-line p-0">${rows}</ul>`, flush: true });
}
actions['st-pol'] = (el) => { const k = el.dataset.id, was = S.settings.policies[k]; setPolicy(k, !was); toast({ kind: 'success', title: POLICY_LABEL[k] + (!was ? ' is on' : ' is off'), ttl: 2400 }); };
binds['st-polv'] = (el, e) => {
  if (e && e.type !== 'change') return;
  const k = el.dataset.id, v = parseInt(el.value, 10);
  if (!(v >= 0 && v <= 3650)) { toast({ kind: 'error', title: 'Enter a number', ttl: 2200 }); render(); return; }
  if (v !== S.settings.policies[k]) { setPolicy(k, v); toast({ kind: 'success', title: 'Saved', ttl: 1800 }); }
};

/* ---------- notifications ---------- */
const NOTIF_SAMPLE = {
  nt1: ['Your order SF-20431 is confirmed', 'Hi Daniel, thanks for your order. We received £14.39 for "Vodafone UK iPhone Unlock". Your receipt is attached and shows the VAT. We will email you the result as soon as the carrier confirms it, usually within a few hours.'],
  nt2: ['Your unlock is ready', 'Hi Daniel, good news: the carrier confirmed the unlock for SF-20431. Insert a SIM from another network and restart the phone. If anything is unclear, just reply to this email.'],
  nt3: ['We couldn’t unlock order SF-20431', 'Hi Daniel, the carrier rejected this unlock, so we have refunded £14.39 to your card. It can take 5 to 10 days to appear. We are sorry it did not work out.'],
  nt4: ['Re: Where is my result?', 'Hi Daniel, thanks for your patience. We checked with the carrier and… (the text of the agent’s reply). Reply to this email to keep the conversation going.'],
  nt5: ['You left something behind', 'Hi, you started an unlock for an iPhone 13 and did not finish paying. Your basket is saved: one tap takes you back to the payment step. No account needed.'],
  nt6: ['Your payment didn’t go through', 'Hi, the payment for your unlock was declined by your bank, so we did not start it. Nothing was charged. You can try again or use another card.'],
};
function tabNotifs() {
  const ns = D(S.settings.notifs);
  const cols = [
    { key: 'event', label: 'Email', render: (n) => `<p class="font-medium">${esc(n.event)}</p><p class="text-2xs text-ink3">${esc(n.audience)} · ${esc(n.delay)}</p>` },
    { key: 'sent', label: 'Sent, 30 days', num: true, hide: 'sm', render: (n) => (n.sent ? num(n.sent) : '<span class="text-ink3">0</span>') },
    { key: 'a', label: '', render: (n) => `<button class="btn btn-sm" data-act="st-nt-view" data-id="${n.id}">Preview</button>` },
    { key: 'on', label: 'Send', render: (n) => switchEl(n.on, 'st-nt', n.id, (n.on ? 'Turn off: ' : 'Turn on: ') + n.event) },
  ];
  return panel({ title: 'Customer emails', sub: 'What customers receive after they pay. Receipts and delivery emails should stay on: they are the proof that the service was delivered.', body: table({ id: 'st-notifs', st: ui.stN, cols, rows: ns, rowId: (n) => n.id, sortable: false, pageSize: 0, caption: 'Customer emails', empty: emptyBlock({ ic: 'mail', title: 'No emails', body: 'Emails to customers are configured here.' }) }), flush: true });
}
actions['st-nt'] = (el) => {
  const n = S.settings.notifs.find((x) => x.id === el.dataset.id), on = !n.on;
  if (!on && ['nt1', 'nt2', 'nt3'].includes(n.id)) { confirmDlg({ title: 'Turn off “' + n.event + '”?', body: '<p>Customers will not get this email. Without a receipt or a delivery email you have no proof to send when a customer disputes a charge.</p>', confirm: 'Turn off', kind: 'danger', run: () => { setNotif(n.id, false); toast({ kind: 'info', title: n.event + ' is off', ttl: 2400 }); } }); return; }
  setNotif(n.id, on);
  toast({ kind: 'success', title: n.event + (on ? ' is on' : ' is off'), ttl: 2400 });
};
actions['st-nt-view'] = (el) => {
  const n = S.settings.notifs.find((x) => x.id === el.dataset.id), [subj, body] = NOTIF_SAMPLE[n.id] || ['', ''];
  modal({ title: n.event, sub: esc(n.audience) + ' · ' + esc(n.delay), noFooter: true,
    body: `<div class="rounded-lg border border-line"><div class="border-b border-line bg-sunken px-3.5 py-2 text-xs text-ink3">From GSM Supply &lt;support@gsmsupply.example&gt;<br>Subject: <span class="text-ink">${esc(subj)}</span></div><p class="px-3.5 py-3 text-sm text-ink2">${esc(body)}</p></div><p class="mt-2 text-xs text-ink3">A sample with made-up details.</p>` });
};

function pageSettings() {
  const g = modeGate('Settings', 'table');
  if (g) return g;
  const tab = ui.settings.tab, stale = staleCurrencies().length;
  const tabs = tabsEl([['payments', 'Payment methods'], ['tax', 'Tax and currency', stale || null], ['policies', 'Policies'], ['notifications', 'Customer emails']], tab, 'settings', 'Settings sections');
  const body = { payments: tabGateways, tax: tabTax, policies: tabPolicies, notifications: tabNotifs }[tab]();
  return `${pageHead({ title: 'Settings', sub: 'How the storefront takes money, shows prices and talks to customers.' })}<div class="mb-4">${tabs}</div>${body}`;
}
