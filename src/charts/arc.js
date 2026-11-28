/* ============ 弧线图（一维基线布局 + 弧形连边：文本结构与共现关系的极简网络图） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128c';
import { linear } from '../core/scale.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   nodes: [ { name:'贾宝玉', value:294 }, ... ],
 *     // 数组顺序即基线顺序（如首次出场顺序、章节顺序、年代顺序）
 *     // value 可选 = 节点总量；省略时由 links 中相关权重汇总
 *   links: [ { from:'贾宝玉', to:'林黛玉', value:86 }, ... ],
 *     // from / to 为 nodes 中的 name；value = 关系强度（共现次数等）
 *   x: { label:'人物（按首次出场排序）' }   // 基线轴标题
 * }
 * 文科用法：小说人物共现、书信往来、文本内指称/对话关系、引文网络的一维投影等；
 * 结构与领域无关。弧高 ∝ 两节点在基线上的相隔距离，弧宽 ∝ 关系强度。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   arcK        = 0.55   弧高系数：弧高 = 相隔距离 × arcK（再受图高封顶）
 *   arcOpacity  = 0.5    弧线不透明度
 *   minLink     = 0      关系强度低于此值的弧不绘制（仍计入节点总量），用于压噪
 *   labelValue  = true   节点标签是否附带总量数值
 *   nodeScale   = 1.8    节点半径随总量的放大系数：r = 1 + nodeScale·√(v/vmax)
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = (o.note || o.figLabel ? 28 : 16) + 13;
  const arcK = o.arcK ?? .55, arcOp = o.arcOpacity ?? .5, minLink = o.minLink ?? 0;
  const labelValue = o.labelValue !== false, nodeScale = o.nodeScale ?? 1.8;

  const N = data.nodes.map(n => ({ ...n }));
  const idx = new Map(N.map((n, i) => [n.name, i]));
  N.forEach((n, i) => {
    if (data.nodes[i].value == null) n.value = data.links.reduce((a, l) => a + ((l.from === n.name || l.to === n.name) ? l.value : 0), 0);
  });
  const vmaxN = Math.max(...N.map(n => n.value), 0) || 1;
  const vmaxL = Math.max(...data.links.map(l => l.value), 0) || 1;

  const yb = H - footH;                       // 基线 y
  const plotTop = top + 10;
  const maxArcH = yb - plotTop;
  const X = linear(0, Math.max(N.length - 1, 1), 10, W - 8);

  /* 顶部读图参数标注 */
  text(svg, W / 2, top + 6.8, `弧宽 ∝ 关系强度（最强 ${fmt(vmaxL)}）· 弧高 ∝ 相隔距离 · 点径 ∝ 总量`, { size: 2.3, anchor: 'middle', fill: INK.soft });

  /* 弧线：细者先画、粗者压上 */
  [...data.links].sort((a, b) => a.value - b.value).forEach(l => {
    if (l.value < minLink) return;
    const i = idx.get(l.from), j = idx.get(l.to);
    const xi = X(i), xj = X(j);
    const h = Math.min(maxArcH, Math.abs(xj - xi) * arcK);
    const arc = el('path', {
      d: `M${xi.toFixed(2)} ${yb}Q${((xi + xj) / 2).toFixed(2)} ${(yb - 2 * h).toFixed(2)} ${xj.toFixed(2)} ${yb}`,
      fill: 'none', stroke: cs[i % cs.length], 'stroke-width': (.25 + (l.value / vmaxL) * 1.9).toFixed(2),
      'stroke-opacity': arcOp, 'stroke-linecap': 'round', cursor: 'pointer'
    }, svg);
    const msg = `<b>${l.from} — ${l.to}</b><br>关系强度：${fmt(l.value)}`;
    arc.addEventListener('pointerenter', ev => tip(msg, ev));
    arc.addEventListener('pointermove', ev => tip(msg, ev));
    arc.addEventListener('pointerleave', tipHide);
  });

  /* 基线 */
  el('line', { x1: X(0) - 4, x2: X(N.length - 1) + 4, y1: yb, y2: yb, stroke: INK.axis, 'stroke-width': .35 }, svg);

  /* 节点 + 斜排标签（带总量） */
  N.forEach((n, i) => {
    const x = X(i), r = 1 + nodeScale * Math.sqrt(n.value / vmaxN);
    const c = el('circle', { cx: x, cy: yb, r, fill: cs[i % cs.length], stroke: '#fff', 'stroke-width': .3, cursor: 'pointer' }, svg);
    const rel = data.links.filter(l => l.from === n.name || l.to === n.name).length;
    const msg = `<b>${n.name}</b><br>关系总量：${fmt(n.value)} · ${rel} 条关系`;
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
    const t = text(svg, x, yb + 3.2, labelValue ? `${n.name} · ${fmt(n.value)}` : n.name, { size: 2.3, anchor: 'end' });
    t.setAttribute('transform', `rotate(-45 ${x} ${yb + 3.2})`);
  });

  if (data.x?.label) text(svg, W / 2, yb + 13.5, data.x.label, { size: 2.8, anchor: 'middle' });

  figureNote(svg, o);
  return svg;
}
