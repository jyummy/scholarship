/* ============ 海堆图（Sea stack plot：竖直方图 + 摘要统计，替代柱状图） ============ */
/* 2024, Ecology and Evolution：以分箱直方图呈现大样本单变量分布 */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { niceTicks, linear } from '../core/scale.js?v=20261128g';
import { tip, tipHide } from '../core/tip.js?v=20261128g';

/*
 * data = {
 *   groups: [ { name:'样地 A', values:[..原始数据..] } ],
 *   y: { label:'观测值' }, bins: 12
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const G = data.groups, cs = colors();
  const footH = o.note || o.figLabel ? 30 : 18;
  const NB = data.bins || 12;

  const all = G.flatMap(g => g.values);
  const Y = niceTicks(Math.min(...all), Math.max(...all) * 1.02 + .001, 5);
  const box = { x: 17, y: top + 9, w: W - 26, h: H - top - footH };
  const val = linear(Y.lo, Y.hi, box.y + box.h, box.y);
  const catStep = box.w / G.length;

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Y.ticks) {
    el('line', { x1: box.x, x2: box.x + 1.2, y1: val(t), y2: val(t) }, tk);
    text(svg, box.x - 1.6, val(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft });
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.y?.label) {
    const t = text(svg, 0, 0, data.y.label, { size: 2.9, anchor: 'middle' });
    t.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`);
  }

  /* 全局分箱，保证各组同尺度 */
  const bw = (Y.hi - Y.lo) / NB;
  G.forEach((g, i) => {
    const color = g.color || cs[i % cs.length];
    const xi = box.x + (i + .5) * catStep;
    const counts = new Array(NB).fill(0);
    g.values.forEach(v => { const b = Math.min(NB - 1, Math.max(0, Math.floor((v - Y.lo) / bw))); counts[b]++; });
    const cmax = Math.max(...counts, 1);
    const halfW = catStep * .42;
    counts.forEach((c, b) => {
      if (!c) return;
      const yTop = val(Y.lo + (b + 1) * bw), yBot = val(Y.lo + b * bw);
      const w = c / cmax * halfW;
      const r = el('rect', { x: xi - w, y: yTop, width: w * 2, height: Math.max(.4, yBot - yTop - .18), fill: color, 'fill-opacity': .78, cursor: 'pointer' }, svg);
      const msg = `<b>${g.name}</b><br>区间 [${fmt(+(Y.lo + b * bw).toFixed(1))}, ${fmt(+(Y.lo + (b + 1) * bw).toFixed(1))})<br>频数 ${c}`;
      r.addEventListener('pointerenter', ev => tip(msg, ev));
      r.addEventListener('pointermove', ev => tip(msg, ev));
      r.addEventListener('pointerleave', tipHide);
    });
    /* 摘要：均值菱形 + 中位线 */
    const vs = [...g.values].sort((a, b) => a - b);
    const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
    const med = vs[Math.floor(vs.length / 2)];
    el('line', { x1: xi - halfW * .55, x2: xi + halfW * .55, y1: val(med), y2: val(med), stroke: INK.base, 'stroke-width': .7 }, svg);
    const dm = el('path', { d: `M${xi} ${val(mean) - 1.3}L${xi + 1.3} ${val(mean)}L${xi} ${val(mean) + 1.3}L${xi - 1.3} ${val(mean)}Z`, fill: '#fff', stroke: INK.base, 'stroke-width': .5 }, svg);
    text(svg, xi, box.y + box.h + 3.4, g.name, { size: 2.5, anchor: 'middle', fill: INK.soft });
  });

  figureNote(svg, o);
  return svg;
}
