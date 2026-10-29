/* Storefront: what the public site sells, the pages around it, and a live preview of the customer's checkout. */
ui.sfL = { sort: 'orders', dir: -1, page: 1, sel: new Set() };
ui.sfP = { sort: 'views', dir: -1, page: 1, sel: new Set() };
ui.sfC = { sort: '', dir: 1, page: 1, sel: new Set() };
ui.sfH = { sort: 'helpful', dir: 1, page: 1, sel: new Set() };

const LP_STATUS = { published: ['b-good', 'checkCircle', 'Published'], draft: ['b-neutral', 'file', 'Draft'], noindex: ['b-warn', 'ban', 'Hidden from Google'] };
const LP_KINDS = [['', 'All'], ['carrier', 'Carrier'], ['model', 'Phone model'], ['tool', 'Free tool'], ['brand', 'Brand'], ['country', 'Country']];
const lpBadge = (st) => badge(...LP_STATUS[st]);
const pct0 = (n) => Math.round(n) + '%';
const helpfulOf = (h) => (h.yes + h.no ? (h.yes / (h.yes + h.no)) * 100 : 0);

function listingRows() {
  return D(S.listings).map((l) => {
    const s = svc(l.sid), retail = S.retail[s.code] || 0;
    const os = S.orders.filter((o) => isB2C(o) && o.sid === l.sid && o.status !== 'rejected' && Date.now() - o.created < 30 * DAY);
    return { l, s, retail, floor: retailFloor(s), orders: os.length, rev: sum(os, (o) => o.price), margin: retail ? ((retail - s.cost) / retail) * 100 : 0 };
  });
}
function tabListings() {
  const rows = listingRows(), on = rows.filter((r) => r.l.listed);
  const cols = [
    { key: 'name', label: 'Service', val: (r) => r.s.name, render: (r) => `<p class="font-medium">${esc(r.l.title)}</p><p class="mono text-2xs text-ink3">${esc(r.s.code)} · /${esc(r.l.slug)}</p>` },
    { key: 'base', label: 'B2B base', num: true, hide: 'md', val: (r) => r.s.price, render: (r) => `<span class="text-ink2">${price(r.s.price)}</span>` },
    { key: 'retail', label: 'Storefront price', num: true, val: (r) => r.retail, render: (r) => `${r.retail ? `<span class="font-medium">${price(r.retail)}</span>` : '<span class="text-ink3">–</span>'}<p class="text-2xs text-ink3">Floor ${price(r.floor)}</p>` },
    { key: 'margin', label: 'Margin', num: true, hide: 'lg', val: (r) => r.margin, render: (r) => (r.retail ? `<span class="tabular-nums ${r.margin < 15 ? 'text-warn-fg' : ''}">${pct(r.margin)}</span>` : '–') },
    { key: 'orders', label: 'Orders, 30 days', num: true, hide: 'sm', val: (r) => r.orders, render: (r) => (r.orders ? `${num(r.orders)}<p class="text-2xs text-ink3">${money0(r.rev)}</p>` : '<span class="text-ink3">0</span>') },
    { key: 'langs', label: 'Languages', hide: 'xl', render: (r) => `<span class="text-ink2">${esc(r.l.langs)}</span>` },
    { key: 'listed', label: 'On the site', render: (r) => (r.l.locked ? `<span class="inline-flex items-center gap-1.5 text-xs text-ink3">${icon('lock', 'ic-xs')}${esc(r.l.why)}</span>` : switchEl(r.l.listed, 'sf-list', r.s.id, 'Show ' + r.l.title + ' on the storefront')) },
    { key: 'a', label: '', render: (r) => (r.l.locked ? '' : `<button class="btn btn-sm" data-act="sf-price" data-id="${r.s.id}">${icon('edit', 'ic-xs')}Price</button>`) },
  ];
  const strip = statGrid([
    { label: 'Services on the site', value: on.length, sub: 'of ' + rows.length + ' IMEI services' },
    { label: 'Locked to B2B', value: rows.filter((r) => r.l.locked).length, sub: 'Removal and disabled services', tip: 'Services that attract stolen devices are never shown to the public. They stay available to merchants through the API.' },
    { label: 'Average margin', value: on.length ? pct(sum(on, (r) => r.margin) / on.length) : '–', sub: 'Storefront price against cost', tip: 'Retail price minus the supplier cost, as a share of the retail price. Gateway fees come on top.' },
    { label: 'Storefront orders, 30 days', value: num(sum(rows, (r) => r.orders)), sub: money0(sum(rows, (r) => r.rev)) + ' before VAT' },
  ], 'Storefront catalogue');
  return `${strip}${panel({ title: 'What the public can buy', sub: 'Only IMEI services are sold to the public. A retail price can never go below the B2B base price plus 10%, so merchants never find it cheaper to buy on the storefront.', body: table({ id: 'sf-listings', st: ui.sfL, cols, rows, rowId: (r) => r.s.id, caption: 'Storefront listings', empty: emptyBlock({ ic: 'tag', title: 'No services yet', body: 'Add IMEI services under Services & pricing, then list them here.' }) }), flush: true })}`;
}
actions['sf-list'] = (el) => {
  const l = listingOf(el.dataset.id), on = !l.listed;
  const r = setListed(el.dataset.id, on);
  if (r.error) { render(); toast({ kind: 'error', title: 'Can’t list this service', body: r.error }); return; }
  toast({ kind: 'success', title: on ? 'Now on the storefront' : 'Removed from the storefront', body: svc(el.dataset.id).name, ttl: 2600 });
};
actions['sf-price'] = (el) => {
  const s = svc(el.dataset.id), cur = S.retail[s.code], floor = retailFloor(s);
  modal({
    title: 'Storefront price', sub: esc(s.name),
    body: `<div class="space-y-3">${field('Price shown to customers (USD, before VAT)', `<input class="input mono" name="v" type="text" inputmode="decimal" value="${cur.toFixed(2)}" autocomplete="off">`, `Floor ${money(floor)}: the B2B base price ${money(s.price)} plus 10%. Customers see this price in their own currency with VAT added.`)}
      ${kv([['Supplier cost', money(s.cost)], ['Margin at this price', '<span data-live-margin>' + pct(((cur - s.cost) / cur) * 100) + '</span>'], ['Gateway fee on a card payment', '≈ ' + money(gatewayFee(cur * 1.2, 'card'))]])}</div>`,
    confirm: 'Save price',
    onSubmit: (f) => { const r = setRetailPrice(el.dataset.id, f.v.value); if (r.error) { f.v.setAttribute('aria-invalid', 'true'); return r.error; } toast({ kind: 'success', title: 'Price saved', body: s.name + ' is now ' + money(parseFloat(f.v.value)) + ' on the storefront.', ttl: 2800 }); return true; },
  });
};

