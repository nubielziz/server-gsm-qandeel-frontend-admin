/* Charts: hand-rolled SVG, following the dataviz rules (thin marks, 2px gaps, recessive grid, tooltip, table twin) */
const CH = new Map();
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((es) => es.forEach((e) => e.target._draw && e.target._draw())) : null;
const SERIES = [{ key: 'IMEI', label: 'IMEI', c: 's1' }, { key: 'Server', label: 'Server', c: 's2' }, { key: 'Remote', label: 'Remote', c: 's3' }, { key: 'File', label: 'File', c: 's4' }];
const chartHidden = new Set();

function niceStep(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
const chartBox = (id, h, label) => `<div class="relative" data-chart="${id}" style="height:${h}px" role="img" aria-label="${esc(label)}" tabindex="0"></div>`;
function mountCharts() {
  if (ro) ro.disconnect();
  $$('[data-chart]').forEach((el) => {
    const fn = CH.get(el.dataset.chart);
    if (!fn) return;
    el._draw = () => { const w = Math.floor(el.clientWidth); if (w > 20) fn(el, w); };
    el._draw();
    ro && ro.observe(el);
  });
}
const tipPlace = (tip, host, x, y) => {
  const tw = tip.offsetWidth, th = tip.offsetHeight, W = host.clientWidth;
  let left = x + 14; if (left + tw > W) left = x - tw - 14; left = Math.max(0, left);
  tip.style.left = left + 'px'; tip.style.top = Math.max(0, Math.min(y - th / 2, host.clientHeight - th)) + 'px';
};

function drawStacked(el, w, { rows, series, h, fmt = num, yFmt = compact, unit = 'orders' }) {
  const m = { t: 8, r: 6, b: 24, l: 30 };
  const vis = series.filter((s) => !chartHidden.has(s.key));
  const tot = rows.map((r) => sum(vis, (s) => r[s.key]));
  const step = niceStep(Math.max(1, ...tot) / 4), yMax = step * 4;
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const band = pw / rows.length, bw = clamp(band * 0.58, 5, 26);
  const y = (v) => m.t + ph - (v / yMax) * ph;
  const every = rows.length <= 8 ? 1 : rows.length <= 16 ? 2 : rows.length <= 31 ? 5 : 1;
  let g = '';
  for (let i = 0; i <= 4; i++) { const yy = Math.round(y(i * step)) + 0.5; g += `<line class="${i ? 'grid' : 'axis'}" x1="${m.l}" x2="${w - m.r}" y1="${yy}" y2="${yy}"/><text x="${m.l - 6}" y="${yy + 4}" text-anchor="end">${yFmt(i * step)}</text>`; }
  rows.forEach((r, i) => {
    const x0 = m.l + band * i + (band - bw) / 2;
    const live = vis.filter((s) => r[s.key] > 0);
    let acc = 0, bars = '';
    live.forEach((s, si) => {
      const v = r[s.key];
      const yT = y(acc + v), yB = y(acc) - (si ? 2 : 0);
      const hh = Math.max(1, yB - yT);
      const top = si === live.length - 1;
      const rad = top ? Math.min(3, hh / 2) : 0;
      bars += top && rad > 0.5
        ? `<path d="M${x0},${yT + hh}V${yT + rad}Q${x0},${yT} ${x0 + rad},${yT}H${x0 + bw - rad}Q${x0 + bw},${yT} ${x0 + bw},${yT + rad}V${yT + hh}Z" fill="rgb(var(--${s.c}))"/>`
        : `<rect x="${x0}" y="${yT}" width="${bw}" height="${hh}" fill="rgb(var(--${s.c}))"/>`;
      acc += v;
    });
    g += `<g class="bar" data-i="${i}">${bars}</g>`;
    if (i % every === 0 || i === rows.length - 1 && every === 1) g += `<text x="${m.l + band * i + band / 2}" y="${h - 6}" text-anchor="middle">${esc(r.label)}</text>`;
  });
  el.innerHTML = `<svg class="viz block" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${g}<rect class="hit" x="${m.l}" y="0" width="${pw}" height="${h}"/></svg><div class="tip hidden" role="presentation"></div><div class="sr-only" aria-live="polite" data-live></div>`;
  const svgEl = el.querySelector('svg'), tip = el.querySelector('.tip'), live = el.querySelector('[data-live]');
  const bars = $$('.bar', el);
  const show = (i, px, py) => {
    const r = rows[i];
    tip.innerHTML = `<div class="mb-1.5 font-medium">${esc(r.label)}</div>${vis.map((s) => `<div class="flex items-center gap-2"><span class="h-2 w-2 flex-none rounded-sm" style="background:rgb(var(--${s.c}))"></span><span class="flex-1 text-ink2">${s.label}</span><span class="font-medium tabular-nums">${fmt(r[s.key])}</span></div>`).join('')}<div class="mt-1.5 flex justify-between border-t border-line pt-1.5"><span class="text-ink2">Total</span><span class="font-medium tabular-nums">${fmt(tot[i])}</span></div>`;
    tip.classList.remove('hidden');
    tipPlace(tip, el, px, py);
    bars.forEach((b, j) => b.classList.toggle('dim', j !== i));
    live.textContent = `${r.label}: ${fmt(tot[i])} ${unit}. ` + vis.map((s) => `${s.label} ${r[s.key]}`).join(', ');
    el._i = i;
  };
  const hide = () => { tip.classList.add('hidden'); bars.forEach((b) => b.classList.remove('dim')); };
  svgEl.addEventListener('pointermove', (e) => { const rc = svgEl.getBoundingClientRect(); const x = e.clientX - rc.left; const i = clamp(Math.floor((x - m.l) / band), 0, rows.length - 1); show(i, m.l + band * i + band / 2, e.clientY - rc.top); });
  svgEl.addEventListener('pointerleave', hide);
  el.onkeydown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') return hide();
    const i = clamp((el._i ?? (e.key === 'ArrowRight' ? -1 : rows.length)) + (e.key === 'ArrowRight' ? 1 : -1), 0, rows.length - 1);
    show(i, m.l + band * i + band / 2, m.t + 30);
  };
  el.onblur = hide;
}

