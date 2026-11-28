/* ============ 递归图（序列自相似：两两时刻状态接近则点阵，纹理即结构） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128d';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128d';
import { tip, tipHide } from '../core/tip.js?v=20261128d';

/*
 * data = {
 *   values: [ 3.1, 4.0, 2.2, ... ],
 *     // 一维序列（如逐回某字密度、逐年发文量）；长度 N 建议 ≤ 80，格子才看得清
 *   label: '回',
 *     // 序号单位，坐标轴与悬浮提示用（如 '回'、'年'）；可缺省
 *   unit: '次/千字'
 *     // values 的单位，悬浮提示用；可缺省
 * }
 * 原理（Eckmann 等 1987）：R(i,j) = 1 当且仅当 |x_i − x_j| ≤ ε。主对角线恒全点
 * （时刻与自身距离为 0）；平行于主对角线的线段 = 一段模式在另一处重现；
 * 大块空白 = 该段状态再未出现。递归率 RR = 点数 / N²，图内右上标注。
 * 文科用法：章回小说母题/字频序列的复现结构、诗歌韵脚序列、史事记载的
 * 周期回响等；结构与领域无关。注意 ε 的选择直接决定纹理疏密，图注须交代。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   epsilon   = null   递归阈值 ε（与 values 同单位）；null 时自动取序列标准差 × 0.5
 *   tickEvery = 10     坐标轴每隔多少个序号标一个刻度
 *   showRR    = true   是否在图内标注递归率 RR
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const tickEvery = o.tickEvery ?? 10;

  const v = data.values, N = v.length;
  const mean = v.reduce((s, x) => s + x, 0) / N;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / N);
  const eps = o.epsilon ?? sd * 0.5;

  const side = Math.min(W - 26, H - top - 16 - footH);
  const box = { x: (W - side) / 2 + 4, y: top + 13, w: side, h: side };
  const cell = side / N;
  const col = cs[0];

  el('rect', { x: box.x, y: box.y, width: side, height: side, fill: '#fbfaf6', stroke: INK.base, 'stroke-width': .4 }, svg);
  let pts = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (Math.abs(v[i] - v[j]) > eps) continue;
    pts++;
    const c = el('rect', { x: box.x + j * cell, y: box.y + (N - 1 - i) * cell, width: Math.max(.3, cell - .06), height: Math.max(.3, cell - .06), fill: col, 'fill-opacity': i === j ? .95 : .78, cursor: 'pointer' }, svg);
    const msg = `<b>第 ${i + 1}${data.label || ''} × 第 ${j + 1}${data.label || ''}</b><br>${fmt(v[i])} vs ${fmt(v[j])}${data.unit ? ' ' + data.unit : ''}（差 ${fmt(Math.abs(v[i] - v[j]))} ≤ ε ${fmt(eps)}）`;
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
  }
  /* 坐标刻度 */
  for (let k = 0; k < N; k += tickEvery) {
    text(svg, box.x + (k + .5) * cell, box.y + side + 4.6, String(k + 1), { size: 1.9, anchor: 'middle', fill: INK.soft });
    text(svg, box.x - 1.8, box.y + (N - 1 - k + .5) * cell + .7, String(k + 1), { size: 1.9, anchor: 'end', fill: INK.soft });
  }
  if (o.showRR !== false)
    text(svg, box.x + side, box.y - 2.4, `ε = ${fmt(eps)}${data.unit ? ' ' + data.unit : ''} · RR = ${fmt(pts / (N * N) * 100)}%`, { size: 2.1, anchor: 'end', fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
