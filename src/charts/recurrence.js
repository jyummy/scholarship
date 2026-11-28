/* ============ 递归图（复现点阵：两期共享同一模式则落点，纹理即结构） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128e';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128e';
import { tip, tipHide } from '../core/tip.js?v=20261128e';

/*
 * data 二选一：
 *   A) 共享计数矩阵（母题复现型）：
 *      matrix: [ [m11, m12, ...], ... ]   // 方阵，m(i,j) = 第 i、j 期共享的模式数（如共同母题数）
 *      label: '回'                        // 期次单位
 *      // m(i,j) ≥ minShare 落点，点深浅 ∝ 共享数；对角线 = 自身全共享，恒最深
 *   B) 一维序列（经典递归图，Eckmann 等 1987）：
 *      values: [ 3.1, 4.0, ... ], label: '回', unit: '次/千字'
 *      // R(i,j) = 1 当且仅当 |x_i − x_j| ≤ ε
 * 文科用法：章回小说母题复现、韵脚回环、史事记载的周期回响（A 型）；
 * 字频/发文量序列的自相似（B 型）。点阵率 = 落点数 / N²，图内右上标注。
 * 注意：A 型的「共享」口径、B 型的 ε 选择都直接决定纹理，图注须交代。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   minShare  = 1      A 型：共享数 ≥ 该值才落点
 *   epsilon   = null   B 型：递归阈值 ε；null 时自动取序列标准差 × 0.5
 *   tickEvery = 5      坐标轴每隔多少期标一个刻度
 *   showRR    = true   是否标注点阵率
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const tickEvery = o.tickEvery ?? 5;
  const col = cs[0];

  let N, hit, detail, head;
  if (data.matrix) {
    const M = data.matrix; N = M.length;
    const minShare = o.minShare ?? 1;
    const maxM = Math.max(...M.flat());
    hit = (i, j) => M[i][j] >= minShare;
    detail = (i, j) => ({ op: .3 + .7 * (M[i][j] / maxM), msg: `<b>第 ${i + 1}${data.label || ''} × 第 ${j + 1}${data.label || ''}</b><br>共享母题 ${M[i][j]} 个` });
    head = `共享 ≥ ${minShare} 落点`;
  } else {
    const v = data.values; N = v.length;
    const mean = v.reduce((s, x) => s + x, 0) / N;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / N);
    const eps = o.epsilon ?? sd * 0.5;
    hit = (i, j) => Math.abs(v[i] - v[j]) <= eps;
    detail = (i, j) => ({ op: i === j ? .95 : .78, msg: `<b>第 ${i + 1}${data.label || ''} × 第 ${j + 1}${data.label || ''}</b><br>${fmt(v[i])} vs ${fmt(v[j])}${data.unit ? ' ' + data.unit : ''}（差 ${fmt(Math.abs(v[i] - v[j]))} ≤ ε ${fmt(eps)}）` });
    head = `ε = ${fmt(eps)}${data.unit ? ' ' + data.unit : ''}`;
  }

  const side = Math.min(W - 26, H - top - 16 - footH);
  const box = { x: (W - side) / 2 + 4, y: top + 13, w: side, h: side };
  const cell = side / N;
  el('rect', { x: box.x, y: box.y, width: side, height: side, fill: '#fbfaf6', stroke: INK.base, 'stroke-width': .4 }, svg);
  let pts = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (!hit(i, j)) continue;
    pts++;
    const d = detail(i, j);
    const c = el('rect', { x: box.x + j * cell + .03, y: box.y + (N - 1 - i) * cell + .03, width: Math.max(.3, cell - .06), height: Math.max(.3, cell - .06), fill: col, 'fill-opacity': d.op, cursor: 'pointer' }, svg);
    c.addEventListener('pointerenter', ev => tip(d.msg, ev));
    c.addEventListener('pointermove', ev => tip(d.msg, ev));
    c.addEventListener('pointerleave', tipHide);
  }
  for (let k = 0; k < N; k += tickEvery) {
    text(svg, box.x + (k + .5) * cell, box.y + side + 4.6, String(k + 1), { size: 1.9, anchor: 'middle', fill: INK.soft });
    text(svg, box.x - 1.8, box.y + (N - 1 - k + .5) * cell + .7, String(k + 1), { size: 1.9, anchor: 'end', fill: INK.soft });
  }
  if (o.showRR !== false)
    text(svg, box.x + side, box.y - 2.4, `${head} · 点阵率 ${fmt(pts / (N * N) * 100)}%`, { size: 2.1, anchor: 'end', fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
