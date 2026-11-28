/* ============ 螺旋图（周期时序绕环：阿基米德基线螺旋 + 径向值偏移，周期规律一眼成环） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128d';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128d';
import { smoothPath } from '../core/scale.js?v=20261128d';
import { tip, tipHide } from '../core/tip.js?v=20261128d';

/*
 * data = {
 *   rings: [ { name:'初唐', values:[38,30,14,...] }, ... ],
 *     // 每圈一个时段（年份 / 批次 / 组别）；values 为等间隔时序值，
 *     // 每圈长度须一致且 = period
 *   period: 12,                       // 每圈的时序点数（如一年 12 个月、一日 24 小时）
 *   ticks: ['正月','二月',...],        // 每圈内各位置的名称，长度 = period，用于外圈标注与悬浮提示
 *   y: { label:'出现次数 / 次' }       // 径向量纲（径向外扩 ∝ 该值）
 * }
 * 文科用法：季节性语料现象（某字/某题材在诗集中的月份分布）、戏剧场次密度、
 * 档案文书的年内周期等；结构与领域无关，气象、疫情等周期时序同样适用。
 * 图型近年因可视化用户研究重新受关注（spiral line charts, arXiv:2510.11912, 2025-10）。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   startAngle  = -90    起始角（度），默认自正上方顺时针展开
 *   innerFrac   = 0.18   内圈起始半径占最大半径的比例（中心留白）
 *   valueFrac   = 0.8    最大值径向外扩占圈距的比例（<1 保证相邻圈不相撞）
 *   pointR      = 0.8    数据点半径（mm）
 *   showBaseline = true  是否绘制零值基线螺旋（浅色）
 *   showPoints  = true   是否绘制数据点（带悬浮提示）
 *   labelTicks  = true   是否在外圈标注 ticks 名称
 *   colorByRing = true   每圈一种颜色；false 时全图单色（取配色首色）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const period = data.period ?? data.rings[0].values.length;
  const startA = (o.startAngle ?? -90) * Math.PI / 180;
  const innerFrac = o.innerFrac ?? .18, valueFrac = o.valueFrac ?? .8;
  const pointR = o.pointR ?? .8;
  const colorByRing = o.colorByRing !== false;
  const yLabel = data.y?.label || '值';

  const rings = data.rings, N = rings.length;
  const all = rings.flatMap(r => r.values);
  const vmax = Math.max(...all, 0) || 1;
  let peak = { v: -1, ring: '', tick: '' };
  rings.forEach(r => r.values.forEach((v, j) => { if (v > peak.v) peak = { v, ring: r.name, tick: data.ticks?.[j] ?? `第 ${j + 1} 点` }; }));

  const cx = W / 2, cy = top + (H - top - footH) / 2 + 4;
  const Rmax = Math.min(W, H - top - footH) / 2 - 13;
  const rIn = Rmax * innerFrac, pitch = (Rmax - rIn) / N;
  const M = N * period;
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  /* 全局第 i 点：角度连续递进，基线半径随圈数阿基米德式外扩 */
  const ptAt = (i, v) => {
    const a = startA + i * (Math.PI * 2 / period);
    const rb = rIn + pitch * (i / period);
    return P(rb + (v / vmax) * pitch * valueFrac, a);
  };

  /* 零值基线螺旋（浅色垫底） */
  if (o.showBaseline !== false) {
    const base = [];
    for (let i = 0; i <= M; i++) base.push(ptAt(i, 0));
    el('path', { d: 'M' + base.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L'), fill: 'none', stroke: INK.axis, 'stroke-width': .3 }, svg);
  }

  /* 各圈数值螺旋 + 数据点 */
  rings.forEach((r, k) => {
    const col = colorByRing ? cs[k % cs.length] : cs[0];
    const pts = r.values.map((v, j) => ptAt(k * period + j, v));
    el('path', { d: smoothPath(pts), fill: 'none', stroke: col, 'stroke-width': .7 }, svg);
    if (o.showPoints !== false) r.values.forEach((v, j) => {
      const [x, y] = pts[j];
      const c = el('circle', { cx: x, cy: y, r: pointR, fill: col, stroke: '#fff', 'stroke-width': .25, cursor: 'pointer' }, svg);
      const msg = `<b>${r.name} · ${data.ticks?.[j] ?? `第 ${j + 1} 点`}</b><br>${yLabel}：${fmt(v)}`;
      c.addEventListener('pointerenter', ev => tip(msg, ev));
      c.addEventListener('pointermove', ev => tip(msg, ev));
      c.addEventListener('pointerleave', tipHide);
    });
  });

  /* 外圈周期刻度名（按象限选锚点，不旋转） */
  if (o.labelTicks !== false && data.ticks) {
    const lr = Rmax + pitch * valueFrac + 3.2;
    data.ticks.forEach((t, j) => {
      const a = startA + j * (Math.PI * 2 / period);
      const [x, y] = P(lr, a);
      const c = Math.cos(a);
      text(svg, x, y + .9, t, { size: 2.3, anchor: c > .35 ? 'start' : c < -.35 ? 'end' : 'middle', fill: INK.soft });
    });
  }

  /* 圆心参数标注：量纲与峰值 */
  text(svg, cx, cy - 1.4, `径向 ∝ ${yLabel}`, { size: 2.3, anchor: 'middle', fill: INK.soft });
  text(svg, cx, cy + 2.6, `峰值 ${peak.tick} · ${fmt(peak.v)}`, { size: 2.5, anchor: 'middle' });

  if (o.legend !== false)
    legend(svg, rings.map((r, k) => ({ type: 'line', color: colorByRing ? cs[k % cs.length] : cs[0], label: r.name })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
