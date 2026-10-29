/* Audit log: who changed what, grouped by day, with before/after */
ui.audit.open = new Set();
ui.audit.limit = 60;
const TYPE_LABEL = { merchant: 'Merchant', order: 'Order', service: 'Service', supplier: 'Supplier', payment: 'Deposit', withdrawal: 'Withdrawal', plan: 'Plan', session: 'Session', customer: 'Customer', admin: 'Admin', access: 'IP rule', checkout: 'Checkout', refund: 'Refund', dispute: 'Dispute', ticket: 'Ticket', listing: 'Storefront', blocklist: 'Blocklist', legal: 'Legal document', setting: 'Setting' };
function auditEntity(a) {
  if (a.type === 'session') return '';
  const l = esc(a.label);
  if (a.type === 'merchant' && mer(a.eid)) return `<a class="link" href="#/merchants/${a.eid}">${l}</a>`;
  if (a.type === 'order' && ord(a.eid)) return `<button class="link" data-act="order-open" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'supplier' && sup(a.eid)) return `<button class="link" data-act="aud-go" data-route="suppliers" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'service' && svc(a.eid)) return `<button class="link" data-act="aud-go" data-route="services" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'payment') return `<button class="link" data-act="aud-go" data-route="finance-pay" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'withdrawal') return `<button class="link" data-act="aud-go" data-route="finance-wd" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'customer' && cus(a.eid)) return `<a class="link" href="#/customers/${a.eid}">${l}</a>`;
  if (a.type === 'refund' || a.type === 'dispute') return `<button class="link" data-act="aud-go" data-route="refunds" data-id="${a.type === 'dispute' ? 'disputes' : 'refunds'}">${l}</button>`;
  if (a.type === 'ticket' && tkt(a.eid)) return `<button class="link" data-act="aud-go" data-route="support" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'blocklist') return `<button class="link" data-act="aud-go" data-route="risk" data-id="blocklist">${l}</button>`;
  if (a.type === 'admin' && adm(a.eid)) return `<button class="link" data-act="aud-go" data-route="access" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'access') return `<button class="link" data-act="aud-go" data-route="access" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'checkout') return `<button class="link" data-act="aud-go" data-route="checkouts" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'listing') return `<button class="link" data-act="aud-go" data-route="storefront" data-id="${a.eid}">${l}</button>`;
  if (a.type === 'legal') return `<button class="link" data-act="aud-go" data-route="storefront" data-id="legal">${l}</button>`;
  if (a.type === 'setting') return `<button class="link" data-act="aud-go" data-route="settings" data-id="${a.eid}">${l}</button>`;
  return `<span class="font-medium">${l}</span>`;
}
actions['aud-go'] = (el) => {
  const r = el.dataset.route, id = el.dataset.id;
  if (r === 'refunds') go('refunds', { tab: id });
  else if (r === 'support') { ui.support.sel = id; ui.support.filter = 'all'; go('support'); }
  else if (r === 'risk') go('risk', { tab: id === 'blocklist' ? 'blocklist' : 'queue' });
  else if (r === 'storefront') go('storefront', { tab: id === 'legal' ? 'content' : 'listings' });
  else if (r === 'settings') go('settings', { tab: ['fx', 'tax'].includes(id) ? 'tax' : id.startsWith('rr') || id.startsWith('nt') ? (id.startsWith('nt') ? 'notifs' : 'payments') : ['guestCheckout', 'require3ds', 'withdrawalWaiver', 'autoRefundFailed', 'imeiPrecheck'].includes(id) ? 'policies' : 'payments' });
  else if (r === 'checkouts') go('checkouts');
  else if (r === 'access') { const ru = ipRule(id); go('access', { tab: adm(id) ? 'admins' : id === 'restrict' || (ru && ru.kind === 'allow') ? 'allow' : 'block' }); if (adm(id)) setTimeout(() => openDrawer(() => adminDrawer(id)), 40); }
  else if (r === 'suppliers') go('suppliers', { sel: id });
  else if (r === 'services') { ui.services.tab = 'services'; ui.services.q = svc(id).name; go('services'); }
  else if (r === 'finance-pay') { ui.finance.payTab = 'all'; go('finance', { tab: 'payments' }); setTimeout(() => pay(id) && payDialog(id), 60); }
  else if (r === 'finance-wd') { go('finance', { tab: 'withdrawals' }); setTimeout(() => IDX.w.get(id) && wdDialog(id), 60); }
};
const dayLabel = (ts) => {
  const d0 = startOfDay(Date.now()), d = startOfDay(ts);
  const diff = Math.round((d0 - d) / DAY);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : DWF.format(ts);
};
function auditRows() {
  const st = ui.audit, q = norm(st.q);
  return D(S.audit).filter((a) => (!st.actor || a.actor === st.actor) && (!st.type || a.type === st.type) && (!q || norm(a.actor + a.verb + a.label + a.id).includes(q)));
}
function pageAudit() {
  const g = modeGate('Audit log', 'table');
  if (g) return g;
  const st = ui.audit;
  const all = D(S.audit);
  const rows = auditRows();
  const shown = rows.slice(0, st.limit);
  const actors = [...new Set(S.audit.map((a) => a.actor))];
  const types = [...new Set(S.audit.map((a) => a.type))];
  const on = st.q || st.actor || st.type;
  const toolbar = `<div class="flex flex-wrap items-center gap-2 p-3">${searchEl('a-q', st.q, 'Search person, action, record')}${selectEl('a-actor', st.actor, [['', 'Everyone'], ...actors.map((a) => [a, a + (ACTOR_ROLE[a] ? ' (' + ACTOR_ROLE[a] + ')' : '')])], 'Filter by person', 'data-bind="a-actor"')}${selectEl('a-type', st.type, [['', 'All records'], ...types.map((t) => [t, TYPE_LABEL[t] || t])], 'Filter by record type', 'data-bind="a-type"')}${on ? '<button class="btn btn-ghost btn-sm" data-act="aud-clear">Clear filters</button>' : ''}<span class="flex-1"></span><span class="text-xs text-ink3" aria-live="polite">${num(rows.length)} ${rows.length === 1 ? 'entry' : 'entries'}</span></div>`;
  let body = '';
  if (!rows.length) body = all.length ? emptyBlock({ ic: 'filter', title: 'No entries match', body: 'Try another search or remove a filter.', cta: '<button class="btn" data-act="aud-clear">Clear filters</button>' }) : emptyBlock({ ic: 'history', title: 'Nothing recorded yet', body: 'Every change to prices, balances, merchants and suppliers is written here with the person and the time.' });
  else {
    let day = '';
    body = shown.map((a) => {
      const d = dayLabel(a.ts);
      const head = d !== day ? `<h2 class="sticky top-12 z-[1] border-y border-line bg-sunken px-3.5 py-1.5 text-xs font-medium text-ink2 first:border-t-0">${d}</h2>` : '';
      day = d;
      const open = st.open.has(a.id);
      const diff = a.diff.filter((x) => x.field);
      const first = diff[0];
      const summary = first ? `<span class="text-xs text-ink3">${esc(first.field)}: ${first.from ? '<span class="line-through">' + esc(first.from) + '</span> → ' : ''}<span class="text-ink2">${esc(first.to)}</span>${diff.length > 1 ? ' +' + (diff.length - 1) + ' more' : ''}</span>` : '';
      const detail = open ? `<div class="mb-1 ms-[68px] rounded-md border border-line bg-surface p-3 sm:ms-[148px]"><table class="w-full text-xs"><thead><tr class="text-ink3"><th class="py-1 text-start font-medium">Field</th><th class="py-1 text-start font-medium">Before</th><th class="py-1 text-start font-medium">After</th></tr></thead><tbody>${diff.length ? diff.map((x) => `<tr class="border-t border-line"><td class="py-1.5 mono">${esc(x.field)}</td><td class="py-1.5 text-ink2">${x.from ? esc(x.from) : '<span class="text-ink3">—</span>'}</td><td class="py-1.5 font-medium">${esc(x.to)}</td></tr>`).join('') : '<tr><td class="py-1.5 text-ink3" colspan="3">No field changes recorded for this action.</td></tr>'}</tbody></table><p class="mt-2 text-xs text-ink3"><span class="mono">${a.id}</span> · ${fmtDate(a.ts)}${a.ip ? ' · from ' + a.ip : ' · automatic'}${ACTOR_ROLE[a.actor] ? ' · ' + ACTOR_ROLE[a.actor] : ''}</p></div>` : '';
      return `${head}<div class="border-b border-line px-3.5 py-2.5 last:border-b-0"><div class="flex items-start gap-3"><span class="mono w-[44px] flex-none pt-0.5 tabular-nums text-ink3 sm:w-[124px]"><span class="sm:hidden">${fmtTime(a.ts)}</span><span class="hidden sm:inline">${fmtDate(a.ts)}</span></span><div class="min-w-0 flex-1"><p class="text-sm"><span class="inline-flex items-center gap-1.5 align-middle">${avatar(a.actor)}<span class="font-medium">${esc(a.actor)}</span></span> ${esc(a.verb)} ${auditEntity(a)}</p>${summary ? `<p class="mt-0.5 truncate">${summary}</p>` : ''}</div><button type="button" class="btn btn-ghost btn-icon btn-sm -my-0.5 flex-none" data-act="aud-toggle" data-id="${a.id}" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'} details for ${esc(a.id)}">${icon('chevD', 'ic-sm transition-transform ' + (open ? 'rotate-180' : ''))}</button></div>${detail}</div>`;
    }).join('') + (rows.length > shown.length ? `<div class="border-t border-line p-3 text-center"><button class="btn" data-act="aud-more">Show ${Math.min(60, rows.length - shown.length)} more <span class="text-ink3">of ${num(rows.length - shown.length)} remaining</span></button></div>` : '');
  }
  return `${pageHead({ title: 'Audit log', sub: 'Every change to money, prices, merchants and suppliers, with who and when. Entries can’t be edited or deleted.', actions: `<button class="btn" data-act="fin-export">${icon('download', 'ic-sm')}Export CSV</button>` })}<div class="panel">${toolbar}<div class="border-t border-line">${body}</div></div>`;
}
binds['a-q'] = (el) => { ui.audit.q = el.value; ui.audit.limit = 60; render(); };
binds['a-actor'] = (el) => { ui.audit.actor = el.value; ui.audit.limit = 60; render(); };
binds['a-type'] = (el) => { ui.audit.type = el.value; ui.audit.limit = 60; render(); };
actions['aud-clear'] = () => { Object.assign(ui.audit, { q: '', actor: '', type: '', limit: 60 }); render(); };
actions['aud-more'] = () => { ui.audit.limit += 60; render(true); };
actions['aud-toggle'] = (el) => { const s = ui.audit.open, id = el.dataset.id; s.has(id) ? s.delete(id) : s.add(id); render(); const b = $(`[data-act="aud-toggle"][data-id="${id}"]`); b && b.focus(); };
