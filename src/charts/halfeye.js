/* ============ 半眼图（Half-eye：半密度 + 点区间，贝叶斯后验分布标准画法） ============ */
/* Kay, ggdist / tidybayes：slab + interval 语法 */

import { el, text, INK, colors } from '../core/svg.js?v=20261128f';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128f';
import { niceTicks, linear, kde } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   groups: [ { name:'处理组', values:[..抽样/后验样本..] } ],
 *   x: { label:'效应量' }, zero: true   // zero=true 时画零参考线
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const G = data.groups, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const all = G.flatMap(g => g.values);
  const X = niceTicks(Math.min(...all, data.zero ? 0 : Infinity), Math.max(...all) * 1.03 + .001, 6);
  const box = { x: 24, y: top + 8, w: W - 32, h: H - top - 8 - footH };
  const val = linear(X.lo, X.hi, box.x, box.x + box.w);
  const rowStep = box.h / G.length;

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of X.ticks) {
    el('line', { x1: val(t), x2: val(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, val(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
    if (t !== X.lo) el('line', { x1: val(t), x2: val(t), y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .2 }, svg);
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.zero && X.lo < 0 && X.hi > 0)
    el('line', { x1: val(0), x2: val(0), y1: box.y, y2: box.y + box.h, stroke: INK.soft, 'stroke-width': .3, 'stroke-dasharray': '1.4 1.1' }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  G.forEach((g, i) => {
    const color = g.color || cs[i % cs.length];
    const vs = [...g.values].sort((a, b) => a - b);
    const n = vs.length;
    const q = p => vs[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
    const med = q(.5), lo66 = q(.17), hi66 = q(.83), lo95 = q(.025), hi95 = q(.975);
    const baseY = box.y + (i + 1) * rowStep - 1.2;          // 区间基线（行底）
    const slabTop = box.y + i * rowStep + 1;                  // 密度上界
    text(svg, box.x - 1.8, baseY - rowStep * .38, g.name, { size: 2.6, anchor: 'end' });

    /* 半密度 slab：只在基线上方 */
    const grid = []; const N = 60;
    for (let k = 0; k <= N; k++) grid.push(X.lo + (X.hi - X.lo) * k / N);
    const dens = kde(vs, grid);
    const dmax = Math.max(...dens, 1e-9);
    const maxH = rowStep * .78;
    let d = `M${val(grid[0])} ${baseY}`;
    grid.forEach((gx, k) => { d += `L${val(gx).toFixed(2)} ${(baseY - dens[k] / dmax * maxH).toFixed(2)}`; });
    d += `L${val(grid[N])} ${baseY}Z`;
    el('path', { d, fill: color, 'fill-opacity': .55, stroke: color, 'stroke-width': .45 }, svg);

    /* 点区间：95% 细线 + 66% 粗线 + 中位数点 */
    el('line', { x1: val(lo95), x2: val(hi95), y1: baseY, y2: baseY, stroke: INK.base, 'stroke-width': .5 }, svg);
    el('line', { x1: val(lo66), x2: val(hi66), y1: baseY, y2: baseY, stroke: INK.base, 'stroke-width': 1.5 }, svg);
    el('circle', { cx: val(med), cy: baseY, r: 1.15, fill: '#fff', stroke: INK.base, 'stroke-width': .55 }, svg);

    const hit = el('rect', { x: box.x, y: box.y + i * rowStep, width: box.w, height: rowStep, fill: 'transparent' }, svg);
    const msg = `<b>${g.name}</b><br>中位数 ${fmt(med)}<br>66% 区间 [${fmt(lo66)}, ${fmt(hi66)}]<br>95% 区间 [${fmt(lo95)}, ${fmt(hi95)}]<br>n = ${n}`;
    hit.addEventListener('pointerenter', ev => tip(msg, ev));
    hit.addEventListener('pointermove', ev => tip(msg, ev));
    hit.addEventListener('pointerleave', tipHide);
  });

  figureNote(svg, o);
  return svg;
}