/* ---------- landing pages ---------- */
function tabLanding() {
  const rows = D(S.landing).filter((p) => !ui.storefront.lpKind || p.kind === ui.storefront.lpKind);
  const pub = D(S.landing).filter((p) => p.status === 'published');
  const strip = statGrid([
    { label: 'Published pages', value: pub.length, sub: 'of ' + D(S.landing).length + ' pages' },
    { label: 'Visits, 30 days', value: num(sum(pub, (p) => p.views)), sub: 'From search and links' },
    { label: 'Orders from pages', value: num(sum(pub, (p) => p.orders)), sub: 'Customer started on one of these' },
    { label: 'Visit to order', value: pub.length ? pct((sum(pub, (p) => p.orders) / Math.max(1, sum(pub, (p) => p.views))) * 100) : '–', sub: 'All published pages', tip: 'Orders divided by visits. The free IMEI tools convert lower but bring most of the first visits.' },
  ], 'Landing page figures');
  const cols = [
    { key: 'title', label: 'Page', val: (p) => p.title, render: (p) => `<p class="font-medium">${esc(p.title)}</p><p class="mono text-2xs text-ink3">/unlock/${esc(p.slug)}</p>${p.note ? `<p class="mt-0.5 text-2xs text-warn-fg">${esc(p.note)}</p>` : ''}` },
    { key: 'kind', label: 'Type', hide: 'sm', val: (p) => p.kind, render: (p) => typeTag(LP_KINDS.find((k) => k[0] === p.kind)[1]) },
    { key: 'status', label: 'Status', val: (p) => p.status, render: (p) => lpBadge(p.status) },
    { key: 'views', label: 'Visits', num: true, val: (p) => p.views, render: (p) => (p.views ? num(p.views) : '<span class="text-ink3">0</span>') },
    { key: 'orders', label: 'Orders', num: true, hide: 'sm', val: (p) => p.orders, render: (p) => num(p.orders) },
    { key: 'cr', label: 'Visit to order', num: true, hide: 'md', val: (p) => (p.views ? p.orders / p.views : 0), render: (p) => (p.views ? pct((p.orders / p.views) * 100) : '–') },
    { key: 'langs', label: 'Languages', hide: 'xl', render: (p) => `<span class="text-ink2">${esc(p.langs)}</span>` },
    { key: 'updated', label: 'Updated', hide: 'lg', val: (p) => p.updated, render: (p) => `<span class="text-ink2">${ago(p.updated)}</span>` },
    { key: 'a', label: '', render: (p) => `<button class="btn btn-ghost btn-icon btn-sm" data-act="lp-menu" data-id="${p.id}" aria-label="Actions for ${esc(p.title)}" aria-haspopup="menu">${icon('more')}</button>` },
  ];
  const kinds = segEl(LP_KINDS, ui.storefront.lpKind, 'sf-kind', '', 'Page type');
  return `${strip}${panel({ title: 'Landing pages', sub: 'One page per carrier, model and free tool. This is where search traffic arrives, so thin pages are kept out of Google until they have real content.', right: kinds, body: table({ id: 'sf-landing', st: ui.sfP, cols, rows, rowId: (p) => p.id, caption: 'Landing pages', empty: emptyBlock({ ic: 'globe', title: 'No pages of this type', body: 'Pick another type to see more pages.' }) }), flush: true })}`;
}
actions['sf-kind'] = (el) => { ui.storefront.lpKind = el.dataset.v; ui.sfP.page = 1; render(); };
actions['lp-menu'] = (el) => {
  const p = S.landing.find((x) => x.id === el.dataset.id), set = (st, msg) => () => { setLanding(p.id, st); toast({ kind: 'success', title: msg, body: p.title, ttl: 2600 }); };
  openMenu(el, [
    p.status !== 'published' ? { label: 'Publish', icon: 'check', run: set('published', 'Page published') } : null,
    p.status === 'published' ? { label: 'Hide from Google', icon: 'ban', run: set('noindex', 'Page hidden from search results') } : null,
    p.status !== 'draft' ? { label: 'Unpublish', icon: 'x', run: set('draft', 'Page unpublished') } : null,
    { label: 'Open the page', icon: 'ext', run: () => toast({ kind: 'info', title: 'Demo only', body: 'This would open /unlock/' + p.slug + ' on the public site.', ttl: 2600 }) },
  ].filter(Boolean), { width: 200 });
};

