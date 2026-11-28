/* ============ 嵌入投影散点图（UMAP / t-SNE 降维投影：聚类结构与密度） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128f';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128f';
import { niceTicks, linear } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   points: [ { x:1.2, y:-0.4, group:0, label:'可选标签' } ],
 *   groups: ['主题 A','主题 B'],
 *   x: { label:'UMAP 1' }, y: { label:'UMAP 2' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const P = data.points, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const xs = P.map(p => p.x), ys = P.map(p => p.y);
  const Xt = niceTicks(Math.min(...xs), Math.max(...xs), 5);
  const Yt = niceTicks(Math.min(...ys), Math.max(...ys), 5);
  const box = { x: 17, y: top + 11, w: W - 26, h: H - top - 11 - footH };
  const X = linear(Xt.lo, Xt.hi, box.x, box.x + box.w);
  const Y = linear(Yt.lo, Yt.hi, box.y + box.h, box.y);

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Xt.ticks) { el('line', { x1: X(t), x2: X(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk); text(svg, X(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft }); }
  for (const t of Yt.ticks) { el('line', { x1: box.x, x2: box.x + 1.2, y1: Y(t), y2: Y(t) }, tk); text(svg, box.x - 1.6, Y(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft }); }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });
  if (data.y?.label) { const t = text(svg, 0, 0, data.y.label, { size: 2.8, anchor: 'middle' }); t.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`); }

  P.forEach(p => {
    const color = cs[(p.group || 0) % cs.length];
    const c = el('circle', { cx: X(p.x).toFixed(2), cy: Y(p.y).toFixed(2), r: .75, fill: color, 'fill-opacity': .72, cursor: p.label ? 'pointer' : 'default' }, svg);
    if (p.label) {
      text(svg, X(p.x) + 1.3, Y(p.y) + .8, p.label, { size: 2.2, fill: INK.base, extra: { 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': .5 } });
      const gname = data.groups?.[p.group] || `组 ${p.group + 1}`;
      const msg = `<b>${p.label}</b><br>${gname}<br>(${fmt(p.x)}, ${fmt(p.y)})`;
      c.addEventListener('pointerenter', ev => tip(msg, ev));
      c.addEventListener('pointermove', ev => tip(msg, ev));
      c.addEventListener('pointerleave', tipHide);
    }
  });

  if (data.groups && o.legend !== false)
    legend(svg, data.groups.map((g, i) => ({ type: 'rect', color: cs[i % cs.length], label: g })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
