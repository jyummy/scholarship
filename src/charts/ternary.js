/* ============ 三元图（三分量构成：点在三角形内的位置即三者比例） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   corners: [ '诗', '词', '文' ],
 *     // 三个分量名，依次对应上顶点、左下、右下
 *   points: [ { name:'苏轼', v:[62, 18, 20], group:'宋' }, ... ]
 *     // v 为三分量数值，内部自动归一化为百分比（不必预先凑满 100）
 * }
 * 文科用法：作者三体占比、语料三类成分、经费/藏书三分构成等；
 * 结构与领域无关。读法：点越靠近某顶点，该分量占比越高；沿平行于对边的
 * 网格线读该分量的百分比。只适用于恰有三个分量且关心构成的场合。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   gridStep = 20      网格线间隔（百分点），并在三边标注刻度
 *   dotR     = 1.15    点半径（mm）
 *   labelPts = true    是否标注点名（自动简单避让：按 y 排序错开）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const gridStep = o.gridStep ?? 20, dotR = o.dotR ?? 1.15;

  const side = Math.min(W - 34, H - top - 14 - footH);
  const cx = W / 2, ty = top + 15, hh = side * Math.sqrt(3) / 2;
  const A = [cx, ty], B = [cx - side / 2, ty + hh], C = [cx + side / 2, ty + hh];
  const P = (a, b, c) => [ (A[0] * a + B[0] * b + C[0] * c) / 100, (A[1] * a + B[1] * b + C[1] * c) / 100 ];

  el('polygon', { points: [A, B, C].map(p => p.map(v => v.toFixed(2)).join(',')).join(' '), fill: 'none', stroke: INK.base, 'stroke-width': .45 }, svg);
  /* 网格：三分量等值线 */
  for (let v = gridStep; v < 100; v += gridStep) {
    el('line', { x1: P(v, 100 - v, 0)[0], y1: P(v, 100 - v, 0)[1], x2: P(v, 0, 100 - v)[0], y2: P(v, 0, 100 - v)[1], stroke: INK.axis, 'stroke-width': .15, 'stroke-opacity': .6 }, svg);
    el('line', { x1: P(100 - v, v, 0)[0], y1: P(100 - v, v, 0)[1], x2: P(0, v, 100 - v)[0], y2: P(0, v, 100 - v)[1], stroke: INK.axis, 'stroke-width': .15, 'stroke-opacity': .6 }, svg);
    el('line', { x1: P(100 - v, 0, v)[0], y1: P(100 - v, 0, v)[1], x2: P(0, 100 - v, v)[0], y2: P(0, 100 - v, v)[1], stroke: INK.axis, 'stroke-width': .15, 'stroke-opacity': .6 }, svg);
    text(svg, P(v, 100 - v, 0)[0] - 1.6, P(v, 100 - v, 0)[1] + .7, String(v), { size: 1.8, anchor: 'end', fill: INK.soft });
  }
  /* 顶点标签 */
  text(svg, A[0], A[1] - 2.4, data.corners[0], { size: 2.8, anchor: 'middle' });
  text(svg, B[0] - 1, B[1] + 5, data.corners[1], { size: 2.8, anchor: 'middle' });
  text(svg, C[0] + 1, C[1] + 5, data.corners[2], { size: 2.8, anchor: 'middle' });

  const groups = [...new Set(data.points.map(p => p.group || '全部'))];
  const gCol = g => cs[groups.indexOf(g) % cs.length];
  const placed = [];
  for (const p of data.points) {
    const sum = p.v[0] + p.v[1] + p.v[2], nv = p.v.map(v => v / sum * 100);
    const [x, y] = P(nv[0], nv[1], nv[2]);
    const c = el('circle', { cx: x, cy: y, r: dotR, fill: gCol(p.group || '全部'), 'fill-opacity': .85, stroke: '#fff', 'stroke-width': .3, cursor: 'pointer' }, svg);
    const msg = `<b>${p.name}</b>（${p.group || '全部'}）<br>` + data.corners.map((cn, k) => `${cn}：${fmt(nv[k])}%`).join('<br>');
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
    placed.push({ p, x, y });
  }
  if (o.labelPts !== false) {
    placed.sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    for (const e of placed) { e.ly = Math.max(e.y - 2.2, prev + 3.1); prev = e.ly; }
    for (const e of placed) text(svg, e.x, e.ly, e.p.name, { size: 2, anchor: 'middle', fill: gCol(e.p.group || '全部') });
  }

  if (o.legend !== false)
    legend(svg, groups.map(g => ({ type: 'rect', color: gCol(g), label: `${g}（${data.points.filter(p => (p.group || '全部') === g).length}）` })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