/* ---------- content and legal ---------- */
function tabContent() {
  const pages = D(S.pages), legal = D(S.legal).filter((d) => d.current), old = D(S.legal).filter((d) => !d.current);
  const pcols = [
    { key: 'title', label: 'Page', render: (p) => `<p class="font-medium">${esc(p.title)}</p><p class="mono text-2xs text-ink3">/${p.kind === 'blog' ? 'blog/' : ''}${esc(p.slug)}</p>` },
    { key: 'kind', label: 'Type', hide: 'sm', render: (p) => typeTag(p.kind === 'blog' ? 'Blog post' : 'Page') },
    { key: 'status', label: 'Status', render: (p) => badge(p.status === 'published' ? 'b-good' : 'b-neutral', p.status === 'published' ? 'checkCircle' : 'file', p.status === 'published' ? 'Published' : 'Draft') },
    { key: 'langs', label: 'Languages', hide: 'md', render: (p) => `<span class="text-ink2">${esc(p.langs)}</span>` },
    { key: 'updated', label: 'Updated', hide: 'sm', render: (p) => `<span class="text-ink2">${ago(p.updated)}</span>` },
    { key: 'a', label: '', render: (p) => `<button class="btn btn-sm" data-act="pg-toggle" data-id="${p.id}">${p.status === 'published' ? 'Unpublish' : 'Publish'}</button>` },
  ];
  const lcols = [
    { key: 'type', label: 'Document', render: (d) => `<p class="font-medium">${esc(d.type)}</p><p class="text-2xs text-ink3">${d.lang === 'AR' ? 'Arabic' : 'English'}</p>` },
    { key: 'v', label: 'Version', render: (d) => `<span class="mono">v${d.version}</span>${d.needs ? '<p class="text-2xs font-medium text-warn-fg">Customers must accept again</p>' : ''}` },
    { key: 'eff', label: 'In force since', hide: 'sm', render: (d) => `<span class="text-ink2">${fmtDay(d.effective)}</span>` },
    { key: 'acc', label: 'Accepted at checkout', num: true, hide: 'md', render: (d) => (d.accepted ? num(d.accepted) + ' times' : '<span class="text-ink3">Not asked</span>') },
    { key: 'a', label: '', render: (d) => `<button class="btn btn-sm" data-act="lg-publish" data-id="${d.id}">New version…</button>` },
  ];
  return `<div class="grid gap-4">
    ${panel({ title: 'Pages and blog', sub: 'The About, contact and how-it-works pages, and the guides that bring in search traffic.', body: table({ id: 'sf-pages', st: ui.sfC, cols: pcols, rows: pages, rowId: (p) => p.id, sortable: false, caption: 'Pages and blog posts', empty: emptyBlock({ ic: 'file', title: 'No pages', body: 'Add pages and guides here.' }) }), flush: true })}
    ${panel({ title: 'Legal documents', sub: 'Every order stores which version the customer accepted. That record is what you send the card network when a customer disputes a charge.', body: table({ id: 'sf-legal', st: { sort: '', dir: 1, page: 1, sel: new Set() }, cols: lcols, rows: legal, rowId: (d) => d.id, sortable: false, caption: 'Legal documents', empty: emptyBlock({ ic: 'scale', title: 'No legal documents', body: 'Publish terms, privacy and refund policy before taking public orders.' }) }) + (old.length ? `<p class="border-t border-line px-3.5 py-2.5 text-xs text-ink3">Earlier versions kept for the record: ${old.map((d) => `${esc(d.type)} v${d.version} (${d.lang}), accepted ${d.accepted} times`).join('; ')}.</p>` : ''), flush: true })}
  </div>`;
}
actions['pg-toggle'] = (el) => { const p = S.pages.find((x) => x.id === el.dataset.id), to = p.status === 'published' ? 'draft' : 'published'; setPageStatus(p.id, to); toast({ kind: 'success', title: to === 'published' ? 'Page published' : 'Page unpublished', body: p.title, ttl: 2400 }); };
actions['lg-publish'] = (el) => {
  const d = S.legal.find((x) => x.id === el.dataset.id), [maj, min] = d.version.split('.').map(Number);
  confirmDlg({ title: 'Publish a new version?', body: `<p>${esc(d.type)} (${d.lang}) goes from v${d.version} to <strong>v${maj}.${min + 1}</strong> today.</p><p class="mt-2">Customers are asked to accept it again at their next order. Orders already placed keep the version they accepted.</p>`, confirm: 'Publish v' + maj + '.' + (min + 1), run: () => { publishLegal(d.id); toast({ kind: 'success', title: d.type + ' updated', body: 'Version ' + maj + '.' + (min + 1) + ' is now in force.', ttl: 2800 }); } });
};

