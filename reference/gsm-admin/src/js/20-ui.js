/* UI engine: actions, toasts, dialogs, drawer, menus, table, state panels */
const actions = {};
const binds = {};

/* ---------- small renderers ---------- */
const badge = (cls, ic, text) => `<span class="badge ${cls}">${ic ? icon(ic, 'ic-xs') : ''}<span>${esc(text)}</span></span>`;
const orderBadge = (st) => { const m = ORDER_STATUS[st]; return badge(m.cls, m.icon, m.label); };
const typeTag = (t) => `<span class="tag">${esc(t)}</span>`;
const initials = (n) => n.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const avatar = (n) => `<span class="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sunken border border-line text-2xs font-medium text-ink2" aria-hidden="true">${esc(initials(n))}</span>`;
const ageText = (ms) => {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 1) return '<1m';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h' + (m % 60 ? '\u00a0' + (m % 60) + 'm' : '');
  const d = Math.floor(h / 24);
  return d + 'd' + (h % 24 ? '\u00a0' + (h % 24) + 'h' : '');
};
const statusDot = (s) => ({ up: ['b-good', 'checkCircle', 'Healthy'], degraded: ['b-serious', 'alert', 'Degraded'], down: ['b-crit', 'xCircle', 'Down'] }[s]);
const supBadge = (sp) => { if (!sp.enabled) return badge('b-neutral', 'ban', 'Disabled'); const [c, i, l] = statusDot(sp.status); return badge(c, i, l); };
const merBadge = (st) => ({ active: badge('b-good', 'checkCircle', 'Active'), pending: badge('b-warn', 'clock', 'Pending'), suspended: badge('b-crit', 'ban', 'Suspended') }[st]);
const sevLabel = { crit: 'Critical', serious: 'High', warn: 'Medium', info: 'Low' };
const pageHead = ({ title, sub = '', actions: act = '' }) => `<div class="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2"><div class="min-w-0"><h1 class="text-xl font-semibold tracking-tight">${title}</h1>${sub ? `<p class="mt-0.5 text-sm text-ink3">${sub}</p>` : ''}</div><div class="flex flex-wrap items-center gap-2">${act}</div></div>`;
const panel = ({ title = '', sub = '', right = '', body = '', flush = false, cls = '', id = '' }) => `<section class="panel ${cls}" ${id ? `id="${id}"` : ''}>${title || right ? `<div class="panel-h"><div class="min-w-[13rem] flex-1"><h2 class="panel-t">${title}</h2>${sub ? `<p class="panel-s">${sub}</p>` : ''}</div>${right}</div>` : ''}<div class="${flush ? '' : 'panel-b'}">${body}</div></section>`;
const field = (label, control, hint = '') => `<div><label class="label">${label}</label>${control}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
const selectEl = (name, value, options, label = name, extra = '', cls = '') => `<span class="select-wrap ${cls}"><select name="${name}" ${extra} aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('chevD', 'ic-sm')}</span>`;
const tabsEl = (items, cur, scope, label = '') => `<div class="tabs" role="tablist" aria-label="${esc(label)}">${items.map(([v, l, n]) => `<button role="tab" type="button" aria-selected="${v === cur}" data-act="tab" data-scope="${scope}" data-v="${v}">${esc(l)}${n != null ? `<span class="count">${n}</span>` : ''}</button>`).join('')}</div>`;
const segEl = (items, cur, act, scope = '', label = '') => `<div class="seg" role="group" aria-label="${esc(label)}">${items.map(([v, l]) => `<button type="button" aria-pressed="${String(v) === String(cur)}" data-act="${act}" data-scope="${scope}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
const searchEl = (key, value, ph) => `<div class="relative min-w-[180px] flex-1 sm:max-w-[280px]"><span class="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-ink3">${icon('search', 'ic-sm')}</span><input class="input ps-8" type="search" value="${esc(value)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" data-bind="${key}" data-fk="${key}" autocomplete="off" spellcheck="false"></div>`;

/* ---------- state panels ---------- */
const skel = (w = '100%', h = 12, cls = '') => `<span class="skel block ${cls}" style="width:${w};height:${h}px" aria-hidden="true"></span>`;
const skelTable = (cols = 5, rows = 8) => `<div class="p-0" role="status" aria-label="Loading"><span class="sr-only">Loading…</span>${Array.from({ length: rows }, (_, r) => `<div class="flex items-center gap-4 border-b border-line px-3.5" style="height:${ui_dense() ? 32 : 40}px">${Array.from({ length: cols }, (_, c) => skel(c === 0 ? '88px' : `${50 + ((r * 7 + c * 13) % 40)}px`, 10, c === cols - 1 ? 'ms-auto' : '')).join('')}</div>`).join('')}</div>`;
const ui_dense = () => document.documentElement.classList.contains('dense');
const skelStat = (n = 5) => `<div class="panel mb-4 grid grid-cols-2 md:grid-cols-5" role="status" aria-label="Loading"><span class="sr-only">Loading…</span>${Array.from({ length: n }, (_, i) => `<div class="border-line p-3.5 ${i ? 'md:border-s' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''}">${skel('64px', 10)}<div class="mt-2.5">${skel('92px', 20)}</div><div class="mt-2">${skel('72px', 10)}</div></div>`).join('')}</div>`;
const errorBlock = ({ title, detail, rid = 'req_8f3a2c1e', retry = true }) => `<div class="empty" role="alert">${`<span class="flex h-9 w-9 items-center justify-center rounded-full bg-crit-bg text-crit-fg">${icon('alert')}</span>`}<h3 class="text-base font-semibold">${esc(title)}</h3><p class="max-w-[46ch] text-sm text-ink2">${esc(detail)}</p><p class="text-xs text-ink3">Request <span class="mono">${rid}</span></p>${retry ? `<button class="btn mt-1" data-act="retry">${icon('refresh', 'ic-sm')}Retry</button>` : ''}</div>`;
const emptyBlock = ({ ic = 'inbox', title, body, cta = '' }) => `<div class="empty"><span class="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-ink3">${icon(ic)}</span><h3 class="text-base font-semibold">${esc(title)}</h3><p class="max-w-[48ch] text-sm text-ink2">${body}</p>${cta ? `<div class="mt-1 flex flex-wrap justify-center gap-2">${cta}</div>` : ''}</div>`;
const syntheticNote = () => `<p class="text-xs text-ink3">All data in this demo is synthetic.</p>`;

/* ---------- toasts ---------- */
function toast({ kind = 'success', title, body = '', action = null, ttl = 5200 }) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  const [c, ic] = { success: ['text-good-fg', 'checkCircle'], error: ['text-crit-fg', 'alert'], info: ['text-accent-ink', 'info'] }[kind];
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span class="${c} mt-px">${icon(ic)}</span><div class="min-w-0 flex-1"><p class="font-medium">${esc(title)}</p>${body ? `<p class="mt-0.5 text-xs text-ink2">${esc(body)}</p>` : ''}</div>${action ? `<button class="btn btn-sm" data-t-action>${esc(action.label)}</button>` : ''}<button class="btn btn-ghost btn-icon btn-sm -me-1 -mt-1" aria-label="Dismiss notification">${icon('x', 'ic-sm')}</button>`;
  const kill = () => { el.remove(); };
  el.querySelector('[aria-label="Dismiss notification"]').onclick = kill;
  if (action) el.querySelector('[data-t-action]').onclick = () => { action.run(); kill(); };
  host.append(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  try { host.hidePopover && host.hidePopover(); host.showPopover && host.showPopover(); } catch (e) { /* popover unsupported */ }
  setTimeout(kill, ttl);
}
const copyText = async (text, label = 'Copied') => {
  try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard blocked in sandbox */ }
  toast({ kind: 'info', title: label, body: text.length > 48 ? text.slice(0, 48) + '…' : text, ttl: 2200 });
};

/* ---------- dialogs ---------- */
function closeDlg() { const d = $('#dlg'); if (d.open) d.close(); }
function modal({ title, sub = '', body = '', confirm = 'Confirm', kind = 'primary', cancel = 'Cancel', size = '', onSubmit = null, noFooter = false }) {
  const d = $('#dlg');
  d.className = 'dlg ' + size;
  d.innerHTML = `<form method="dialog" novalidate><div class="dlg-h"><div class="min-w-0 flex-1"><h2 id="dlg-title" class="text-lg font-semibold">${title}</h2>${sub ? `<p class="mt-0.5 text-sm text-ink2">${sub}</p>` : ''}</div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button></div><div class="dlg-b">${body}<p class="mt-3 hidden text-sm text-crit-fg" data-err role="alert"></p></div>${noFooter ? '' : `<div class="dlg-f"><button type="button" class="btn" data-close>${esc(cancel)}</button><button type="submit" class="btn ${kind === 'danger' ? 'btn-danger-solid' : 'btn-primary'}">${esc(confirm)}</button></div>`}</form>`;
  const form = d.querySelector('form');
  d.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => d.close()));
  form.onsubmit = (e) => {
    e.preventDefault();
    const err = d.querySelector('[data-err]');
    err.classList.add('hidden');
    const r = onSubmit ? onSubmit(form) : true;
    if (r === true || r === undefined) d.close();
    else if (typeof r === 'string') { err.textContent = r; err.classList.remove('hidden'); const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); }
  };
  if (!d.open) d.showModal();
  const first = d.querySelector('[autofocus], input:not([type=hidden]), textarea, select');
  (first || d.querySelector('button[type=submit]'))?.focus();
  return d;
}
const confirmDlg = ({ title, body, confirm, kind = 'primary', run }) => modal({ title, body: `<div class="text-sm text-ink2">${body}</div>`, confirm, kind, onSubmit: () => { run(); return true; } });

