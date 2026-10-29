/* Support: one inbox for storefront customers and merchants. List on the left, thread on the right. */
ui.support.open = false;
const CHANNEL_LABEL = { email: 'Email', web: 'Contact form', chat: 'Live chat', telegram: 'Telegram' };
function ticketRows() {
  const st = ui.support, q = norm(st.q);
  return D(S.tickets).filter((t) => {
    if (st.filter === 'open' && t.status === 'resolved') return false;
    if (st.filter === 'late' && !ticketLate(t)) return false;
    if (st.filter === 'mine' && t.assignee !== ME) return false;
    if (st.filter === 'resolved' && t.status !== 'resolved') return false;
    if (st.who === 'b2c' && t.who.type !== 'customer') return false;
    if (st.who === 'b2b' && t.who.type !== 'client') return false;
    return !q || norm(t.id + t.subject + ticketWho(t).name).includes(q);
  }).sort((a, b) => {
    const la = ticketLate(a) ? 1 : 0, lb = ticketLate(b) ? 1 : 0;
    if (st.filter !== 'resolved' && la !== lb) return lb - la;
    return b.updated - a.updated;
  });
}
function ticketRow(t, sel) {
  const w = ticketWho(t), late = ticketLate(t), lp = lastPublic(t);
  return `<li><button type="button" class="block w-full border-s-2 px-3.5 py-2.5 text-start hover:bg-hover ${sel ? 'border-accent bg-accent-soft' : 'border-transparent'}" data-act="tk-select" data-id="${t.id}" ${sel ? 'aria-current="true"' : ''}>
    <div class="flex items-center gap-2"><span class="inline-flex items-center gap-1.5 truncate text-sm font-medium">${w.kind === 'b2b' ? '<span class="tag">Merchant</span>' : ''}<span class="truncate">${esc(w.name)}</span></span><span class="flex-1"></span><span class="flex-none text-xs ${late ? 'font-medium text-crit-fg' : 'text-ink3'}">${late ? icon('clock', 'ic-xs mr-1 inline') : ''}${ago(t.updated)}</span></div>
    <p class="mt-0.5 truncate text-sm ${t.status === 'new' ? 'font-medium' : 'text-ink2'}">${esc(t.subject)}</p>
    <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink3"><span class="mono">${t.id}</span>${ticketBadge(t.status)}${t.prio === 'high' ? badge('b-crit', 'alert', 'High') : ''}${late ? `<span class="font-medium text-crit-fg">Reply overdue by ${ageText(Date.now() - lp.ts - ticketTarget(t))}</span>` : ''}</div></button></li>`;
}
function pageSupport() {
  const g = modeGate('Support', 'table');
  if (g) return g;
  const st = ui.support, all = D(S.tickets);
  const rows = ticketRows();
  if (!st.sel || !rows.some((t) => t.id === st.sel)) st.sel = rows[0] ? rows[0].id : null;
  const t = st.sel ? tkt(st.sel) : null;
  const ss = supportStats();
  const strip = statGrid([
    { label: 'Open tickets', value: ss.open, sub: all.filter((x) => x.status === 'new').length + ' new, not yet answered' },
    { label: 'Past reply target', value: ss.late, cls: ss.late ? 'text-crit-fg' : '', sub: 'Targets: 2h high, 8h normal, 24h low', tip: 'A ticket is late when the customer wrote last and nobody replied within the target for its priority.' },
    { label: 'Median first reply', value: ss.firstReply ? dur(ss.firstReply) : '–', sub: 'Across all tickets' },
    { label: 'Satisfaction', value: ss.csatN ? ss.csat.toFixed(1) + ' / 5' : '–', sub: ss.csatN + ' ratings after resolving', tip: 'Customers rate a ticket when it is resolved. The average is shown out of 5.' },
  ], 'Support figures');
  const fcount = (f) => all.filter(f).length;
  const filters = segEl([['open', 'Open'], ['late', 'Overdue'], ['mine', 'Mine'], ['resolved', 'Resolved'], ['all', 'All']], st.filter, 'tk-filter', '', 'Ticket filter');
  const who = segEl([['all', 'All'], ['b2c', 'Customers'], ['b2b', 'Merchants']], st.who, 'tk-who', '', 'Who wrote');
  const list = `<div class="${st.open ? 'hidden lg:block' : ''} min-w-0"><div class="space-y-2 border-b border-line p-3">${searchEl('tk-q', st.q, 'Search ticket, customer, subject')}<div class="flex flex-wrap gap-2">${filters}${who}</div></div>${rows.length ? `<ul class="m-0 max-h-[640px] list-none divide-y divide-line overflow-y-auto p-0">${rows.map((x) => ticketRow(x, x.id === st.sel)).join('')}</ul>` : all.length ? emptyBlock({ ic: 'inbox', title: 'No tickets here', body: 'Nothing matches this filter.', cta: '<button class="btn" data-act="tk-reset">Show open tickets</button>' }) : emptyBlock({ ic: 'life', title: 'Inbox is empty', body: 'Tickets from the storefront contact form, email and live chat land here, next to merchant requests.', cta: `<button class="btn" data-act="sim-ticket">${icon('plus', 'ic-sm')}Simulate a ticket</button>` })}</div>`;
  const thread = `<div class="${st.open ? '' : 'hidden lg:block'} min-w-0 border-line lg:border-s">${t ? threadView(t) : emptyBlock({ ic: 'mail', title: 'Select a ticket', body: 'The conversation opens here, with the order and payment next to it.' })}</div>`;
  const head = pageHead({ title: 'Support', sub: 'One inbox for customers on the storefront and merchants on the API.', actions: `<button class="btn" data-act="sim-ticket">${icon('plus', 'ic-sm')}Simulate a ticket</button>` });
  return `${head}${strip}<div class="panel grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">${list}${thread}</div>`;
}
function threadView(t) {
  const w = ticketWho(t), o = t.oid ? ord(t.oid) : null, late = ticketLate(t);
  const staff = ['Lina S.', 'Rami K.', 'Omar T.'];
  const draft = ui.support.draft[t.id] ?? '';
  const macros = S.macros.filter((m) => !t.cat || m.cat === t.cat || m.cat === 'howto');
  const msg = (m) => {
    if (m.by === 'note') return `<div class="mx-auto max-w-[92%] rounded-md border border-dashed border-warn-dot bg-warn-bg px-3 py-2 text-sm text-warn-fg"><p class="mb-0.5 text-2xs font-medium uppercase tracking-wide">${icon('lock', 'ic-xs mr-1 inline')}Internal note · ${esc(m.name)} · ${fmtDate(m.ts)}</p><p class="whitespace-pre-wrap">${esc(m.text)}</p></div>`;
    const me = m.by === 'staff';
    return `<div class="flex ${me ? 'justify-end' : ''}"><div class="max-w-[88%] rounded-lg px-3 py-2 text-sm ${me ? 'bg-accent-soft text-ink' : 'border border-line bg-surface'}"><p class="mb-0.5 text-2xs text-ink3">${esc(m.name)} · ${fmtDate(m.ts)}</p><p class="whitespace-pre-wrap">${esc(m.text)}</p></div></div>`;
  };
  return `<div class="flex h-full flex-col">
    <div class="border-b border-line p-3.5"><div class="flex items-start gap-2"><button class="btn btn-ghost btn-icon btn-sm -ms-1 lg:hidden" data-act="tk-back" aria-label="Back to the list">${icon('chevL')}</button><div class="min-w-0 flex-1"><h2 class="text-base font-semibold leading-tight">${esc(t.subject)}</h2><p class="mt-0.5 text-xs text-ink3"><span class="mono">${t.id}</span> · ${CHANNEL_LABEL[t.channel]} · ${TICKET_CATS[t.cat]} · opened ${ago(t.created)}</p></div>${ticketBadge(t.status)}</div>
      <div class="mt-3 flex flex-wrap items-center gap-2">${selectEl('prio', t.prio, [['high', 'High priority'], ['normal', 'Normal priority'], ['low', 'Low priority']], 'Priority', `data-bind="tk-prio" data-id="${t.id}"`)}${selectEl('assignee', t.assignee || '', [['', 'Unassigned'], ...staff.map((s) => [s, s])], 'Assignee', `data-bind="tk-assign" data-id="${t.id}"`)}<span class="flex-1"></span>${t.status === 'resolved' ? `<button class="btn" data-act="tk-reopen" data-id="${t.id}">${icon('refresh', 'ic-sm')}Reopen</button>` : `<button class="btn" data-act="tk-resolve" data-id="${t.id}">${icon('check', 'ic-sm')}Resolve</button>`}</div>
      ${late ? `<p class="mt-2 flex items-center gap-1.5 text-xs font-medium text-crit-fg">${icon('clock', 'ic-sm')}Waiting ${ageText(Date.now() - lastPublic(t).ts)} for a reply. The target for ${t.prio} priority is ${ageText(ticketTarget(t))}.</p>` : ''}</div>
    <div class="grid gap-3 border-b border-line bg-sunken px-3.5 py-2.5 text-sm sm:grid-cols-2">
      <div class="min-w-0"><p class="text-xs text-ink3">${w.kind === 'b2c' ? 'Customer' : 'Merchant'}</p><p class="truncate font-medium">${t.who.type === 'customer' ? `<a class="link" href="#/customers/${t.who.id}">${esc(w.name)}</a>` : `<a class="link" href="#/merchants/${t.who.id}">${esc(w.name)}</a>`}</p><p class="truncate text-xs text-ink3">${esc(w.kind === 'b2c' ? maskEmail(w.sub || 'customer@mail.example') : w.sub)}</p></div>
      <div class="min-w-0">${o ? `<p class="text-xs text-ink3">Order</p><p class="flex flex-wrap items-center gap-x-2 font-medium">${orderLink(o.id)} ${orderBadge(o.status)}</p><p class="truncate text-xs text-ink3">${esc(svc(o.sid).name)} · ${isB2C(o) ? lm(o.gross, o.cur) : money(o.price)}${isB2C(o) ? ' · ' + chargeBadge(o.pay.status).replace(/<[^>]+>/g, '') : ''}</p>` : '<p class="text-xs text-ink3">Order</p><p class="text-ink3">Not linked to an order</p>'}</div></div>
    <div class="min-h-[220px] flex-1 space-y-3 overflow-y-auto p-3.5" style="max-height:420px">${t.msgs.map(msg).join('')}</div>
    ${t.status === 'resolved' ? `<div class="border-t border-line bg-sunken px-3.5 py-3 text-sm text-ink2">This ticket is resolved${t.csat ? ` and the customer rated it <span class="font-medium">${t.csat} / 5</span>` : ', the satisfaction survey is out'}. Reopen it to reply.</div>` : `<div class="border-t border-line p-3.5">
      <div class="mb-2 flex flex-wrap items-center gap-2">${selectEl('macro', '', [['', 'Insert a reply template…'], ...macros.map((m) => [m.id, m.title])], 'Reply templates', `data-bind="tk-macro" data-id="${t.id}"`, 'min-w-[200px]')}<span class="flex-1"></span><label class="flex cursor-pointer items-center gap-2 text-xs text-ink2"><input type="checkbox" class="check" data-act="tk-internal" ${ui.support.internal ? 'checked' : ''}>Internal note, customer won’t see it</label></div>
      <textarea id="tk-composer" class="input ${ui.support.internal ? '!border-warn-dot !bg-warn-bg' : ''}" rows="4" data-fk="tk-composer" data-draft="${t.id}" placeholder="${ui.support.internal ? 'Write a note for your team' : 'Write a reply to ' + esc(w.name.split(' ')[0])}">${esc(draft)}</textarea>
      <div class="mt-2 flex flex-wrap items-center gap-2"><button class="btn btn-primary" data-act="tk-send" data-id="${t.id}">${icon('send', 'ic-sm')}${ui.support.internal ? 'Add note' : 'Send reply'}</button>${o && isB2C(o) && (o.status === 'completed') && o.pay.status === 'captured' ? `<button class="btn" data-act="o-refund" data-id="${o.id}">${icon('undo', 'ic-sm')}Refund order…</button>` : ''}${o && isB2C(o) && isOpen(o) ? `<button class="btn btn-danger" data-act="o-reject" data-id="${o.id}">${icon('ban', 'ic-sm')}Cancel and refund…</button>` : ''}<span class="flex-1"></span><span class="text-xs text-ink3">${ui.support.internal ? 'Only your team sees notes.' : 'Sent by email from support@gsmsupply.example'}</span></div></div>`}
  </div>`;
}
document.addEventListener('input', (e) => { const t = e.target; if (t && t.dataset && t.dataset.draft) ui.support.draft[t.dataset.draft] = t.value; });
binds['tk-q'] = (el) => { ui.support.q = el.value; render(); };
actions['tk-select'] = (el) => { ui.support.sel = el.dataset.id; ui.support.open = true; render(); const s = $('#tk-composer'); s && matchMedia('(min-width:1024px)').matches && s.focus({ preventScroll: true }); };
actions['tk-back'] = () => { ui.support.open = false; render(); };
actions['tk-filter'] = (el) => { ui.support.filter = el.dataset.v; render(); };
actions['tk-who'] = (el) => { ui.support.who = el.dataset.v; render(); };
actions['tk-reset'] = () => { Object.assign(ui.support, { filter: 'open', who: 'all', q: '' }); render(); };
actions['tk-internal'] = (el) => { ui.support.internal = el.checked; const ta = $('#tk-composer'); if (ta && ta.dataset.draft) ui.support.draft[ta.dataset.draft] = ta.value; render(); };
actions['tk-send'] = (el) => {
  const id = el.dataset.id, ta = $('#tk-composer'), text = ta ? ta.value.trim() : '';
  if (!text) { ta && ta.focus(); toast({ kind: 'error', title: 'Write something first', body: ui.support.internal ? 'An empty note isn’t saved.' : 'An empty reply isn’t sent.', ttl: 2600 }); return; }
  const internal = ui.support.internal;
  ticketReply(id, text, internal);
  toast({ kind: 'success', title: internal ? 'Note added' : 'Reply sent', body: internal ? 'Only your team sees it.' : 'Status is now Waiting on customer.', ttl: 2600 });
};
binds['tk-macro'] = (el) => {
  const m = S.macros.find((x) => x.id === el.value); if (!m) return;
  const t = tkt(el.dataset.id), o = t.oid ? ord(t.oid) : null, w = ticketWho(t);
  const eta = o ? ageText(svc(o.sid).sla * MIN) : 'a few hours';
  const text = m.body.replace('{name}', w.name.split(' ')[0]).replace(/\{order\}/g, o ? o.id : 'your order').replace('{eta}', eta);
  ui.support.draft[t.id] = text; render();
  const ta = $('#tk-composer'); ta && ta.focus();
};
binds['tk-prio'] = (el) => ticketSet(el.dataset.id, 'prio', el.value);
binds['tk-assign'] = (el) => ticketSet(el.dataset.id, 'assignee', el.value || null);
actions['tk-resolve'] = (el) => { ticketSet(el.dataset.id, 'status', 'resolved'); toast({ kind: 'success', title: 'Ticket resolved', body: 'The customer gets a short satisfaction survey.', ttl: 2800 }); };
actions['tk-reopen'] = (el) => ticketSet(el.dataset.id, 'status', 'open');
actions['sim-ticket'] = () => { ui.mode = 'normal'; const t = simulateTicket(); ui.support.filter = 'open'; ui.support.sel = t.id; toast({ kind: 'info', title: t.id + ' opened', body: ticketWho(t).name + ': ' + t.subject }); };
