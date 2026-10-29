/* Shared bits for the storefront (B2C) pages */
const lm = (usd, cur) => localMoney(usd, cur);
const PAY_STATUS = { captured: ['b-good', 'checkCircle', 'Paid'], refunded: ['b-neutral', 'undo', 'Refunded'], partial_refund: ['b-warn', 'undo', 'Part refunded'], disputed: ['b-crit', 'scale', 'Disputed'], chargeback: ['b-crit', 'xCircle', 'Chargeback lost'] };
const chargeBadge = (st) => badge(...(PAY_STATUS[st] || PAY_STATUS.captured));
const stars = (n) => `<span class="inline-flex items-center gap-px text-warn-fg" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<svg class="ic ic-xs" viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;${i <= n ? '' : 'opacity:.22'}">${ICONS.star}</svg>`).join('')}</span>`;
const maskEmail = (e) => e.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
const COUNTRY_OPTS = Object.entries(B2C_COUNTRIES).map(([k, c]) => [k, c.name]);
/* a slim row of figures, same look as the dashboard strip */
function statGrid(cells, label = 'Key figures') {
  const n = cells.length;
  const cols = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' }[n] || 'md:grid-cols-4';
  return `<section class="panel mb-4 grid grid-cols-2 ${cols}" aria-label="${esc(label)}">${cells.map((c, i) => `<div class="min-w-0 border-line p-3 sm:p-3.5 ${i === n - 1 && n % 2 ? 'col-span-2 md:col-span-1' : ''} ${i ? 'md:border-s' : ''} ${i % 2 ? 'border-s' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''}"><p class="text-xs text-ink3">${esc(c.label)}${c.tip ? `<button type="button" class="ms-1 inline-flex h-5 w-5 items-center justify-center rounded text-ink3 hover:text-ink" data-act="note" data-title="${esc(c.label)}" data-note="${esc(c.tip)}" aria-haspopup="dialog" aria-label="About ${esc(c.label)}">${icon('info', 'ic-xs')}</button>` : ''}</p><p class="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight ${c.cls || ''}">${c.value}</p>${c.sub ? `<p class="mt-0.5 text-xs text-ink3">${c.sub}</p>` : ''}</div>`).join('')}</section>`;
}
const orderLink = (id) => `<button type="button" class="link mono" data-act="order-open" data-id="${id}">${id}</button>`;
const custLink = (id) => { const c = cus(id); return c ? `<a class="link" href="#/customers/${c.id}">${esc(c.name)}</a>` : '<span class="text-ink3">Unknown</span>'; };
const dueText = (ts) => { const left = ts - Date.now(); return left > 0 ? `<span class="${left < 3 * DAY ? 'font-medium text-crit-fg' : ''}">in ${ageText(left)}</span>` : `<span class="text-ink3">${ageText(-left)} ago</span>`; };
const scoreMeter = (score) => { const c = score >= 80 ? 'crit-dot' : score >= 50 ? 'serious-dot' : score >= 25 ? 'warn-dot' : 'neutral-dot'; return `<div class="flex items-center gap-2"><div class="meter w-14"><i style="width:${Math.min(100, score)}%;background:rgb(var(--${c}))"></i></div><span class="tabular-nums text-xs text-ink2">${score}</span></div>`; };
const kv = (rows) => `<dl class="dl">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const sectionTabs = (items, cur, scope, label) => tabsEl(items, cur, scope, label).replace('class="tabs"', 'class="tabs px-2"');
const tblToolbar = (inner, count) => `<div class="flex flex-wrap items-center gap-2 p-3">${inner}<span class="flex-1"></span>${count != null ? `<span class="text-xs text-ink3" aria-live="polite">${count}</span>` : ''}</div>`;
const downloadText = (name, text, type = 'text/plain') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
/* the "Buyer" cell on order lists: a customer from the storefront or a merchant on the API */
function buyerCell(o) {
  const b = buyerOf(o);
  if (b.kind === 'b2c') return `<span class="block max-w-[170px] truncate">${esc(b.name)}</span><span class="block max-w-[170px] truncate text-2xs text-ink3"><span class="tag mr-1">Storefront</span>${esc(b.sub)}</span>`;
  const m = mer(o.mid);
  return `<span class="block max-w-[170px] truncate">${esc(m.name)}</span><span class="mono text-2xs text-ink3">${m.cc} · ${GROUPS.find((g) => g.id === m.group).name}</span>`;
}