function drawLine(el, w, { pts, h, color, fmt, yMax, yMin = 0, unit = '', ticks = 3, xLabel, ref = null }) {
  const m = { t: 8, r: 8, b: 22, l: 38 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const hi = yMax != null ? yMax : niceStep(Math.max(...pts.map((p) => p.v)) / ticks) * ticks;
  const x = (i) => m.l + (pts.length === 1 ? pw / 2 : (i / (pts.length - 1)) * pw);
  const y = (v) => m.t + ph - ((v - yMin) / (hi - yMin)) * ph;
  let g = '';
  for (let i = 0; i <= ticks; i++) { const v = yMin + ((hi - yMin) / ticks) * i; const yy = Math.round(y(v)) + 0.5; g += `<line class="${i ? 'grid' : 'axis'}" x1="${m.l}" x2="${w - m.r}" y1="${yy}" y2="${yy}"/><text x="${m.l - 6}" y="${yy + 4}" text-anchor="end">${fmt(v)}</text>`; }
  { const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(pw / 64)))); pts.forEach((p, i) => { if ((pts.length - 1 - i) % step === 0) g += `<text x="${clamp(x(i), m.l + 16, w - m.r - 16).toFixed(1)}" y="${h - 6}" text-anchor="middle">${xLabel(p)}</text>`; }); }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  g += `<path d="${d}L${x(pts.length - 1)},${y(yMin)}L${x(0)},${y(yMin)}Z" fill="rgb(var(--${color}))" opacity=".08"/><path d="${d}" fill="none" stroke="rgb(var(--${color}))" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  /* optional threshold: dashed reference line, and the stretch of the line below it redrawn in the critical colour */
  if (ref) {
    const ry = Math.round(y(ref.v)) + 0.5, cid = 'cl-' + (el.dataset.chart || 'c');
    g += `<clipPath id="${cid}"><rect x="0" y="${ry}" width="${w}" height="${Math.max(0, h - ry)}"/></clipPath><line x1="${m.l}" x2="${w - m.r}" y1="${ry}" y2="${ry}" stroke="rgb(var(--ink3))" stroke-width="1" stroke-dasharray="4 3"/><text x="${m.l + 4}" y="${ry + 12}" text-anchor="start">${esc(ref.label)}</text><path d="${d}" fill="none" stroke="rgb(var(--crit-dot))" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#${cid})"/>`;
  }
  el.innerHTML = `<svg class="viz block" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${g}<line data-cross class="hidden" y1="${m.t}" y2="${m.t + ph}" stroke="rgb(var(--line2))" stroke-width="1"/><circle data-dot class="hidden" r="4" fill="rgb(var(--${color}))" stroke="rgb(var(--surface))" stroke-width="2"/><rect class="hit" x="${m.l}" y="0" width="${pw}" height="${h}"/></svg><div class="tip hidden" role="presentation"></div><div class="sr-only" aria-live="polite" data-live></div>`;
  const svgEl = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('[data-cross]'), dot = el.querySelector('[data-dot]'), live = el.querySelector('[data-live]');
  const show = (i) => {
    const p = pts[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.classList.remove('hidden');
    dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v)); dot.classList.remove('hidden');
    tip.innerHTML = `<div class="font-medium">${fmt(p.v)}${unit}</div><div class="text-ink3">${xLabel(p, true)}</div>`;
    tip.classList.remove('hidden');
    tipPlace(tip, el, x(i), y(p.v));
    live.textContent = `${xLabel(p, true)}: ${fmt(p.v)}${unit}`;
    el._i = i;
  };
  const hide = () => { tip.classList.add('hidden'); cross.classList.add('hidden'); dot.classList.add('hidden'); };
  svgEl.addEventListener('pointermove', (e) => { const rc = svgEl.getBoundingClientRect(); show(clamp(Math.round(((e.clientX - rc.left) - m.l) / pw * (pts.length - 1)), 0, pts.length - 1)); });
  svgEl.addEventListener('pointerleave', hide);
  el.onkeydown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') return hide();
    show(clamp((el._i ?? (e.key === 'ArrowRight' ? -1 : pts.length)) + (e.key === 'ArrowRight' ? 1 : -1), 0, pts.length - 1));
  };
  el.onblur = hide;
}

