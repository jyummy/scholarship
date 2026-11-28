/* ============ 假设结果图（HOPs：Hypothetical Outcome Plots） ============ */
/* Hullman et al.：把抽样结果逐帧轮播，用动画帧表达不确定性；此处以多帧叠印 + 中位线呈现 */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { niceTicks, linear } from '../core/scale.js?v=20261128g';
import { tip, tipHide } from '../core/tip.js?v=20261128g';

/*
 * data = {
 *   categories: ['2025','2026','2027','2028'],
 *   draws: [ [v,v,v,v], ... ],       // 每行 = 一次假设抽样结果
 *   y: { label:'预测发文量 / 篇' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const C = data.categories, D = data.draws, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const all = D.flat();
  const Y = niceTicks(Math.min(...all, 0), Math.max(...all) * 1.05 + .001, 5);
  const box = { x: 17, y: top + 9, w: W - 26, h: H - top - 9 - footH };
  const val = linear(Y.lo, Y.hi, box.y + box.h, box.y);
  const xs = C.map((_, i) => box.x + box.w * (C.length === 1 ? .5 : i / (C.length - 1)));

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Y.ticks) {
    el('line', { x1: box.x, x2: box.x + 1.2, y1: val(t), y2: val(t) }, tk);
    text(svg, box.x - 1.6, val(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft });
    if (t !== Y.lo) el('line', { x1: box.x, x2: box.x + box.w, y1: val(t), y2: val(t), stroke: INK.hair, 'stroke-width': .2 }, svg);
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  C.forEach((c, i) => text(svg, xs[i], box.y + box.h + 3.4, c, { size: 2.5, anchor: 'middle', fill: INK.soft }));
  if (data.y?.label) {
    const t = text(svg, 0, 0, data.y.label, { size: 2.9, anchor: 'middle' });
    t.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`);
  }

  /* 每一帧抽样：一条淡线（SMIL 轮播淡入淡出，模拟 HOPs 逐帧播放） */
  const color = cs[0];
  D.forEach((draw, di) => {
    const d = draw.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i]} ${val(v)}`).join('');
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': .5, 'stroke-opacity': .35 }, svg);
    if (o.animate !== false) {
      const a = el('animate', {
        attributeName: 'stroke-opacity', values: '0.06;0.85;0.06',
        dur: `${Math.max(4, D.length * .8)}s`, begin: `${(di * .8).toFixed(2)}s`, repeatCount: 'indefinite'
      }, p);
    }
    draw.forEach((v, i) => el('circle', { cx: xs[i], cy: val(v), r: .55, fill: color, 'fill-opacity': .35 }, svg));
  });

  /* 中位轨迹：粗黑线 */
  const med = C.map((_, i) => {
    const col = D.map(d => d[i]).sort((a, b) => a - b);
    return col[Math.floor(col.length / 2)];
  });
  const dm = med.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i]} ${val(v)}`).join('');
  const pm = el('path', { d: dm, fill: 'none', stroke: INK.base, 'stroke-width': .9, cursor: 'pointer' }, svg);
  med.forEach((v, i) => el('circle', { cx: xs[i], cy: val(v), r: 1, fill: INK.base }, svg));
  const msg = `<b>中位轨迹</b><br>${C.map((c, i) => `${c}：${fmt(med[i])}`).join('<br>')}<br>共 ${D.length} 帧假设抽样`;
  pm.addEventListener('pointerenter', ev => tip(msg, ev));
  pm.addEventListener('pointermove', ev => tip(msg, ev));
  pm.addEventListener('pointerleave', tipHide);

  figureNote(svg, o);
  return svg;
}
