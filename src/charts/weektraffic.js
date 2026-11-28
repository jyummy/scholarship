/* ============ 周流量图（一周 168 小时流量曲线：周末底纹 + 峰值标注 + 均值线） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { niceTicks, linear, smoothPath } from '../core/scale.js?v=20261128g';
import { tip, tipHide } from '../core/tip.js?v=20261128g';

/*
 * data = {
 *   values: [ v0, v1, ..., v167 ],
 *     // 恰 168 个逐小时数值，自周一 00:00 起；不足 168 个时按实际长度画并在图注说明
 *   unit: 'Gbps'
 *     // 数值单位，纵轴与峰值标注用
 *   days: [ '周一', '周二', ... ]
 *     // 可选，默认周一至周日
 * }
 * 用法：网络/道路/客流的周周期分析——工作日与周末形态对比、峰值出现的
 * 星期与时点、夜间基线。结构与领域无关。读法：曲线为逐小时值，虚线为
 * 全周均值；周末两日以底纹区分；最高峰在图内标注星期、时点与数值。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   smooth       = true    曲线是否平滑（保形三次插值）
 *   shadeWeekend = true    是否给周六、周日加底纹
 *   peakLabel    = true    是否标注全周最高峰（星期 + 时点 + 数值）
 *   avgLine      = true    是否画全周均值虚线并标注
 *   tickN        = 5       纵轴目标刻度数
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const days = data.days || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const v = data.values, N = v.length, nDays = Math.ceil(N / 24);

  const nt = niceTicks(0, Math.max(...v), o.tickN ?? 5);
  const box = { x: 14, y: top + 13, w: W - 22, h: H - top - 13 - footH - 6 };
  const fx = linear(0, N, box.x, box.x + box.w);
  const fy = linear(nt.lo, nt.hi, box.y + box.h, box.y);

  /* 周末底纹 + 日界线 + 日标签 */
  for (let d = 0; d < nDays; d++) {
    const x0 = fx(d * 24), x1 = fx(Math.min(N, (d + 1) * 24));
    if (o.shadeWeekend !== false && d >= 5)
      el('rect', { x: x0, y: box.y, width: x1 - x0, height: box.h, fill: cs[1], 'fill-opacity': .08 }, svg);
    if (d > 0) el('line', { x1: x0, x2: x0, y1: box.y, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .25 }, svg);
    text(svg, (x0 + x1) / 2, box.y + box.h + 5.2, days[d] || '', { size: 2.1, anchor: 'middle', fill: d >= 5 ? cs[1] : INK.soft });
  }
  /* 纵轴 */
  for (const t of nt.ticks) {
    el('line', { x1: box.x, x2: box.x + box.w, y1: fy(t), y2: fy(t), stroke: INK.axis, 'stroke-width': .15, 'stroke-opacity': .55 }, svg);
    text(svg, box.x - 1.8, fy(t) + .8, fmt(t), { size: 2, anchor: 'end', fill: INK.soft });
  }
  text(svg, box.x - 1.8, box.y - 2.6, data.unit || '', { size: 2, anchor: 'end', fill: INK.soft });
  el('line', { x1: box.x, x2: box.x, y1: box.y, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .3 }, svg);
  el('line', { x1: box.x, x2: box.x + box.w, y1: box.y + box.h, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .3 }, svg);

  /* 面积 + 曲线 */
  const pts = v.map((val, i) => [fx(i + .5), fy(val)]);
  const line = o.smooth === false ? 'M' + pts.map(p => p.map(x => x.toFixed(2)).join(' ')).join('L') : smoothPath(pts);
  el('path', { d: line + `L${pts[pts.length - 1][0].toFixed(2)} ${box.y + box.h}L${pts[0][0].toFixed(2)} ${box.y + box.h}Z`, fill: cs[0], 'fill-opacity': .13, stroke: 'none' }, svg);
  el('path', { d: line, fill: 'none', stroke: cs[0], 'stroke-width': .55 }, svg);

  /* 均值虚线 */
  const mean = v.reduce((s, x) => s + x, 0) / N;
  if (o.avgLine !== false) {
    el('line', { x1: box.x, x2: box.x + box.w, y1: fy(mean), y2: fy(mean), stroke: INK.soft, 'stroke-width': .3, 'stroke-dasharray': '2 1.4' }, svg);
    text(svg, box.x + box.w, fy(mean) - 1.6, `周均 ${fmt(mean)}${data.unit ? ' ' + data.unit : ''}`, { size: 2, anchor: 'end', fill: INK.soft });
  }

  /* 峰值标注 */
  if (o.peakLabel !== false) {
    let pi = 0; v.forEach((val, i) => { if (val > v[pi]) pi = i; });
    const [px, py] = [fx(pi + .5), fy(v[pi])];
    el('circle', { cx: px, cy: py, r: 1.3, fill: cs[3] || '#c0392b', stroke: '#fff', 'stroke-width': .35 }, svg);
    const label = `峰值 ${days[Math.floor(pi / 24)]} ${String(pi % 24).padStart(2, '0')}:00 · ${fmt(v[pi])}${data.unit ? ' ' + data.unit : ''}`;
    text(svg, Math.min(Math.max(px, box.x + 16), box.x + box.w - 16), py - 3.4, label, { size: 2.2, anchor: 'middle', fill: cs[3] || '#c0392b' });
  }

  /* 悬浮热区（按天分段） */
  for (let d = 0; d < nDays; d++) {
    const seg = v.slice(d * 24, (d + 1) * 24);
    const mx = Math.max(...seg), mn = Math.min(...seg), av = seg.reduce((s, x) => s + x, 0) / seg.length;
    const hz = el('rect', { x: fx(d * 24), y: box.y, width: fx(Math.min(N, (d + 1) * 24)) - fx(d * 24), height: box.h, fill: '#fff', 'fill-opacity': 0, cursor: 'pointer' }, svg);
    const msg = `<b>${days[d]}</b><br>峰值 ${fmt(mx)} · 低谷 ${fmt(mn)} · 日均 ${fmt(av)}${data.unit ? ' ' + data.unit : ''}`;
    hz.addEventListener('pointerenter', ev => tip(msg, ev));
    hz.addEventListener('pointermove', ev => tip(msg, ev));
    hz.addEventListener('pointerleave', tipHide);
  }

  figureNote(svg, o);
  return svg;
}
