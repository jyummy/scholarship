/* ============ 校准图（预测概率 vs 实际频率：点大小 = 样本量，附 ECE） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128b';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128b';
import { linear } from '../core/scale.js?v=20261128b';
import { tip, tipHide } from '../core/tip.js?v=20261128b';

/*
 * data = {
 *   bins: [ { pred:0.08, obs:0.06, n:420 }, ... ],   // 按预测概率分箱
 *   x: { label:'预测概率' }, y: { label:'实际频率' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const B = [...data.bins].sort((a, b) => a.pred - b.pred), cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const side = Math.min(W - 45, H - top - footH - 12);
  const box = { x: 20, y: top + 9, w: side + 18, h: side };
  const X = linear(0, 1, box.x, box.x + box.w);
  const Y = linear(0, 1, box.y + box.h, box.y);

  /* 完美校准对角线 + 轴 */
  el('line', { x1: X(0), x2: X(1), y1: Y(0), y2: Y(1), stroke: INK.soft, 'stroke-width': .35, 'stroke-dasharray': '1.6 1.2' }, svg);
  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of [0, .25, .5, .75, 1]) {
    el('line', { x1: X(t), x2: X(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, X(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
    el('line', { x1: box.x, x2: box.x + 1.2, y1: Y(t), y2: Y(t) }, tk);
    text(svg, box.x - 1.6, Y(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft });
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  text(svg, X(1) - 1, Y(1) - 1.6, '完美校准', { size: 2.3, anchor: 'end', fill: INK.soft });
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });
  if (data.y?.label) { const t = text(svg, 0, 0, data.y.label, { size: 2.8, anchor: 'middle' }); t.setAttribute('transform', `translate(${box.x - 9} ${box.y + box.h / 2}) rotate(-90)`); }

  /* 连线 + 点（r ∝ √n） */
  const d = B.map((b, i) => `${i === 0 ? 'M' : 'L'}${X(b.pred)} ${Y(b.obs)}`).join('');
  el('path', { d, fill: 'none', stroke: cs[0], 'stroke-width': .55 }, svg);
  const nmax = Math.max(...B.map(b => b.n || 1));
  B.forEach(b => {
    const r = .8 + Math.sqrt((b.n || 1) / nmax) * 1.5;
    const c = el('circle', { cx: X(b.pred), cy: Y(b.obs), r, fill: cs[0], 'fill-opacity': .8, stroke: '#fff', 'stroke-width': .4, cursor: 'pointer' }, svg);
    const msg = `<b>预测 ${fmt(b.pred)}</b><br>实际 ${fmt(b.obs)}<br>n = ${fmt(b.n || 0)}`;
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
  });

  /* ECE（期望校准误差） */
  const tot = B.reduce((a, b) => a + (b.n || 0), 0) || 1;
  const ece = B.reduce((a, b) => a + (b.n || 0) / tot * Math.abs(b.obs - b.pred), 0);
  text(svg, box.x + box.w + 4, box.y + 6, `ECE = ${ece.toFixed(3)}`, { size: 2.7, fill: INK.base });
  text(svg, box.x + box.w + 4, box.y + 10.5, '点大小 ∝ 样本量', { size: 2.3, fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
