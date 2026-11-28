/* ============ SHAP 瀑布图（单个预测的特征贡献分解：基线 + 逐项加减 = 预测值） ============ */
/* Lundberg & Lee 2017, SHAP (SHapley Additive exPlanations) */

import { el, text, INK, colors } from '../core/svg.js?v=20261128f';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128f';
import { niceTicks, linear } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   base: 0.20,                                   // 基线 E[f(x)]
 *   features: [ { name:'被引频次', value: 0.18 }, ... ],  // 可正可负
 *   x: { label:'预测值（录用概率）' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const F = [...data.features].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const total = data.base + F.reduce((a, f) => a + f.value, 0);

  /* 累计区间 */
  let run = data.base;
  const rows = [{ name: '基线', from: 0, to: data.base, kind: 'base' }];
  F.forEach(f => { const from = run; run += f.value; rows.push({ name: f.name, from, to: run, value: f.value, kind: f.value >= 0 ? 'pos' : 'neg' }); });
  rows.push({ name: '预测值', from: 0, to: total, kind: 'total' });

  const lo = Math.min(0, ...rows.flatMap(r => [r.from, r.to]));
  const hi = Math.max(...rows.flatMap(r => [r.from, r.to]));
  const X = niceTicks(lo, hi * 1.05 + .001, 6);
  const box = { x: 30, y: top + 8, w: W - 40, h: H - top - 8 - footH };
  const val = linear(X.lo, X.hi, box.x, box.x + box.w);
  const rowStep = box.h / rows.length;
  const barH = Math.min(3.6, rowStep * .58);

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of X.ticks) {
    el('line', { x1: val(t), x2: val(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, val(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
    if (t !== X.lo) el('line', { x1: val(t), x2: val(t), y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .2 }, svg);
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (X.lo < 0 && X.hi > 0) el('line', { x1: val(0), x2: val(0), y1: box.y, y2: box.y + box.h, stroke: INK.soft, 'stroke-width': .3 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  rows.forEach((r, i) => {
    const cy = box.y + (i + .5) * rowStep;
    text(svg, box.x - 1.8, cy + .9, r.name, { size: 2.6, anchor: 'end' });
    const x0 = val(Math.min(r.from, r.to)), x1 = val(Math.max(r.from, r.to));
    const color = r.kind === 'pos' ? cs[3] : r.kind === 'neg' ? cs[0] : INK.soft;
    const rect = el('rect', { x: x0, y: cy - barH / 2, width: Math.max(.4, x1 - x0), height: barH, fill: color, 'fill-opacity': r.kind === 'base' || r.kind === 'total' ? .45 : .85, cursor: 'pointer' }, svg);
    /* 连接虚线到下一行起点 */
    if (i > 0 && i < rows.length - 1)
      el('line', { x1: val(r.to), x2: val(r.to), y1: cy + barH / 2, y2: cy + rowStep - barH / 2 + barH, stroke: INK.axis, 'stroke-width': .25, 'stroke-dasharray': '1 1' }, svg);
    const label = r.kind === 'base' || r.kind === 'total' ? fmt(+r.to.toFixed(3)) : `${r.value >= 0 ? '+' : ''}${fmt(+r.value.toFixed(3))}`;
    text(svg, x1 + 1.4, cy + .9, label, { size: 2.3, fill: INK.base });
    const msg = r.kind === 'base' ? `<b>基线</b> E[f(x)] = ${fmt(+r.to.toFixed(3))}` : r.kind === 'total' ? `<b>预测值</b> f(x) = ${fmt(+r.to.toFixed(3))}` : `<b>${r.name}</b><br>SHAP 值 ${r.value >= 0 ? '+' : ''}${fmt(+r.value.toFixed(3))}`;
    rect.addEventListener('pointerenter', ev => tip(msg, ev));
    rect.addEventListener('pointermove', ev => tip(msg, ev));
    rect.addEventListener('pointerleave', tipHide);
  });

  figureNote(svg, o);
  return svg;
}
