/* ============ 分位点图（Quantile dotplot：离散圆点编码分布，频率框架表达不确定性） ============ */
/* Kay et al.：每个点 = 一个等概率分位结果，数点即读概率 */

import { el, text, INK, colors } from '../core/svg.js?v=20261128f';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128f';
import { niceTicks, linear } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   groups: [ { name:'模型 A', values:[..样本..] } ],
 *   x: { label:'预测值' }, dots: 20   // 每组点数（分位数个数）
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const G = data.groups, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const ND = data.dots || 20;

  const all = G.flatMap(g => g.values);
  const X = niceTicks(Math.min(...all), Math.max(...all) * 1.02 + .001, 6);
  const box = { x: 24, y: top + 8, w: W - 32, h: H - top - 8 - footH };
  const val = linear(X.lo, X.hi, box.x, box.x + box.w);
  const rowStep = box.h / G.length;

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of X.ticks) {
    el('line', { x1: val(t), x2: val(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, val(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  /* 点径由行高与点数密度决定 */
  const r = Math.max(.7, Math.min(1.5, rowStep / 9));

  G.forEach((g, i) => {
    const color = g.color || cs[i % cs.length];
    const vs = [...g.values].sort((a, b) => a - b);
    const n = vs.length;
    const baseY = box.y + (i + 1) * rowStep - 1.5;
    text(svg, box.x - 1.8, baseY - r * 2, g.name, { size: 2.6, anchor: 'end' });

    /* 取 ND 个等概率分位点，按值分箱堆叠 */
    const qs = [];
    for (let k = 0; k < ND; k++) qs.push(vs[Math.min(n - 1, Math.floor((k + .5) / ND * n))]);
    const binW = (X.hi - X.lo) / 40;
    const stacks = new Map();
    qs.forEach(v => {
      const b = Math.round(v / binW);
      const s = stacks.get(b) || 0; stacks.set(b, s + 1);
      const p = el('circle', { cx: val(b * binW), cy: baseY - s * (r * 2 + .25), r, fill: color, 'fill-opacity': .88, cursor: 'pointer' }, svg);
      const msg = `<b>${g.name}</b><br>分位点 ≈ ${fmt(v)}<br>每点代表 1/${ND} 概率`;
      p.addEventListener('pointerenter', ev => tip(msg, ev));
      p.addEventListener('pointermove', ev => tip(msg, ev));
      p.addEventListener('pointerleave', tipHide);
    });
    el('line', { x1: box.x, x2: box.x + box.w, y1: baseY + r + .6, y2: baseY + r + .6, stroke: INK.hair, 'stroke-width': .25 }, svg);
  });

  figureNote(svg, o);
  return svg;
}
