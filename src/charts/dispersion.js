/* ============ 词汇离散图（Lexical dispersion plot：词在文本全程的出现位置） ============ */
/* 语料库语言学经典图型：每行一词，竖线 = 一次出现，横轴 = 文本进程 */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { niceTicks, linear } from '../core/scale.js?v=20261128g';
import { tip, tipHide } from '../core/tip.js?v=20261128g';

/*
 * data = {
 *   length: 10000,                                   // 文本总词数
 *   words: [ { name:'自由', positions:[120, 980, ...] } ],
 *   x: { label:'文本进程（词次）' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const WD = data.words, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;

  const X = niceTicks(0, data.length, 5);
  const box = { x: 24, y: top + 8, w: W - 32, h: H - top - 8 - footH };
  const val = linear(0, data.length, box.x, box.x + box.w);
  const rowStep = box.h / WD.length;

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of X.ticks) {
    el('line', { x1: val(t), x2: val(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, val(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  WD.forEach((w, i) => {
    const color = w.color || cs[i % cs.length];
    const cy = box.y + (i + .5) * rowStep;
    text(svg, box.x - 1.8, cy + .9, w.name, { size: 2.6, anchor: 'end' });
    el('line', { x1: box.x, x2: box.x + box.w, y1: cy, y2: cy, stroke: INK.hair, 'stroke-width': .3 }, svg);
    const g = el('g', { stroke: color, 'stroke-width': .55 }, svg);
    w.positions.forEach(p => el('line', { x1: val(p), x2: val(p), y1: cy - rowStep * .32, y2: cy + rowStep * .32 }, g));
    text(svg, box.x + box.w + 1.6, cy + .9, `${w.positions.length} 次`, { size: 2.3, fill: INK.soft });
    const hit = el('rect', { x: box.x, y: box.y + i * rowStep, width: box.w, height: rowStep, fill: 'transparent' }, svg);
    /* 离散度：四分位距 / 文本长度，越接近均匀分布越大 */
    const ps = [...w.positions].sort((a, b) => a - b);
    const span = ps.length > 1 ? (ps[ps.length - 1] - ps[0]) / data.length : 0;
    const msg = `<b>${w.name}</b><br>出现 ${ps.length} 次<br>覆盖文本 ${(span * 100).toFixed(0)}% 区间`;
    hit.addEventListener('pointerenter', ev => tip(msg, ev));
    hit.addEventListener('pointermove', ev => tip(msg, ev));
    hit.addEventListener('pointerleave', tipHide);
  });

  figureNote(svg, o);
  return svg;
}
