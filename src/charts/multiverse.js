/* ============ 多元宇宙图（稳健性检验：上 = 全部规格估计的密度分布，下 = 分箱决策面板） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128b';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128b';
import { niceTicks, linear, kde, smoothPath } from '../core/scale.js?v=20261128b';
import { tip, tipHide } from '../core/tip.js?v=20261128b';

/*
 * data = {
 *   specs: [ { e:0.42, p:0.013, d:[0,1,2] }, ... ],
 *     // e  该分析规格的效应量（如相关系数 r、回归系数）
 *     // p  该规格的 p 值（用于统计显著占比）
 *     // d  该规格在每个决策维度上选用的水平下标，与 decisions 一一对应
 *   decisions: [
 *     { name:'分词方案', levels:['字切分','词切分','双字组'] },
 *     { name:'停用词表', levels:['不用','通用表','严格表'] },
 *     ...
 *   ],
 *   x: { label:'效应量 r' },   // 可选，x 轴标题
 *   null: 0                     // 可选，零效应参考值（默认 0）
 * }
 * 文科用法：文本分析的稳健性检验——同一效应在不同分词 / 停用词 / 统计口径组合下是否稳定；
 * 图型出自 Krähmer & Young 2026（PLOS One）的 multiverse plot：密度面板 + 分箱决策仪表盘，
 * 可容纳上千个规格（示例 1,728 个）。结构与领域无关，社科多重分析同样适用。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   bins   = 12     决策面板沿效应量轴的分箱数（图内标注）
 *   sigP   = 0.05   显著判定阈值：图内标注显著规格占比（p < sigP）
 *   gridN  = 60     核密度估计的求值网格点数
 *   rowH   = 5.6    决策面板每行高度（mm）
 *   nullV  = data.null ?? 0   零效应竖线位置（优先于 data.null）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const bins = o.bins ?? 12, sigP = o.sigP ?? 0.05, gridN = o.gridN ?? 60, rowH = o.rowH ?? 5.6;
  const nullV = o.nullV ?? data.null ?? 0;
  const S = data.specs, D = data.decisions || [];
  const n = S.length;
  const nSig = S.filter(s => s.p < sigP).length;
  const es = S.map(s => s.e).sort((a, b) => a - b);
  const med = es[Math.floor(n / 2)];
  const footH = (o.note || o.figLabel ? 28 : 16) + D.length * 3.9;   // 底部决策图例逐行占位

  const Xt = niceTicks(Math.min(...es, nullV), Math.max(...es, nullV), 6);
  const boxW = W - 26, boxX = 17;
  const panelH = H - top - 11 - footH;
  const densH = panelH - D.length * rowH - 8;
  const dens = { x: boxX, y: top + 11, w: boxW, h: densH };
  const dash = { x: boxX, y: dens.y + densH + 5, w: boxW, h: D.length * rowH };
  const X = linear(Xt.lo, Xt.hi, dens.x, dens.x + dens.w);

  /* ---- 上面板：核密度分布 ---- */
  const grid = Array.from({ length: gridN }, (_, i) => Xt.lo + (Xt.hi - Xt.lo) * i / (gridN - 1));
  const densVals = kde(S.map(s => s.e), grid);
  const dMax = Math.max(...densVals) * 1.1;
  const Y = linear(0, dMax, dens.y + dens.h, dens.y);
  const pts = grid.map((g, i) => [X(g), Y(densVals[i])]);
  el('path', {
    d: smoothPath(pts) + `L${X(Xt.hi)} ${dens.y + dens.h}L${X(Xt.lo)} ${dens.y + dens.h}Z`,
    fill: cs[0], 'fill-opacity': .28, stroke: 'none'
  }, svg);
  el('path', { d: smoothPath(pts), fill: 'none', stroke: cs[0], 'stroke-width': .5 }, svg);
  /* 零效应线 + 中位线（图内标注数值） */
  el('line', { x1: X(nullV), x2: X(nullV), y1: dens.y, y2: dens.y + dens.h, stroke: INK.soft, 'stroke-width': .35 }, svg);
  text(svg, X(nullV) + 1.2, dens.y + 3.2, `零效应 = ${fmt(nullV)}`, { size: 2.2, fill: INK.soft });
  el('line', { x1: X(med), x2: X(med), y1: dens.y, y2: dens.y + dens.h, stroke: cs[3], 'stroke-width': .35, 'stroke-dasharray': '1.6 1.2' }, svg);
  text(svg, X(med) + 1.2, dens.y + 6.8, `中位效应 = ${fmt(med)}`, { size: 2.2, fill: cs[3] });
  /* 规格数与显著占比（图内参数标注） */
  text(svg, dens.x + dens.w - 1, dens.y + 3.2,
    `共 ${n.toLocaleString('en-US')} 个规格 · 显著（p < ${sigP}）占 ${(nSig / n * 100).toFixed(1)}%`,
    { size: 2.3, anchor: 'end', fill: INK.base });
  el('path', { d: `M${dens.x} ${dens.y}V${dens.y + dens.h}H${dens.x + dens.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  const yl = text(svg, 0, 0, '密度', { size: 2.6, anchor: 'middle' });
  yl.setAttribute('transform', `translate(${dens.x - 8.5} ${dens.y + dens.h / 2}) rotate(-90)`);

  /* ---- 下面板：分箱决策仪表盘 ---- */
  const binW = dash.w / bins;
  const binOf = e => Math.min(bins - 1, Math.max(0, Math.floor((e - Xt.lo) / (Xt.hi - Xt.lo) * bins)));
  text(svg, dash.x + dash.w - 1, dash.y - 1.6, `决策面板：横轴分 ${bins} 箱 · 色 = 箱内多数水平 · 深浅 = 多数占比`, { size: 2.1, anchor: 'end', fill: INK.soft });
  D.forEach((dec, di) => {
    const ry = dash.y + di * rowH;
    text(svg, dash.x - 1.8, ry + rowH / 2 + .9, dec.name, { size: 2.4, anchor: 'end' });
    for (let b = 0; b < bins; b++) {
      const inBin = S.filter(s => binOf(s.e) === b);
      const cell = el('rect', {
        x: (dash.x + b * binW + .3).toFixed(2), y: (ry + .7).toFixed(2),
        width: (binW - .6).toFixed(2), height: (rowH - 1.4).toFixed(2),
        fill: INK.hair, 'fill-opacity': .5, cursor: inBin.length ? 'pointer' : 'default'
      }, svg);
      if (!inBin.length) continue;
      const cnt = dec.levels.map((_, li) => inBin.filter(s => s.d[di] === li).length);
      const maj = cnt.indexOf(Math.max(...cnt)), share = cnt[maj] / inBin.length;
      cell.setAttribute('fill', cs[maj % cs.length]);
      cell.setAttribute('fill-opacity', (0.3 + 0.7 * share).toFixed(2));
      const msg = `<b>${dec.name}</b> · 效应量箱 ${b + 1}/${bins}<br>箱内规格 ${inBin.length} 个<br>多数水平：${dec.levels[maj]}（${(share * 100).toFixed(0)}%）`;
      cell.addEventListener('pointerenter', ev => tip(msg, ev));
      cell.addEventListener('pointermove', ev => tip(msg, ev));
      cell.addEventListener('pointerleave', tipHide);
    }
  });
  /* x 轴刻度（两面板共用同一比例尺，刻度置于面板下方） */
  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Xt.ticks) {
    el('line', { x1: X(t), x2: X(t), y1: dash.y + dash.h, y2: dash.y + dash.h + 1.2 }, tk);
    text(svg, X(t), dash.y + dash.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft });
  }
  if (data.x?.label) text(svg, dash.x + dash.w / 2, dash.y + dash.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });

  /* ---- 底部：各决策维度的水平图例（逐行标注） ---- */
  let ly = H - (o.note || o.figLabel ? 28 : 16) - D.length * 3.9 + 3.4;
  D.forEach(dec => {
    let lx = 17;
    const nm = text(svg, lx, ly, dec.name + '：', { size: 2.2, fill: INK.soft });
    lx += nm.getComputedTextLength() + 1.5;
    dec.levels.forEach((lv, li) => {
      el('rect', { x: lx, y: ly - 2, width: 1.8, height: 1.8, fill: cs[li % cs.length] }, svg);
      const t = text(svg, lx + 2.6, ly, lv, { size: 2.2 });
      lx += 2.6 + t.getComputedTextLength() + 3.5;
    });
    ly += 3.9;
  });

  figureNote(svg, o);
  return svg;
}
