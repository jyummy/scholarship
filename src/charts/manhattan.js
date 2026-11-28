/* ============ 曼哈顿图（沿序列分段的显著性扫描：分段交替着色 + 天际线峰群） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128c';
import { niceTicks, linear } from '../core/scale.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   groups: [                       // 沿 x 轴依次排列的分段（染色体 / 章节段 / 年代段）
 *     { name:'第 1–20 回',
 *       points: [ { name:'黛玉', p:3.1e-7 }, { name:'宝钗', y:2.4 }, ... ] },
 *     ...
 *   ]
 *     // 每点二选一给显著性：p = p 值（模块换算 −log₁₀ p），或 y = 已算好的 −log₁₀ p（优先）
 *     // name 为条目名（关键词 / SNP / 特征），用于悬浮提示与峰标注
 * }
 * 文科用法：沿文本章节或年代分段逐段扫描关键词/特征的显著性（如《红楼梦》各回目段的人物词峰值）；
 * 结构与领域无关，生信 GWAS（染色体 × −log₁₀ p）同样适用。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   pCut     = 1e-5   显著线阈值 p：图内画虚线并标注 −log₁₀(pCut) 数值
 *   suggP    = null   提示线阈值 p（如 1e-3）：给出则多画一条较淡的虚线并标注
 *   labelTop = 3      全图自动标注的最高峰个数（按 −log₁₀ p 排序）
 *   pointR   = 0.7    散点半径（mm）
 *   gap      = 1.6    相邻分段之间的间隙（mm）
 *   colorA / colorB   可选，覆盖分段交替的两种颜色
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 34 : 22;   // 分段名 + 轴标题占位更高
  const pCut = o.pCut ?? 1e-5, suggP = o.suggP ?? null, labelTop = o.labelTop ?? 3, pointR = o.pointR ?? .7;
  const gap = o.gap ?? 1.6;
  const colA = o.colorA || cs[0], colB = o.colorB || cs[4];
  const sigY = -Math.log10(pCut);

  const G = data.groups;
  const all = [];
  G.forEach((g, gi) => g.points.forEach(p => all.push({ ...p, y: p.y ?? -Math.log10(Math.max(p.p, 1e-12)), gi })));
  const Yt = niceTicks(0, Math.max(sigY * 1.15, ...all.map(p => p.y)) * 1.05, 5);
  const box = { x: 17, y: top + 11, w: W - 26, h: H - top - 11 - footH };
  const Y = linear(Yt.lo, Yt.hi, box.y + box.h, box.y);

  /* x 布局：各段宽度 ∝ 点数，段间留 gap */
  const totalPts = all.length;
  const avail = box.w - gap * (G.length - 1);
  let cx = box.x;
  const seg = G.map((g, gi) => {
    const w = avail * g.points.length / totalPts;
    const s = { x0: cx, w, cx: cx + w / 2, gi };
    cx += w + gap;
    return s;
  });

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Yt.ticks) { el('line', { x1: box.x, x2: box.x + 1.2, y1: Y(t), y2: Y(t) }, tk); text(svg, box.x - 1.6, Y(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft }); }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  const yl = text(svg, 0, 0, '−log₁₀(p)', { size: 2.8, anchor: 'middle' });
  yl.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`);

  /* 分段：分隔发丝线 + 段名 + 散点 */
  G.forEach((g, gi) => {
    const s = seg[gi];
    if (gi > 0) el('line', { x1: s.x0 - gap / 2, x2: s.x0 - gap / 2, y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .25 }, svg);
    text(svg, s.cx, box.y + box.h + 3.6, g.name, { size: 2.3, anchor: 'middle', fill: INK.soft });
    const col = gi % 2 === 0 ? colA : colB;
    g.points.forEach((p, i) => {
      const y = p.y ?? -Math.log10(Math.max(p.p, 1e-12));
      const px = g.points.length === 1 ? s.cx : s.x0 + s.w * i / (g.points.length - 1);
      const dot = el('circle', { cx: px.toFixed(2), cy: Y(y).toFixed(2), r: pointR, fill: col, 'fill-opacity': y >= sigY ? .95 : .6, cursor: 'pointer' }, svg);
      const msg = `<b>${p.name}</b><br>${g.name}<br>−log₁₀ p = ${fmt(+y.toFixed(2))}${p.p ? `<br>p = ${p.p.toExponential(1)}` : ''}`;
      dot.addEventListener('pointerenter', ev => tip(msg, ev));
      dot.addEventListener('pointermove', ev => tip(msg, ev));
      dot.addEventListener('pointerleave', tipHide);
      p._sx = px; p._sy = y;
    });
  });
  text(svg, box.x + box.w / 2, box.y + box.h + 8, data.x?.label || '分段（章节 / 染色体）', { size: 2.8, anchor: 'middle' });

  /* 显著线 / 提示线 + 数值标注 */
  const dg = el('g', { 'stroke-width': .3, 'stroke-dasharray': '1.6 1.2' }, svg);
  el('line', { x1: box.x, x2: box.x + box.w, y1: Y(sigY), y2: Y(sigY), stroke: cs[3] }, dg);
  text(svg, box.x + box.w - 1, Y(sigY) - 1.3, `显著线 −log₁₀(p) = ${fmt(+sigY.toFixed(1))}`, { size: 2.2, anchor: 'end', fill: cs[3] });
  if (suggP) {
    const sy = -Math.log10(suggP);
    el('line', { x1: box.x, x2: box.x + box.w, y1: Y(sy), y2: Y(sy), stroke: INK.soft }, dg);
    text(svg, box.x + box.w - 1, Y(sy) - 1.3, `提示线 −log₁₀(p) = ${fmt(+sy.toFixed(1))}`, { size: 2.2, anchor: 'end', fill: INK.soft });
  }

  /* 最高峰标注（坐标取绘点时记在原对象上的 _sx） */
  const yOf = p => p.y ?? -Math.log10(Math.max(p.p, 1e-12));
  G.flatMap(g => g.points).sort((a, b) => yOf(b) - yOf(a)).slice(0, labelTop).forEach(p => {
    text(svg, p._sx, Y(yOf(p)) - 1.6, p.name, {
      size: 2.3, anchor: 'middle', fill: INK.base,
      extra: { 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': .5 }
    });
  });

  if (o.legend !== false)
    legend(svg, [
      { type: 'rect', color: colA, label: '奇数段' },
      { type: 'rect', color: colB, label: '偶数段' },
      { type: 'line', color: cs[3], label: `显著线（p = ${pCut}）`, dash: '1.6 1.2' }
    ], { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
