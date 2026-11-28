/* ============ 旭日图（层级同心环：角度 ∝ 量，环层 = 深度，层级占比总览） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128e';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128e';
import { tip, tipHide } from '../core/tip.js?v=20261128e';

/*
 * data = {
 *   tree: { name:'四部总目', children:[
 *     { name:'经部', children:[ { name:'易类', value:214 }, ... ] },
 *     ...
 *   ] }
 *     // 叶节点给 value；有 children 的节点总量 = 子项之和（其自身 value 忽略）
 *     // 层级深度不限（样例为 3 层：部 → 类 → 子类亦可）
 * }
 * 文科用法：图书分类（四部/中图法）、文献体裁层级、机构与藏品层级构成等；
 * 结构与领域无关，文件系统、物种分类、预算科目同样适用。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   innerR        = null   中心孔半径（mm），null 时自动取 9（中心放根名与总量）
 *   pad           = 0.012  同层相邻分段之间的间隙（弧度）
 *   lighten       = 0.3    每深入一层向白色混合的比例（同系渐变深度编码）
 *   labelMinAngle = 0.09   分段弧度大于此值才标注名称（弧度）
 *   labelValue    = true   弧度足够大（> 0.16）时标签附带数值
 *   maxDepth      = null   最多绘制层数（自根的直接子层记为 1），null = 全部
 */
function lerpColor(hex, target, f) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(target);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
}

export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const pad = o.pad ?? .012, lighten = o.lighten ?? .3;
  const labelMin = o.labelMinAngle ?? .09, labelValue = o.labelValue !== false;

  const root = data.tree;
  const val = n => { n._v = n.children?.length ? n.children.reduce((a, c) => a + val(c), 0) : (n.value || 0); return n._v; };
  const total = val(root) || 1;
  const depthOf = n => n.children?.length ? 1 + Math.max(...n.children.map(depthOf)) : 0;
  const maxD = o.maxDepth ?? depthOf(root);

  const cx = W / 2, cy = top + (H - top - footH) / 2 + 4;
  const R = Math.min(W, H - top - footH) / 2 - 13;
  const rIn = o.innerR ?? 9, ringT = (R - rIn) / maxD;
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const arcPath = (r0, r1, a0, a1) => {
    const [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0);
    const laf = (a1 - a0) > Math.PI ? 1 : 0;
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${laf} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${laf} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
  };

  /* 递归布局 + 绘制：depth 1 取配色，逐层向白混合 */
  const drawNode = (n, depth, a0, a1, baseCol, path) => {
    if (depth > maxD) return;
    const col = depth === 1 ? baseCol : lerpColor(baseCol, '#FFFFFF', Math.min(.85, (depth - 1) * lighten));
    const r0 = rIn + (depth - 1) * ringT + .3, r1 = rIn + depth * ringT;
    const seg = el('path', { d: arcPath(r0, r1, a0, a1), fill: col, stroke: '#fff', 'stroke-width': .25, cursor: 'pointer' }, svg);
    const msg = `<b>${path}</b><br>数量：${fmt(n._v)}（占 ${fmt(+(n._v / total * 100).toFixed(1))}%）`;
    seg.addEventListener('pointerenter', ev => tip(msg, ev));
    seg.addEventListener('pointermove', ev => tip(msg, ev));
    seg.addEventListener('pointerleave', tipHide);
    if (a1 - a0 > labelMin) {
      const mid = (a0 + a1) / 2, [lx, ly] = P((r0 + r1) / 2, mid);
      const right = Math.cos(mid) >= 0, deg = mid * 180 / Math.PI;
      text(svg, lx, ly, labelValue && a1 - a0 > .16 ? `${n.name} · ${fmt(n._v)}` : n.name, {
        size: depth === 1 ? 2.4 : 2.1, anchor: right ? 'start' : 'end',
        extra: { transform: `rotate(${right ? deg : deg + 180} ${lx} ${ly})`, 'dominant-baseline': 'middle' }
      });
    }
    if (!n.children?.length) return;
    const usable = (a1 - a0) - pad * n.children.length;
    let a = a0 + pad / 2;
    for (const c of n.children) {
      const w = usable * c._v / n._v;
      drawNode(c, depth + 1, a, a + w, baseCol, `${path} › ${c.name}`);
      a += w + pad;
    }
  };
  {
    const kids = root.children || [];
    const usable = Math.PI * 2 - pad * kids.length;
    let a = -Math.PI / 2 + pad / 2;
    kids.forEach((c, i) => {
      const w = usable * c._v / total;
      drawNode(c, 1, a, a + w, cs[i % cs.length], c.name);
      a += w + pad;
    });
  }

  /* 圆心标注：根名 + 总量 */
  text(svg, cx, cy - 1.4, root.name, { size: 2.5, anchor: 'middle' });
  text(svg, cx, cy + 2.6, `共 ${fmt(total)}`, { size: 2.4, anchor: 'middle', fill: INK.soft });

  if (o.legend !== false)
    legend(svg, (root.children || []).map((n, i) => ({ type: 'rect', color: cs[i % cs.length], label: `${n.name} ${fmt(n._v)}` })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
