/* ============ 火山图（差异分析：效应量 × 显著性，红蓝两翼喷发状散点） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128c';
import { niceTicks, linear } from '../core/scale.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   points: [ { name:'明月', x:2.31, p:1.2e-6, label:true }, ... ],
 *     // name  条目名（词 / 基因 / 特征）
 *     // x     效应量：log₂ 频率比（或 log₂ 倍数变化）；正 = 在 B 语料偏高，负 = 在 A 语料偏高
 *     // p     显著性 p 值（模块内部换算 y = −log₁₀ p）
 *     // label 可选，true = 强制在图内标注该点名称
 *   aName: '唐诗语料',          // 可选，x<0 一侧的名称（图例与方向标注用）
 *   bName: '宋诗语料',          // 可选，x>0 一侧的名称
 *   x: { label:'log₂ 频率比（宋诗 / 唐诗）' }   // 可选，x 轴标题
 * }
 * 文科用法：两语料差异词（log₂ 频率比或 log odds × −log₁₀ p）、不同年代文本的特征词对比等；
 * 结构与领域无关，生信差异表达（log₂FC × p）同样适用。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   fcCut    = 1     效应量阈值 |x|：|x| ≥ fcCut 且 p < pCut 才判为显著（图内画竖虚线并标注数值）
 *   pCut     = 0.01  显著性阈值 p：图内画横虚线并标注 −log₁₀(pCut) 与 pCut
 *   labelTop = 8     每侧自动标注的最显著点个数（按 −log₁₀ p 排序，label:true 的点不占名额）
 *   pointR   = 0.8   散点半径（mm）
 *   upColor / downColor / nsColor  可选，覆盖上调 / 下调 / 不显著三类颜色
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const fcCut = o.fcCut ?? 1, pCut = o.pCut ?? 0.01, labelTop = o.labelTop ?? 8, pointR = o.pointR ?? .8;
  const upC = o.upColor || cs[3], downC = o.downColor || cs[0], nsC = o.nsColor || '#C9C9C2';
  const yCut = -Math.log10(pCut);

  const P = data.points.map(p => ({ ...p, y: -Math.log10(Math.max(p.p, 1e-12)) }));
  const cls = p => (p.p < pCut && Math.abs(p.x) >= fcCut) ? (p.x > 0 ? 'up' : 'down') : 'ns';
  const nUp = P.filter(p => cls(p) === 'up').length, nDown = P.filter(p => cls(p) === 'down').length;

  const maxAbs = Math.max(...P.map(p => Math.abs(p.x))) * 1.08;
  const Xt = niceTicks(-maxAbs, maxAbs, 6);
  const Yt = niceTicks(0, Math.max(...P.map(p => p.y)) * 1.08, 5);
  const box = { x: 17, y: top + 11, w: W - 26, h: H - top - 11 - footH };
  const X = linear(Xt.lo, Xt.hi, box.x, box.x + box.w);
  const Y = linear(Yt.lo, Yt.hi, box.y + box.h, box.y);

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Xt.ticks) { el('line', { x1: X(t), x2: X(t), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk); text(svg, X(t), box.y + box.h + 3.4, fmt(t), { size: 2.5, anchor: 'middle', fill: INK.soft }); }
  for (const t of Yt.ticks) { el('line', { x1: box.x, x2: box.x + 1.2, y1: Y(t), y2: Y(t) }, tk); text(svg, box.x - 1.6, Y(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft }); }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.x?.label) text(svg, box.x + box.w / 2, box.y + box.h + 7.2, data.x.label, { size: 2.8, anchor: 'middle' });
  const yl = text(svg, 0, 0, '−log₁₀(p)', { size: 2.8, anchor: 'middle' });
  yl.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`);

  /* 阈值线 + 数值标注（参数直接写在图内） */
  const dg = el('g', { stroke: INK.soft, 'stroke-width': .3, 'stroke-dasharray': '1.6 1.2' }, svg);
  for (const v of [-fcCut, fcCut]) el('line', { x1: X(v), x2: X(v), y1: box.y, y2: box.y + box.h }, dg);
  el('line', { x1: box.x, x2: box.x + box.w, y1: Y(yCut), y2: Y(yCut) }, dg);
  text(svg, X(fcCut) + 1.2, box.y + 3.4, `|log₂FC| = ${fmt(fcCut)}`, { size: 2.2, fill: INK.soft });
  text(svg, X(-fcCut) - 1.2, box.y + 3.4, `|log₂FC| = ${fmt(fcCut)}`, { size: 2.2, anchor: 'end', fill: INK.soft });
  text(svg, box.x + box.w - 1.2, Y(yCut) - 1.2, `p = ${pCut}（−log₁₀ p = ${fmt(+yCut.toFixed(1))}）`, { size: 2.2, anchor: 'end', fill: INK.soft });
  /* 零效应参考线 */
  el('line', { x1: X(0), x2: X(0), y1: box.y, y2: box.y + box.h, stroke: INK.hair, 'stroke-width': .3 }, svg);

  /* 先画不显著（垫底），再画显著两翼 */
  const order = { ns: 0, down: 1, up: 2 };
  [...P].sort((a, b) => order[cls(a)] - order[cls(b)]).forEach(p => {
    const c = cls(p);
    const col = c === 'up' ? upC : c === 'down' ? downC : nsC;
    const dot = el('circle', { cx: X(p.x).toFixed(2), cy: Y(p.y).toFixed(2), r: pointR, fill: col, 'fill-opacity': c === 'ns' ? .55 : .85, cursor: 'pointer' }, svg);
    const msg = `<b>${p.name}</b><br>log₂ 频率比：${fmt(p.x)}<br>p = ${p.p.toExponential(1)}（−log₁₀ p = ${fmt(+p.y.toFixed(1))}）`;
    dot.addEventListener('pointerenter', ev => tip(msg, ev));
    dot.addEventListener('pointermove', ev => tip(msg, ev));
    dot.addEventListener('pointerleave', tipHide);
  });

  /* 名称标注：label:true 优先，其余按显著性补足每侧 labelTop 个 */
  const labeled = new Set();
  const drawLabel = p => {
    if (labeled.has(p.name)) return; labeled.add(p.name);
    const right = p.x >= 0;
    text(svg, X(p.x) + (right ? 1.4 : -1.4), Y(p.y) + .8, p.name, {
      size: 2.2, anchor: right ? 'start' : 'end', fill: INK.base,
      extra: { 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': .5 }
    });
  };
  P.filter(p => p.label).forEach(drawLabel);
  for (const side of ['up', 'down'])
    P.filter(p => cls(p) === side && !p.label).sort((a, b) => b.y - a.y).slice(0, labelTop).forEach(drawLabel);

  if (o.legend !== false) {
    const aN = data.aName || 'A 偏高', bN = data.bName || 'B 偏高';
    legend(svg, [
      { type: 'rect', color: upC, label: `${bN}（n=${nUp}）` },
      { type: 'rect', color: downC, label: `${aN}（n=${nDown}）` },
      { type: 'rect', color: nsC, label: `不显著（n=${P.length - nUp - nDown}）` }
    ], { pos: 'top', x: 24, y: top + 2.5 });
  }

  figureNote(svg, o);
  return svg;
}
