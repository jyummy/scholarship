/* ============ 凹凸图（排名变迁：多期名次连线，交叉即易位） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128c';
import { linear, smoothPath } from '../core/scale.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   stages: [ '唐代选本', '宋代选本', '明代选本', '清代选本', '现代选本' ],
 *     // 横轴期次，自左向右为时间顺序
 *   series: [ { name:'李白', ranks:[1, 1, 2, 1, 1] }, ... ]
 *     // ranks 与 stages 等长，1 = 最高名次；缺测用 null（该期断线）
 * }
 * 文科用法：诗人历代接受史排名、经典地位变迁、期刊/机构历年排名等；
 * 结构与领域无关（bump chart）。只编码名次，不编码差距——第 1 与第 2 的
 * 实际差距大小在此图不可见，图注中应注明。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   smooth    = true   连线是否平滑（保形三次插值）；false 为直线段
 *   labelBoth = true   是否在首末两期都标注个体名（自动纵向避让）
 *   dotR      = 1.05   期次节点半径（mm）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const labelBoth = o.labelBoth !== false, dotR = o.dotR ?? 1.05;

  const S = data.stages, R = Math.max(...data.series.flatMap(s => s.ranks.filter(v => v != null)));
  const box = { x: 22, y: top + 13, w: W - 44, h: H - top - 13 - footH - 5 };
  const fx = linear(0, S.length - 1, box.x, box.x + box.w);
  const fy = linear(1, R, box.y, box.y + box.h);

  /* 期次轴 + 名次网格 */
  S.forEach((s, k) => {
    el('line', { x1: fx(k), x2: fx(k), y1: box.y - 2, y2: box.y + box.h + 2, stroke: INK.axis, 'stroke-width': .18, 'stroke-dasharray': '1 1.4' }, svg);
    text(svg, fx(k), box.y + box.h + 6.4, s, { size: 2.2, anchor: 'middle' });
  });
  for (let r = 1; r <= R; r++) {
    el('line', { x1: box.x - 3, x2: box.x + box.w + 3, y1: fy(r), y2: fy(r), stroke: INK.axis, 'stroke-width': .15, 'stroke-opacity': .55 }, svg);
    text(svg, box.x - 4.4, fy(r) + .8, String(r), { size: 2, anchor: 'end', fill: INK.soft });
  }
  text(svg, box.x - 4.4, box.y - 4.6, '名次', { size: 2, anchor: 'end', fill: INK.soft });

  const colOf = i => cs[i % cs.length];
  data.series.forEach((s, i) => {
    /* 按连续段画线（null 处断开） */
    let seg = [];
    const flush = () => {
      if (seg.length > 1) el('path', { d: o.smooth === false ? 'M' + seg.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L') : smoothPath(seg), fill: 'none', stroke: colOf(i), 'stroke-width': .55, 'stroke-opacity': .9 }, svg);
      seg = [];
    };
    s.ranks.forEach((v, k) => { if (v == null) flush(); else seg.push([fx(k), fy(v)]); });
    flush();
    s.ranks.forEach((v, k) => {
      if (v == null) return;
      const c = el('circle', { cx: fx(k), cy: fy(v), r: dotR, fill: colOf(i), stroke: '#fff', 'stroke-width': .3, cursor: 'pointer' }, svg);
      const msg = `<b>${s.name}</b> · ${S[k]}<br>第 ${v} 名`;
      c.addEventListener('pointerenter', ev => tip(msg, ev));
      c.addEventListener('pointermove', ev => tip(msg, ev));
      c.addEventListener('pointerleave', tipHide);
    });
  });

  /* 首末标签（纵向避让） */
  const ends = (k, side) => {
    const items = data.series.map((s, i) => ({ s, i, v: s.ranks[k] })).filter(e => e.v != null)
      .map(e => ({ ...e, y: fy(e.v) })).sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    for (const e of items) { e.ly = Math.max(e.y, prev + 3.2); prev = e.ly; }
    for (const e of items)
      text(svg, side === 'l' ? fx(k) - 2 : fx(k) + 2, e.ly + .8, e.s.name, { size: 2.2, anchor: side === 'l' ? 'end' : 'start', fill: colOf(e.i) });
  };
  ends(0, 'l');
  if (labelBoth) ends(S.length - 1, 'r');

  if (o.legend !== false && !labelBoth)
    legend(svg, data.series.map((s, i) => ({ type: 'line', color: colOf(i), label: s.name })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