/* ---------- help centre ---------- */
function tabHelp() {
  const hs = D(S.help), pub = hs.filter((h) => h.status === 'published');
  const votes = sum(pub, (h) => h.yes + h.no), yes = sum(pub, (h) => h.yes);
  const weak = pub.filter((h) => h.yes + h.no >= 30 && helpfulOf(h) < 70);
  const strip = statGrid([
    { label: 'Articles', value: pub.length, sub: hs.length - pub.length + ' in draft' },
    { label: 'Found helpful', value: votes ? pct0((yes / votes) * 100) : '–', sub: num(votes) + ' votes' },
    { label: 'Need a rewrite', value: weak.length, cls: weak.length ? 'text-warn-fg' : '', sub: 'Under 70% helpful', tip: 'Articles where most readers said no. Fix these first: each one is a question that ends up in the support inbox.' },
    { label: 'Most read', value: pub.length ? esc(pub.slice().sort((a, b) => b.yes + b.no - (a.yes + a.no))[0].q.split(' ').slice(0, 3).join(' ') + '…') : '–', sub: 'By votes' },
  ], 'Help centre figures');
  const cols = [
    { key: 'q', label: 'Question', val: (h) => h.q, render: (h) => `<p class="font-medium">${esc(h.q)}</p>${h.yes + h.no >= 30 && helpfulOf(h) < 70 && h.status === 'published' ? '<p class="text-2xs font-medium text-warn-fg">Most readers said this did not help</p>' : ''}` },
    { key: 'cat', label: 'Topic', hide: 'sm', val: (h) => h.cat, render: (h) => typeTag(h.cat) },
    { key: 'helpful', label: 'Helpful', num: true, val: (h) => helpfulOf(h), render: (h) => `<div class="flex items-center justify-end gap-2"><div class="meter w-14"><i style="width:${helpfulOf(h)}%;background:rgb(var(--${helpfulOf(h) < 70 ? 'warn-dot' : 'good-dot'}))"></i></div><span class="tabular-nums">${pct0(helpfulOf(h))}</span></div>` },
    { key: 'votes', label: 'Votes', num: true, hide: 'md', val: (h) => h.yes + h.no, render: (h) => num(h.yes + h.no) },
    { key: 'status', label: 'Status', render: (h) => badge(h.status === 'published' ? 'b-good' : 'b-neutral', h.status === 'published' ? 'checkCircle' : 'file', h.status === 'published' ? 'Published' : 'Draft') },
    { key: 'a', label: '', render: (h) => `<button class="btn btn-sm" data-act="help-toggle" data-id="${h.id}">${h.status === 'published' ? 'Unpublish' : 'Publish'}</button>` },
  ];
  return `${strip}${panel({ title: 'Help centre', sub: 'Answers that customers read before they write to support.', body: table({ id: 'sf-help', st: ui.sfH, cols, rows: hs, rowId: (h) => h.id, caption: 'Help articles', empty: emptyBlock({ ic: 'life', title: 'No articles yet', body: 'Write the five questions customers ask most.' }) }), flush: true })}`;
}
actions['help-toggle'] = (el) => { const h = S.help.find((x) => x.id === el.dataset.id), to = h.status === 'published' ? 'draft' : 'published'; setHelpStatus(h.id, to); toast({ kind: 'success', title: to === 'published' ? 'Article published' : 'Article unpublished', body: h.q, ttl: 2400 }); };

