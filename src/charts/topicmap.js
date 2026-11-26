/* ============ 主题距离图（LDAvis 式：主题间距离投影 + 主题占比气泡） ============ */
/* Sievert & Shirley 2014, LDAvis：气泡面积 ∝ 主题占比，距离 = 主题间 Jensen-Shannon 距离的 MDS 投影 */

import { el, text, INK, colors } from '../core/svg.js?v=20261127a';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261127a';
import { niceTicks, linear } from '../core/scale.js?v=20261127a';
import { tip, tipHide } from '../core/tip.js?v=20261127a';

/*
 * data = {
 *   topics: [ { name:'心性论', x:-0.8, y:0.5, share:0.22, terms:['心','性','理'] } ],
 *   x: { label:'PC1' }, y: { label:'PC2' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const T = data.topics, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const xs = T.map(t => t.x), ys = T.map(t => t.y);
  const padX = (Math.max(...xs) - Math.min(...xs)) * .18 + .1, padY = (Math.max(...ys) - Math.min(...ys)) * .18 + .1;
  const Xt = niceTicks(Math.min(...xs) - padX, Math.max(...xs) + padX, 5);
  const Yt = niceTicks(Math.min(...ys) - padY, Math.max(...ys) + padY, 5);
  const box = { x: 17, y: top + 9, w: W - 26, h: H - top - 9 - footH };
  const X = linear(Xt.lo, Xt.hi, box.x, box.x + box.w);
  const Y = linear(Yt.lo, Yt.hi, box.y + box.h, box.y);

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Xt.ticks) { el('line', { x1: X(t), x2: X(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk); text(svg, X(t), box.y + box.h + 3.4, fmt(+t.toFixed(2)), { size: 2.5, anchor: 'middle', fill: INK.soft }); }
  for (const t of Yt.ticks) { el('line', { x1: box.x, x2: box.x + 1.2, y1: Y(t), y2: Y(t) }, tk); text(svg, box.x - 1.6, Y(t) + .85, fmt(+t.toFixed(2)), { size: 2.5, anchor: 'end', fill: INK.soft }); }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  /* 原点参考线（MDS 投影以原点为中心） */
  if (Xt.lo < 0 && Xt.hi > 0) el('line', { x1: X(0), x2: X(0), y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .3, 'stroke-dasharray': '1.2 1' }, svg);
  if (Yt.lo < 0 && Yt.hi > 0) el('line', { x1: box.x, x2: box.x + box.w, y1: Y(0), y2: Y(0), stroke: INK.hair, 'stroke-width': .3, 'stroke-dasharray': '1.2 1' }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });
  if (data.y?.label) { const t = text(svg, 0, 0, data.y.label, { size: 2.8, anchor: 'middle' }); t.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`); }

  T.forEach((t, i) => {
    const color = cs[i % cs.length];
    const r = 2 + Math.sqrt(t.share || .05) * 11;
    const cx = X(t.x), cy = Y(t.y);
    const c = el('circle', { cx, cy, r, fill: color, 'fill-opacity': .55, stroke: color, 'stroke-width': .5, cursor: 'pointer' }, svg);
    text(svg, cx, cy + 1, String(i + 1), { size: 3, anchor: 'middle', fill: INK.base });
    text(svg, cx + r + 1.2, cy + .9, t.name, { size: 2.4, fill: INK.base, extra: { 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': .55 } });
    const msg = `<b>主题 ${i + 1} · ${t.name}</b><br>占比 ${((t.share || 0) * 100).toFixed(1)}%${t.terms ? '<br>高频词：' + t.terms.join('、') : ''}`;
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
  });

  figureNote(svg, o);
  return svg;
}
