/* Abandoned checkouts: people who typed an email and left before paying, and the reminder that wins them back. */
ui.gwC = { sort: 'created', dir: -1, page: 1, sel: new Set() };
ui.checkouts.cf = ui.checkouts.cf || 'remind';

const RECOVERY = { none: ['b-warn', 'mail', 'Not reminded'], pending: ['b-neutral', 'clock', 'Reminder due in 1h'], sent: ['b-neutral', 'send', 'Reminder sent'], converted: ['b-good', 'checkCircle', 'Recovered'] };
const recBadge = (r) => badge(...RECOVERY[r]);

function checkoutsBody() {
  const all = D(S.checkouts), f = ui.checkouts.cf;
  const rows = all.filter((c) => (f === 'remind' ? c.recovery === 'none' : true));
  const sent = all.filter((c) => c.recovery === 'sent' || c.recovery === 'converted'), won = all.filter((c) => c.recovery === 'converted');
  const strip = statGrid([
    { label: 'Left at checkout', value: num(all.length), sub: 'Last 30 days, ' + money0(sum(all, (c) => c.gross)) + ' in baskets' },
    { label: 'Not reminded yet', value: all.filter((c) => c.recovery === 'none').length, cls: all.some((c) => c.recovery === 'none') ? 'text-warn-fg' : '', sub: 'Left an email, no reminder sent' },
    { label: 'Recovered', value: won.length, sub: sent.length ? pct((won.length / sent.length) * 100) + ' of reminders worked' : 'No reminders yet', tip: 'A checkout counts as recovered when the customer paid within 3 days of the reminder.' },
    { label: 'Revenue recovered', value: money0(sum(won, (c) => c.gross)), sub: 'Including VAT' },
  ], 'Abandoned checkout figures');
  const sel = ui.gwC.sel, picked = rows.filter((c) => sel.has(c.id) && c.recovery === 'none');
  const cols = [
    { key: 'email', label: 'Customer', val: (c) => c.email, render: (c) => `<p class="font-medium">${esc(maskEmail(c.email))}</p><p class="text-2xs text-ink3">${B2C_COUNTRIES[c.country].name} · ${esc(c.src)}</p>` },
    { key: 'svc', label: 'Service', hide: 'md', render: (c) => `<span class="text-ink2">${esc(svc(c.sid).name)}</span>` },
    { key: 'gross', label: 'Basket', num: true, val: (c) => c.gross, render: (c) => lm(c.gross, c.cur) },
    { key: 'step', label: 'Left at', hide: 'sm', render: (c) => `<span class="text-ink2">${c.step === 'email' ? 'Email' : 'Payment'}</span>` },
    { key: 'created', label: 'When', hide: 'sm', val: (c) => c.created, render: (c) => `<span class="text-ink2">${ago(c.created)}</span>` },
    { key: 'rec', label: 'Recovery', val: (c) => c.recovery, render: (c) => recBadge(c.recovery) },
  ];
  const seg = segEl([['remind', 'Needs a reminder'], ['all', 'All']], f, 'ck-cf', '', 'Checkout filter');
  const bar = `<div class="flex flex-wrap items-center gap-2 border-b border-line p-3">${seg}<span class="flex-1"></span>${picked.length ? `<span class="text-xs text-ink2">${picked.length} selected</span>` : ''}<button class="btn btn-primary btn-sm" data-act="ck-remind" ${picked.length ? '' : 'disabled'}>${icon('send', 'ic-sm')}Send reminder${picked.length > 1 ? 's' : ''}</button></div>`;
  return `${strip}${panel({ title: 'Abandoned checkouts', sub: 'People who typed an email and left. A reminder goes out automatically after ' + S.settings.policies.abandonedMinutes + ' minutes; here you can send one by hand.', body: bar + table({ id: 'ck-table', st: ui.gwC, cols, rows, rowId: (c) => c.id, selectable: true, pageSize: 12, caption: 'Abandoned checkouts', empty: emptyBlock({ ic: 'checkCircle', title: 'Everyone has been reminded', body: 'Nobody is waiting for a reminder.', cta: '<button class="btn" data-act="gw-cf" data-v="all">Show all checkouts</button>' }) }), flush: true })}`;
}
actions['ck-cf'] = (el) => { ui.checkouts.cf = el.dataset.v; ui.gwC.page = 1; render(); };
actions['ck-remind'] = () => {
  const ids = [...ui.gwC.sel].filter((id) => { const c = S.checkouts.find((x) => x.id === id); return c && c.recovery === 'none'; });
  ui.gwC.sel.clear();
  const n = sendRecovery(ids);
  toast({ kind: 'success', title: n + (n === 1 ? ' reminder sent' : ' reminders sent'), body: 'Each email has a one-click link back to the saved basket.', ttl: 3000 });
};

function pageCheckouts() {
  const g = modeGate('Abandoned checkouts', 'table');
  if (g) return g;
  return `${pageHead({ title: 'Abandoned checkouts', sub: 'People who left an email at checkout but never paid, and the reminder that brings them back.' })}${checkoutsBody()}`;
}