/* ---------- drawer ---------- */
let drawerFn = null;
function openDrawer(fn) { drawerFn = fn; const d = $('#drawer'); d.innerHTML = fn(); if (!d.open) d.showModal(); }
function refreshDrawer() { const d = $('#drawer'); if (d.open && drawerFn) { const st = $('.drawer-b', d)?.scrollTop || 0; d.innerHTML = drawerFn(); const b = $('.drawer-b', d); if (b) b.scrollTop = st; } }
function closeDrawer() { const d = $('#drawer'); if (d.open) d.close(); }

/* ---------- menus ---------- */
let menuEl = null, menuAnchor = null, menuItems = [];
function closeMenu(refocus = true) {
  if (!menuEl) return;
  menuEl.remove(); menuEl = null;
  document.removeEventListener('pointerdown', onMenuOutside, true);
  document.removeEventListener('keydown', onMenuKey, true);
  const a = menuAnchor; menuAnchor = null;
  if (refocus && a && a.isConnected) a.focus();
}
function onMenuOutside(e) { if (menuEl && !menuEl.contains(e.target) && !menuAnchor?.contains(e.target)) closeMenu(false); }
function onMenuKey(e) {
  if (!menuEl) return;
  const btns = Array.from(menuEl.querySelectorAll('button'));
  const i = btns.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length]?.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
  else if (e.key === 'Home') { e.preventDefault(); btns[0]?.focus(); }
  else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1]?.focus(); }
  else if (e.key === 'Tab') closeMenu(false);
}
function placeMenu(el, anchor, align) {
  (anchor.closest('dialog[open]') || document.body).append(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  const left = clamp(align === 'end' ? r.right - w : r.left, 8, innerWidth - w - 8);
  let top = r.bottom + 4;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
/* A short explanation anchored to a button. Click or Enter opens it, Esc, outside click or Tab closes it, so it works on touch and keyboard where title="" does not. */
function openNote(anchor, title, text, width = 264) {
  if (menuEl && menuAnchor === anchor) return closeMenu();
  closeMenu(false);
  menuItems = [];
  const el = document.createElement('div');
  el.className = 'menu fixed z-[90] p-3 text-xs';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.style.width = width + 'px'; el.style.maxWidth = 'calc(100vw - 16px)';
  el.innerHTML = `<p class="font-medium text-ink">${esc(title)}</p><p class="mt-1 text-ink2">${esc(text)}</p>`;
  placeMenu(el, anchor, 'start');
  menuEl = el; menuAnchor = anchor;
  document.addEventListener('pointerdown', onMenuOutside, true);
  document.addEventListener('keydown', onMenuKey, true);
}
actions['note'] = (el) => openNote(el, el.dataset.title, el.dataset.note);
function openMenu(anchor, items, { align = 'end', width = 0 } = {}) {
  if (menuEl && menuAnchor === anchor) return closeMenu();
  closeMenu(false);
  menuItems = items;
  const el = document.createElement('div');
  el.className = 'menu fixed z-[90]';
  el.setAttribute('role', 'menu');
  if (width) el.style.minWidth = width + 'px';
  el.innerHTML = items.map((it, i) => it.sep ? '<div class="menu-sep" role="separator"></div>' : it.header ? `<div class="menu-h" role="presentation">${esc(it.header)}</div>` : `<button type="button" role="${it.checked !== undefined ? 'menuitemradio' : 'menuitem'}" ${it.checked !== undefined ? `aria-checked="${!!it.checked}"` : ''} ${it.disabled ? 'disabled' : ''} class="menu-item ${it.danger ? 'text-crit-fg' : ''}" data-mi="${i}">${it.icon ? icon(it.icon, 'ic-sm') : ''}<span class="min-w-0 flex-1 truncate">${esc(it.label)}</span>${it.checked ? icon('check', 'ic-sm') : ''}${it.hint ? `<span class="kbd">${esc(it.hint)}</span>` : ''}</button>`).join('');
  placeMenu(el, anchor, align);
  menuEl = el; menuAnchor = anchor;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-mi]'); if (!b) return; const it = menuItems[+b.dataset.mi]; closeMenu(false); anchor.isConnected && anchor.focus(); it.run && it.run(); });
  document.addEventListener('pointerdown', onMenuOutside, true);
  document.addEventListener('keydown', onMenuKey, true);
  el.querySelector('button:not([disabled])')?.focus();
}

/* ---------- table engine ---------- */
const TBL = {}; // id -> state object {sort, dir, page, sel}
const PAGE = 25;
function table({ id, st, cols, rows, rowId, sortable = true, selectable = false, rowAct = '', pageSize = PAGE, empty, cursor = null, caption = '' }) {
  TBL[id] = st;
  const sc = cols.find((c) => c.key === st.sort);
  let list = rows.slice();
  if (sc && sc.val) list.sort((a, b) => { const x = sc.val(a), y = sc.val(b); return (x < y ? -1 : x > y ? 1 : 0) * st.dir; });
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  st.page = clamp(st.page || 1, 1, pages);
  const slice = pageSize ? list.slice((st.page - 1) * pageSize, st.page * pageSize) : list;
  const hide = (c) => (c.hide ? { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }[c.hide] : '');
  const allSel = selectable && slice.length && slice.every((r) => st.sel.has(rowId(r)));
  const someSel = selectable && slice.some((r) => st.sel.has(rowId(r)));
  const head = `<tr>${selectable ? `<th class="w-9 !ps-3.5 !pe-0"><input type="checkbox" class="check" aria-label="Select all rows on this page" data-act="sel-all" data-t="${id}" ${allSel ? 'checked' : ''} ${someSel && !allSel ? 'data-indeterminate="1"' : ''}></th>` : ''}${cols.map((c) => {
    const on = sortable && c.val && c.key === st.sort;
    const aria = on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none';
    return `<th class="${c.num ? 'num' : ''} ${hide(c)} ${c.cls || ''}" ${c.val && sortable ? `aria-sort="${aria}"` : ''} scope="col">${c.val && sortable ? `<button type="button" class="inline-flex items-center gap-1 ${c.num ? 'flex-row-reverse' : ''} font-medium hover:text-ink ${on ? 'text-ink' : ''}" data-act="sort" data-t="${id}" data-k="${c.key}">${esc(c.label)}${on ? icon(st.dir > 0 ? 'arrowUp' : 'arrowDown', 'ic-xs') : icon('sort', 'ic-xs opacity-40')}</button>` : c.label ? esc(c.label) : '<span class="sr-only">Actions</span>'}</th>`;
  }).join('')}</tr>`;
  const body = slice.map((r) => {
    const rid = rowId(r);
    const sel = selectable && st.sel.has(rid);
    return `<tr class="${rowAct ? 'row' : ''}" data-rid="${esc(rid)}" ${rowAct ? `data-act="${rowAct}" data-id="${esc(rid)}"` : ''} ${sel ? 'aria-selected="true"' : ''} ${cursor === rid ? 'data-cursor="1"' : ''}>${selectable ? `<td class="!pe-0"><input type="checkbox" class="check" aria-label="Select row ${esc(rid)}" data-act="sel" data-t="${id}" data-id="${esc(rid)}" ${sel ? 'checked' : ''}></td>` : ''}${cols.map((c) => `<td class="${c.num ? 'num' : ''} ${hide(c)} ${c.cls || ''}">${c.render(r)}</td>`).join('')}</tr>`;
  }).join('');
  const pager = pageSize && total > pageSize ? `<div class="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2 text-xs text-ink3"><span>${(st.page - 1) * pageSize + 1}–${Math.min(total, st.page * pageSize)} of ${num(total)}</span><div class="flex items-center gap-1"><button class="btn btn-sm btn-icon" data-act="page" data-t="${id}" data-d="-1" aria-label="Previous page" ${st.page <= 1 ? 'disabled' : ''}>${icon('chevL', 'ic-sm')}</button><span class="px-1 tabular-nums">Page ${st.page} of ${pages}</span><button class="btn btn-sm btn-icon" data-act="page" data-t="${id}" data-d="1" aria-label="Next page" ${st.page >= pages ? 'disabled' : ''}>${icon('chevR', 'ic-sm')}</button></div></div>` : total ? `<div class="border-t border-line px-3.5 py-2 text-xs text-ink3">${num(total)} ${total === 1 ? 'row' : 'rows'}</div>` : '';
  if (!total) return `<div data-tbl="${id}">${empty || emptyBlock({ title: 'Nothing to show', body: 'No rows match.' })}</div>`;
  return `<div data-tbl="${id}"><div class="tbl-wrap"><table class="tbl" ${caption ? `aria-label="${esc(caption)}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>${pager}</div>`;
}
actions.sort = (el) => { const st = TBL[el.dataset.t]; const k = el.dataset.k; if (st.sort === k) st.dir = -st.dir; else { st.sort = k; st.dir = 1; } st.page = 1; render(); };
actions.page = (el) => { const st = TBL[el.dataset.t]; st.page += +el.dataset.d; render(true); };
actions.sel = (el) => { const st = TBL[el.dataset.t]; el.checked ? st.sel.add(el.dataset.id) : st.sel.delete(el.dataset.id); render(); };
actions['sel-all'] = (el) => { const st = TBL[el.dataset.t]; $$(`[data-tbl="${el.dataset.t}"] tbody tr`).forEach((tr) => (el.checked ? st.sel.add(tr.dataset.rid) : st.sel.delete(tr.dataset.rid))); render(); };
const afterRender = () => { $$('input[data-indeterminate]').forEach((i) => (i.indeterminate = true)); };

/* ---------- misc shared bits ---------- */
actions.retry = () => { ui.mode = 'normal'; setModeLabel(); render(); toast({ kind: 'success', title: 'Loaded', body: 'The request succeeded on retry.', ttl: 2400 }); };
actions.tab = (el) => { const sc = el.dataset.scope; const [a, b] = sc.split('.'); const st = b ? ui[a] : ui[a]; const key = b || 'tab'; st[key] = el.dataset.v; if (st.page != null) st.page = 1; render(); };
actions.copy = (el) => copyText(el.dataset.v, 'Copied ' + (el.dataset.label || ''));
actions['close-drawer'] = () => closeDrawer();
binds.bindq = (el) => {};
const timeline = (events) => `<ol class="relative ms-1.5 border-s border-line2">${events.slice().sort((a, b) => a.ts - b.ts).map((e) => {
  const cls = { completed: 'bg-good-dot', settle: 'bg-good-dot', review: 'bg-serious-dot', rejected: 'bg-crit-dot', release: 'bg-neutral-dot', retry: 'bg-warn-dot' }[e.k] || 'bg-neutral-dot';
  return `<li class="relative pb-3.5 ps-4 last:pb-0"><span class="absolute -start-[4.5px] top-[5px] h-2 w-2 rounded-full ring-2 ring-surface ${cls}"></span><div class="flex flex-wrap items-baseline gap-x-2"><span class="mono tabular-nums text-ink3">${fmtDate(e.ts)}</span><span class="text-sm">${esc(e.text)}</span></div><div class="text-xs text-ink3">${esc(e.by)}</div></li>`;
}).join('')}</ol>`;
const journalTable = (j) => `<table class="w-full text-xs"><thead><tr class="text-ink3"><th class="py-1 text-start font-medium">Account</th><th class="py-1 text-end font-medium">Debit</th><th class="py-1 text-end font-medium">Credit</th></tr></thead><tbody>${j.entries.map((e) => `<tr class="border-t border-line"><td class="py-1.5"><span class="mono">${e.acct}</span>${e.mid ? ` <span class="text-ink3">· ${esc(mer(e.mid)?.name || e.mid)}</span>` : ''}${e.sid ? ` <span class="text-ink3">· ${esc(sup(e.sid)?.name || e.sid)}</span>` : ''}</td><td class="py-1.5 text-end tabular-nums">${e.dr ? money(e.dr) : ''}</td><td class="py-1.5 text-end tabular-nums">${e.cr ? money(e.cr) : ''}</td></tr>`).join('')}<tr class="border-t border-line2 font-medium"><td class="py-1.5">Total</td><td class="py-1.5 text-end tabular-nums">${money(j.amount)}</td><td class="py-1.5 text-end tabular-nums">${money(j.amount)}</td></tr></tbody></table>`;
function showJournals(refType, refId, title) {
  const js = S.journals.filter((j) => j.refType === refType && j.refId === refId);
  modal({ title: title || 'Ledger entries', sub: js.length + (js.length === 1 ? ' journal' : ' journals') + ' posted. Debits equal credits in each.', size: 'dlg-lg', noFooter: true, body: js.length ? js.map((j) => `<div class="mb-4 last:mb-0"><div class="mb-1 flex flex-wrap items-center gap-2"><span class="mono font-medium">${j.id}</span><span class="tag">${esc(KIND_LABEL[j.kind])}</span><span class="text-xs text-ink3">${fmtDate(j.ts)} · by ${esc(j.by)}</span></div><p class="mb-1 text-sm text-ink2">${esc(j.memo)}</p>${journalTable(j)}</div>`).join('') : '<p class="text-sm text-ink2">No journals posted yet.</p>' });
}
actions.journal = (el) => showJournals(el.dataset.rt, el.dataset.rid, el.dataset.title);
