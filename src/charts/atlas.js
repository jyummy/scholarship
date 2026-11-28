/* ============ 嵌入图谱图（UMAP 图谱风：万级小点密排成柔边色团，簇名标在团心） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { linear } from '../core/scale.js?v=20261128g';

/*
 * data = {
 *   points: [ [x, y, g], ... ],
 *     // 已降维的二维坐标（UMAP / t-SNE 结果）；g = 簇序号（整数，自 0 起）
 *   clusters: [ '山水', '边塞', ... ],
 *     // 簇名，序号与 points 的 g 对应；簇名标在该簇点的重心处
 *   xName: 'UMAP1', yName: 'UMAP2'
 *     // 左下角 L 形轴的标注，可选，默认 UMAP1 / UMAP2
 * }
 * 与「嵌入投影图」的区别：那个是几百点的学术散点（带轴带刻度）；
 * 本图是图谱风——上万小点以半透明密排、叠出柔边色团，不画坐标刻度，
 * 只留左下 L 形方向轴；簇的身份靠团心标签与图例计数。点数超出
 * maxPoints 时等距抽稀（保持分布形状），实际绘制点数在图内右下标注。
 * 文科用法：大语料文本向量图谱、词义聚类、作者风格空间等。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   maxPoints = 6000    最多绘制点数，超出等距抽稀
 *   dotR      = 0.5     点半径（mm）
 *   dotOpacity = 0.5    点不透明度（叠加出密度感）
 *   labelClusters = true  是否在各簇重心标注簇名
 *   cornerAxes = true   是否画左下 L 形方向轴
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const maxPoints = o.maxPoints ?? 6000, dotR = o.dotR ?? 0.5, dotOp = o.dotOpacity ?? 0.5;

  let pts = data.points;
  const nAll = pts.length;
  if (nAll > maxPoints) {
    const stride = Math.ceil(nAll / maxPoints);
    pts = pts.filter((_, i) => i % stride === 0);
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padX = (x1 - x0) * .04, padY = (y1 - y0) * .04;
  const box = { x: 9, y: top + 11, w: W - 16, h: H - top - 11 - footH - 8 };
  const fx = linear(x0 - padX, x1 + padX, box.x, box.x + box.w);
  const fy = linear(y0 - padY, y1 + padY, box.y + box.h, box.y);

  /* 点（按簇分组画，同簇连续，叠色更匀） */
  const byCluster = new Map();
  for (const p of pts) {
    if (!byCluster.has(p[2])) byCluster.set(p[2], []);
    byCluster.get(p[2]).push(p);
  }
  for (const [g, arr] of [...byCluster.entries()].sort((a, b) => a[0] - b[0])) {
    const col = cs[g % cs.length];
    for (const p of arr)
      el('circle', { cx: fx(p[0]).toFixed(2), cy: fy(p[1]).toFixed(2), r: dotR, fill: col, 'fill-opacity': dotOp }, svg);
  }

  /* 簇标签（重心） */
  if (o.labelClusters !== false)
    for (const [g, arr] of byCluster.entries()) {
      const mx = arr.reduce((s, p) => s + p[0], 0) / arr.length;
      const my = arr.reduce((s, p) => s + p[1], 0) / arr.length;
      const t = text(svg, fx(mx), fy(my) + 1, data.clusters[g] || String(g), { size: 2.6, anchor: 'middle' });
      t.setAttribute('paint-order', 'stroke');
      t.setAttribute('stroke', '#fff');
      t.setAttribute('stroke-width', .9);
      t.setAttribute('stroke-opacity', .75);
    }

  /* 左下 L 形方向轴 */
  if (o.cornerAxes !== false) {
    const ax = box.x + 1, ay = box.y + box.h - 1, len = Math.min(16, box.w * .14);
    el('path', { d: `M${ax} ${ay - len}L${ax} ${ay}L${ax + len} ${ay}`, fill: 'none', stroke: INK.base, 'stroke-width': .4 }, svg);
    el('path', { d: `M${ax} ${ay - len}l-1.1 2.4h2.2Z`, fill: INK.base }, svg);
    el('path', { d: `M${ax + len} ${ay}l-2.4 -1.1v2.2Z`, fill: INK.base }, svg);
    text(svg, ax - 1.2, ay - len / 2 + .8, data.yName || 'UMAP2', { size: 2.1, anchor: 'end', fill: INK.soft });
    text(svg, ax + len / 2, ay + 4.6, data.xName || 'UMAP1', { size: 2.1, anchor: 'middle', fill: INK.soft });
  }
  text(svg, box.x + box.w, box.y + box.h + 4.6, `n = ${fmt(nAll)}`, { size: 2.1, anchor: 'end', fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