function spark(vals, color = 'ink3', w = 56, h = 16) {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * (w - 2) + 1).toFixed(1)},${(h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4)).toFixed(1)}`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" class="flex-none"><path d="${d}" fill="none" stroke="rgb(var(--${color}))" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* legend with totals; clicking a series hides it (colour follows the entity, so the others keep theirs) */
function stackLegend(rows) {
  return `<div class="flex flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label="Series">${SERIES.map((s) => {
    const off = chartHidden.has(s.key);
    return `<button type="button" class="inline-flex h-6 items-center gap-1.5 rounded px-1.5 text-xs hover:bg-hover ${off ? 'text-ink3' : 'text-ink2'}" aria-pressed="${!off}" data-act="legend" data-k="${s.key}"><span class="h-2 w-2 rounded-sm" style="background:${off ? 'transparent' : `rgb(var(--${s.c}))`};box-shadow:inset 0 0 0 1px rgb(var(--${s.c}))"></span><span class="${off ? 'line-through' : ''}">${s.label}</span><span class="tabular-nums text-ink3">${num(sum(rows, (r) => r[s.key]))}</span></button>`;
  }).join('')}</div>`;
}
actions.legend = (el) => { const k = el.dataset.k; chartHidden.has(k) ? chartHidden.delete(k) : (chartHidden.size < SERIES.length - 1 && chartHidden.add(k)); render(); };

function seriesTable(rows) {
  return `<div class="tbl-wrap max-h-[264px]"><table class="tbl"><caption class="sr-only">Orders by type</caption><thead><tr><th scope="col">Period</th>${SERIES.map((s) => `<th class="num" scope="col">${s.label}</th>`).join('')}<th class="num" scope="col">Total</th></tr></thead><tbody>${rows.slice().reverse().map((r) => `<tr><td>${esc(r.label)}</td>${SERIES.map((s) => `<td class="num">${num(r[s.key])}</td>`).join('')}<td class="num font-medium">${num(sum(SERIES, (s) => r[s.key]))}</td></tr>`).join('')}</tbody></table></div>`;
}