/* ---------- live preview: the customer's own checkout, wired to the real engine ---------- */
const PV_STEPS = ['Check your phone', 'Pick a service', 'Pay', 'Done'];
const pvSample = (kind) => {
  const t = S.tac.find((x) => x.brand === 'Apple') || S.tac[0];
  for (let i = 0; i < 400; i++) {
    const imei = luhn(t.tac + String(100000 + ((i * 7919 + 13) % 900000)).slice(0, 6));
    const last = +imei[14];
    if (kind === 'bad' ? last === 0 : kind === 'locked' ? last % 2 === 1 : last % 2 === 0 && last !== 0) return imei;
  }
  return luhn(t.tac + '123456');
};
function pvServices() {
  return S.listings.filter((l) => l.listed && S.retail[svc(l.sid).code]);
}
function previewStep1(pv) {
  const ck = pv.check;
  const res = !ck ? '' : !ck.ok ? `<p class="mt-3 flex items-start gap-2 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">${icon('alert', 'ic-sm mt-0.5')}${esc(ck.err)}</p>`
    : ck.blacklisted ? `<div class="mt-3 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert"><p class="flex items-center gap-2 font-medium">${icon('xCircle', 'ic-sm')}This phone is blacklisted</p><p class="mt-1">${esc(ck.model)} was reported lost or stolen. No service can unlock it, so we don’t take payment. You have not been charged.</p></div>`
      : `<div class="mt-3 rounded-md bg-good-bg p-3 text-sm text-good-fg"><p class="flex items-center gap-2 font-medium">${icon('checkCircle', 'ic-sm')}${esc(ck.model)}${ck.year ? ' · ' + ck.year : ''}</p><p class="mt-1">${ck.locked ? 'Locked to a carrier. We can unlock it.' : 'The carrier lock status is unknown. Pick the carrier it was bought from.'} Not on the blacklist.</p></div>`;
  return `<div class="mx-auto max-w-md"><h3 class="text-lg font-semibold">Is your phone eligible?</h3><p class="mt-1 text-sm text-ink2">Free check, no account needed. Dial <span class="kbd">*#06#</span> to see the IMEI.</p>
    <label class="label mt-4" for="pv-imei">IMEI, 15 digits</label>
    <input id="pv-imei" class="input mono" type="text" inputmode="numeric" maxlength="19" placeholder="35 123456 654321 0" value="${esc(pv.imei)}" data-bind="pv-imei" data-fk="pv-imei" data-enter="pv-check" autocomplete="off" spellcheck="false">
    <div class="mt-2 flex flex-wrap items-center gap-2"><button class="btn btn-primary" data-act="pv-check">${icon('search', 'ic-sm')}Check this IMEI</button><span class="text-xs text-ink3">Try a sample:</span><button class="btn btn-ghost btn-sm" data-act="pv-sample" data-k="ok">Eligible</button><button class="btn btn-ghost btn-sm" data-act="pv-sample" data-k="bad">Blacklisted</button><button class="btn btn-ghost btn-sm" data-act="pv-sample" data-k="wrong">Typo</button></div>
    ${res}
    ${ck && ck.ok && !ck.blacklisted ? `<button class="btn btn-primary mt-4 w-full justify-center" data-act="pv-go" data-step="2">Choose a service${icon('arrowR', 'ic-sm')}</button>` : ''}</div>`;
}
function previewStep2(pv) {
  const ls = pvServices(), ck = pv.check;
  const nm = (ck && ck.brand) || '';
  const sorted = ls.slice().sort((a, b) => (nm && svc(b.sid).name.includes(nm) ? 1 : 0) - (nm && svc(a.sid).name.includes(nm) ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const cc = B2C_COUNTRIES[pv.country];
  return `<div class="mx-auto max-w-xl"><h3 class="text-lg font-semibold">Pick your service</h3><p class="mt-1 text-sm text-ink2">${esc(ck.model)} · prices shown in ${cc.cur} with VAT. ${ls.length} services available.</p>
    <ul class="m-0 mt-3 list-none divide-y divide-line rounded-lg border border-line p-0">${sorted.map((l) => {
      const s = svc(l.sid), q = quoteStorefront({ sid: s.id, country: pv.country }), on = pv.sid === s.id;
      return `<li><button type="button" class="flex w-full items-center gap-3 px-3.5 py-3 text-start hover:bg-hover ${on ? 'bg-accent-soft' : ''}" data-act="pv-pick" data-id="${s.id}" aria-pressed="${on}"><span class="min-w-0 flex-1"><span class="block font-medium">${esc(l.title)}${l.featured ? ' <span class="tag">Popular</span>' : ''}</span><span class="block text-xs text-ink3">Usually ready in ${ageText(s.sla * MIN)}. Refund if it fails.</span></span><span class="text-end"><span class="block font-semibold tabular-nums">${lm(q.gross, q.cur)}</span>${q.tax > 0 ? `<span class="block text-2xs text-ink3">incl. ${pct(q.rate * 100)} VAT</span>` : ''}</span></button></li>`;
    }).join('')}</ul>
    <div class="mt-4 flex gap-2"><button class="btn" data-act="pv-go" data-step="1">${icon('chevL', 'ic-sm')}Back</button><button class="btn btn-primary flex-1 justify-center" data-act="pv-go" data-step="3" ${pv.sid ? '' : 'disabled'}>Continue to payment</button></div></div>`;
}
function previewStep3(pv) {
  const q = quoteStorefront({ sid: pv.sid, country: pv.country });
  const gw = S.settings.gateways, cardOn = gw.find((g) => g.id === 'gw1').on, cryptoOn = gw.find((g) => g.id === 'gw2').on;
  const methods = [['card', 'Card', cardOn], ['wallet', 'Apple Pay / Google Pay', cardOn], ['crypto', 'USDT or Bitcoin', cryptoOn]].filter((m) => m[2]);
  if (!methods.some((m) => m[0] === pv.method)) pv.method = methods[0] ? methods[0][0] : 'card';
  const pol = S.settings.policies;
  return `<div class="mx-auto grid max-w-3xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
    <div><h3 class="text-lg font-semibold">Pay for your order</h3>
      <label class="label mt-3" for="pv-email">Email for the result and receipt</label>
      <input id="pv-email" class="input" type="text" inputmode="email" value="${esc(pv.email)}" placeholder="you@example.com" data-bind="pv-email" data-fk="pv-email" autocomplete="off" spellcheck="false">
      ${pol.guestCheckout ? '<p class="hint">No account needed. You can track the order from the link in your email.</p>' : '<p class="hint text-warn-fg">Guest checkout is off in Settings, so customers would be asked to sign in here.</p>'}
      <div class="mt-3"><label class="label" for="pv-country">Country</label>${selectEl('pv-country', pv.country, COUNTRY_OPTS, 'Country', 'id="pv-country" data-bind="pv-country"', 'w-full')}</div>
      <fieldset class="mt-3"><legend class="label">Payment method</legend><div class="grid gap-2 sm:grid-cols-3">${methods.map(([k, l]) => `<label class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${pv.method === k ? 'border-accent bg-accent-soft' : 'border-line2'}"><input type="radio" name="pv-method" value="${k}" ${pv.method === k ? 'checked' : ''} data-bind="pv-method" class="accent-[rgb(var(--accent))]">${l}</label>`).join('') || '<p class="text-sm text-crit-fg sm:col-span-3">All payment methods are off. Turn one on in Settings.</p>'}</div></fieldset>
      <div class="mt-3 space-y-2 text-sm"><label class="flex cursor-pointer items-start gap-2"><input type="checkbox" class="check mt-0.5" data-act="pv-consent" ${pv.consent ? 'checked' : ''}><span>I accept the <span class="link">Terms</span>, <span class="link">Privacy policy</span> and <span class="link">Refund policy</span>.</span></label>
      ${pol.withdrawalWaiver ? `<label class="flex cursor-pointer items-start gap-2"><input type="checkbox" class="check mt-0.5" data-act="pv-waiver" ${pv.waiver ? 'checked' : ''}><span>I ask for the service to start now and understand I lose my 14-day right to cancel once it is delivered.</span></label>` : ''}</div>
      ${pv.err ? `<p class="mt-3 flex items-start gap-2 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">${icon('alert', 'ic-sm mt-0.5')}${esc(pv.err)}</p>` : ''}
    </div>
    <aside class="h-fit rounded-lg border border-line bg-sunken p-3.5 text-sm" aria-label="Order summary"><p class="font-medium">${esc(q.s.name)}</p><p class="mono text-2xs text-ink3">${esc(pv.check.model)} · ${fmtImei(pv.check.imei)}</p>
      <dl class="mt-3 space-y-1.5"><div class="flex justify-between"><dt class="text-ink2">Service</dt><dd class="tabular-nums">${lm(q.list, q.cur)}</dd></div><div class="flex justify-between"><dt class="text-ink2">VAT ${pct(q.rate * 100)}</dt><dd class="tabular-nums">${lm(q.tax, q.cur)}</dd></div><div class="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd class="tabular-nums">${lm(q.gross, q.cur)}</dd></div></dl>
      ${q.cur !== 'USD' ? `<p class="mt-1 text-2xs text-ink3">Charged as ${money(q.gross)} at ${B2C_FX[q.cur]} ${q.cur} per USD</p>` : ''}
      <button class="btn btn-primary mt-3 w-full justify-center" data-act="pv-pay" ${methods.length ? '' : 'disabled'}>${icon('lock', 'ic-sm')}Pay ${lm(q.gross, q.cur)}</button>
      <p class="mt-2 text-center text-2xs text-ink3">Demo: no real payment is taken. ${pv.method === 'card' && pol.require3ds ? '3D Secure is requested.' : ''}</p></aside>
    <div class="md:col-span-2"><button class="btn" data-act="pv-go" data-step="2">${icon('chevL', 'ic-sm')}Back</button></div></div>`;
}
function previewStep4(pv) {
  const o = pv.order ? ord(pv.order) : null;
  if (!o) return emptyBlock({ ic: 'orders', title: 'No order', body: 'Start again from the beginning.', cta: '<button class="btn" data-act="pv-reset">Start again</button>' });
  const held = o.status === 'review', done = o.status === 'completed', fail = o.status === 'rejected';
  const msg = fail ? ['xCircle', 'text-crit-fg', 'We couldn’t complete this order', 'You have been refunded in full. It can take 5 to 10 days to show on your statement.']
    : done ? ['checkCircle', 'text-good-fg', 'Your result is ready', o.reply ? o.reply : 'We emailed the result to ' + (cus(o.cid) ? cus(o.cid).email : 'you') + '.']
      : held ? ['clock', 'text-warn-fg', 'We are checking your order', 'Some orders are checked by a person before they are sent. This usually takes under an hour. You will get an email either way.']
        : ['loader', 'text-accent', 'Working on it', 'Your order was sent to the carrier. Usual time: ' + ageText(svc(o.sid).sla * MIN) + '. You can close this page, we will email you.'];
  return `<div class="mx-auto max-w-md text-center"><span class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sunken ${msg[1]}">${icon(msg[0], 'ic-lg')}</span><h3 class="mt-3 text-lg font-semibold">${msg[2]}</h3><p class="mt-1 text-sm text-ink2">${esc(msg[3])}</p>
    <dl class="dl mt-4 text-start"><dt>Order</dt><dd><span class="mono">${o.id}</span></dd><dt>Service</dt><dd>${esc(svc(o.sid).name)}</dd><dt>Paid</dt><dd>${lm(o.gross, o.cur)} by ${B2C_METHODS[o.pay.method].label.toLowerCase()}</dd><dt>Tracking link</dt><dd class="mono break-all text-xs">gsmsupply.example/track/${esc(o.token)}</dd></dl>
    <div class="mt-4 flex flex-wrap justify-center gap-2"><button class="btn" data-act="order-open" data-id="${o.id}">${icon('panel', 'ic-sm')}See it in the admin</button><button class="btn" data-act="pv-reset">${icon('refresh', 'ic-sm')}Place another</button></div>
    <p class="mt-3 text-2xs text-ink3">The customer sees none of the risk score, supplier or margin. Those stay on your side.</p></div>`;
}
function tabPreview() {
  const pv = ui.storefront.pv;
  const stepper = `<ol class="m-0 flex list-none items-center justify-center gap-1.5 p-0 text-xs" aria-label="Checkout steps">${PV_STEPS.map((l, i) => `<li class="flex items-center gap-1.5 ${pv.step === i + 1 ? 'font-semibold text-ink' : pv.step > i + 1 ? 'text-good-fg' : 'text-ink3'}" ${pv.step === i + 1 ? 'aria-current="step"' : ''}><span class="flex h-5 w-5 items-center justify-center rounded-full border text-2xs ${pv.step > i + 1 ? 'border-good-dot bg-good-bg' : pv.step === i + 1 ? 'border-accent bg-accent text-white' : 'border-line2'}">${pv.step > i + 1 ? icon('check', 'ic-xs') : i + 1}</span><span class="hidden sm:inline">${l}</span>${i < 3 ? '<span class="mx-1 h-px w-4 bg-line2 sm:w-8"></span>' : ''}</li>`).join('')}</ol>`;
  const body = [previewStep1, previewStep2, previewStep3, previewStep4][pv.step - 1](pv);
  return `<div class="mb-3 flex items-start gap-2 rounded-md border border-line2 bg-sunken px-3 py-2 text-xs text-ink2" role="note">${icon('info', 'ic-sm mt-0.5')}<span>This is what your customer sees. It runs on the same engine as the admin: the price, VAT, risk score and ledger entries are real, so a payment here shows up in Orders, Refunds and Finance.</span></div>
    <div class="panel overflow-hidden"><div class="flex items-center gap-2 border-b border-line bg-sunken px-3.5 py-2"><span class="flex gap-1" aria-hidden="true"><i class="h-2.5 w-2.5 rounded-full bg-line2"></i><i class="h-2.5 w-2.5 rounded-full bg-line2"></i><i class="h-2.5 w-2.5 rounded-full bg-line2"></i></span><span class="mx-auto flex h-6 w-full max-w-xs items-center justify-center gap-1.5 rounded bg-surface px-2 text-xs text-ink3">${icon('lock', 'ic-xs')}gsmsupply.example</span><button class="btn btn-ghost btn-sm" data-act="pv-reset">Reset</button></div>
    <div class="px-3.5 py-6 sm:px-6 sm:py-8"><div class="mb-6">${stepper}</div>${body}</div></div>`;
}
binds['pv-imei'] = (el, e) => { const pv = ui.storefront.pv; pv.imei = el.value; if (e && e.type === 'change') { pv.check = null; render(); } };
binds['pv-email'] = (el, e) => { ui.storefront.pv.email = el.value; if (e && e.type === 'change') render(); };
binds['pv-country'] = (el) => { ui.storefront.pv.country = el.value; render(); };
binds['pv-method'] = (el) => { ui.storefront.pv.method = el.value; render(); };
actions['pv-check'] = () => { const pv = ui.storefront.pv, el = $('#pv-imei'); if (el) pv.imei = el.value; pv.check = imeiCheck(pv.imei); pv.err = ''; render(); };
actions['pv-sample'] = (el) => { const pv = ui.storefront.pv; pv.imei = el.dataset.k === 'wrong' ? '353890118842019' : fmtImei(pvSample(el.dataset.k)); pv.check = imeiCheck(pv.imei); render(); };
actions['pv-go'] = (el) => { const pv = ui.storefront.pv; pv.step = +el.dataset.step; pv.err = ''; render(); };
actions['pv-pick'] = (el) => { ui.storefront.pv.sid = el.dataset.id; render(); };
actions['pv-consent'] = (el) => { ui.storefront.pv.consent = el.checked; render(); };
actions['pv-waiver'] = (el) => { ui.storefront.pv.waiver = el.checked; render(); };
actions['pv-reset'] = () => { ui.storefront.pv = freshPreview(); render(); };
actions['pv-pay'] = () => {
  const pv = ui.storefront.pv, em = pv.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(em)) pv.err = 'Enter a valid email. The result is sent there.';
  else if (!pv.consent) pv.err = 'Please accept the terms to continue.';
  else if (S.settings.policies.withdrawalWaiver && !pv.waiver) pv.err = 'Please confirm that the service starts now. Without it we can’t deliver a digital service before the 14 days are over.';
  else {
    const r = createStorefrontOrder({ imei: pv.check.imei, sid: pv.sid, email: em, country: pv.country, method: pv.method });
    if (r.error) pv.err = r.error;
    else { pv.err = ''; pv.order = r.order.id; pv.step = 4; toast({ kind: 'info', title: r.order.id + ' paid', body: r.held ? 'The risk engine is holding it for review.' : 'Captured and on its way to the supplier.', action: { label: 'Open', run: () => openOrder(r.order.id) } }); return; }
  }
  render();
};
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter && actions[e.target.dataset.enter]) { e.preventDefault(); actions[e.target.dataset.enter](e.target); } });

function pageStorefront() {
  const g = modeGate('Storefront', 'table');
  if (g) return g;
  const tab = ui.storefront.tab;
  const tabs = tabsEl([['listings', 'Services on sale', D(S.listings).filter((l) => l.listed).length], ['landing', 'Landing pages'], ['content', 'Content and legal'], ['help', 'Help centre'], ['preview', 'Live preview']], tab, 'storefront', 'Storefront sections');
  const body = { listings: tabListings, landing: tabLanding, content: tabContent, help: tabHelp, preview: tabPreview }[tab]();
  return `${pageHead({ title: 'Storefront', sub: 'The public site where consumers buy one unlock at a time. It sells from the same catalogue as the API, at its own prices.', actions: `<button class="btn" data-act="sf-open">${icon('ext', 'ic-sm')}Preview checkout</button>` })}<div class="mb-4">${tabs}</div>${body}`;
}
actions['sf-open'] = () => { ui.storefront.tab = 'preview'; render(); };
