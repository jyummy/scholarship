/* ============ 哑铃图（两时点/两组对比：两点一线，差异方向与幅度一目了然） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128f';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128f';
import { niceTicks, linear } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   categories: ['逍遥游','齐物论',...],
 *   series: [ { name:'2015', values:[..] }, { name:'2024', values:[..] } ],  // 恰好两个系列
 *   x: { label:'篇均被引 / 次' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const S = data.series.slice(0, 2), C = data.categories, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const all = S.flatMap(s => s.values);
  const X = niceTicks(Math.min(...all, 0), Math.max(...all) * 1.1 + .001, 5);
  const box = { x: 24, y: top + 11, w: W - 32, h: H - top - 11 - footH };
  const val = linear(X.lo, X.hi, box.x, box.x + box.w);
  const rowStep = box.h / C.length;

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of X.ticks) {
    el('line', { x1: val(t), x2: val(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, val(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
    if (t !== X.lo) el('line', { x1: val(t), x2: val(t), y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .2 }, svg);
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  C.forEach((c, i) => {
    const cy = box.y + (i + .5) * rowStep;
    text(svg, box.x - 1.8, cy + .9, c, { size: 2.6, anchor: 'end' });
    const v0 = S[0].values[i], v1 = S[1].values[i];
    const up = v1 >= v0;
    el('line', { x1: val(v0), x2: val(v1), y1: cy, y2: cy, stroke: INK.axis, 'stroke-width': .8 }, svg);
    const p0 = el('circle', { cx: val(v0), cy, r: 1.25, fill: cs[0], cursor: 'pointer' }, svg);
    const p1 = el('circle', { cx: val(v1), cy, r: 1.25, fill: cs[3], cursor: 'pointer' }, svg);
    /* 差值标注在哑铃外侧 */
    const dv = v1 - v0;
    text(svg, val(Math.max(v0, v1)) + 2, cy + .85, `${dv >= 0 ? '+' : ''}${fmt(+dv.toFixed(1))}`, { size: 2.2, fill: up ? cs[1] : cs[3] });
    const msg = `<b>${c}</b><br>${S[0].name}：${fmt(v0)}<br>${S[1].name}：${fmt(v1)}<br>变化 ${dv >= 0 ? '+' : ''}${fmt(+dv.toFixed(1))}`;
    [p0, p1].forEach(p => {
      p.addEventListener('pointerenter', ev => tip(msg, ev));
      p.addEventListener('pointermove', ev => tip(msg, ev));
      p.addEventListener('pointerleave', tipHide);
    });
  });

  if (o.legend !== false)
    legend(svg, S.map((s, i) => ({ type: 'rect', color: i === 0 ? cs[0] : cs[3], label: s.name })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
