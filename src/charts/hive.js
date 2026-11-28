/* ============ 蜂巢图（分组网络：节点按身份钉在辐射轴上，弧线连关系） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128e';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128e';
import { tip, tipHide } from '../core/tip.js?v=20261128e';

/*
 * data = {
 *   axes: [ { name:'贾府' }, { name:'王府 / 史府' }, { name:'薛家 / 其他' } ],
 *     // 轴自正上方起顺时针均布；3–5 条为宜
 *   nodes: [ { name:'贾宝玉', axis:0, pos:0.78 }, ... ],
 *     // axis = 轴序号；pos ∈ (0,1] 为沿轴位置（1 = 轴末端），口径自定（如地位、权重），图注须交代
 *   links: [ { a:'贾宝玉', b:'林黛玉', w:3 }, ... ]
 *     // a/b 为节点名；w 为关系强度（可选，决定弧线粗细与深浅）
 * }
 * 文科用法：人物关系（按家族分轴）、机构往来、引文网络等分组网络；
 * 结构与领域无关（Krzywinski 蜂巢图）。与普通网络图的区别：节点位置由
 * 「身份 + 轴上量」完全决定、无随机布局，两次绘图结果一致、可比。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   innerR  = 0.14     轴内端留白（占轴长的比例，pos 自此起算）
 *   curve   = 0.5      弧线向心弯曲程度（控制点向圆心拉近的比例，0–1）
 *   dotR    = 1.5      节点半径（mm）
 *   labelDy = 3.4      节点名与节点的径向偏移（mm）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const innerR = o.innerR ?? 0.14, curve = o.curve ?? 0.5, dotR = o.dotR ?? 1.5;

  const cx = W / 2, cy = top + 12 + (H - top - 12 - footH) / 2;
  const L = Math.min(W / 2 - 14, (H - top - 12 - footH) / 2 - 6);
  const K = data.axes.length;
  const dir = k => { const a = -Math.PI / 2 + k * 2 * Math.PI / K; return [Math.cos(a), Math.sin(a)]; };
  const pt = (k, pos) => { const d = dir(k), r = L * (innerR + pos * (1 - innerR)); return [cx + d[0] * r, cy + d[1] * r]; };

  /* 轴 */
  data.axes.forEach((ax, k) => {
    const [x1, y1] = pt(k, 0), [x2, y2] = pt(k, 1);
    el('line', { x1, y1, x2, y2, stroke: INK.axis, 'stroke-width': .35 }, svg);
    const d = dir(k);
    text(svg, cx + d[0] * (L + 4.6), cy + d[1] * (L + 4.6) + 1, ax.name, { size: 2.5, anchor: Math.abs(d[0]) < .3 ? 'middle' : d[0] > 0 ? 'start' : 'end' });
  });

  const byName = {};
  data.nodes.forEach(n => byName[n.name] = n);
  const maxW = Math.max(1, ...data.links.map(l => l.w || 1));

  /* 弧线（先画线，后画点） */
  for (const l of data.links) {
    const A = byName[l.a], B = byName[l.b]; if (!A || !B) continue;
    const [x1, y1] = pt(A.axis, A.pos), [x2, y2] = pt(B.axis, B.pos);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const qx = mx + (cx - mx) * curve, qy = my + (cy - my) * curve;
    const w = l.w || 1;
    const p = el('path', { d: `M${x1.toFixed(2)} ${y1.toFixed(2)} Q${qx.toFixed(2)} ${qy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`, fill: 'none', stroke: cs[A.axis % cs.length], 'stroke-width': .25 + .3 * (w / maxW), 'stroke-opacity': .3 + .45 * (w / maxW), cursor: 'pointer' }, svg);
    const msg = `<b>${l.a} — ${l.b}</b><br>${data.axes[A.axis].name} × ${data.axes[B.axis].name}${l.w ? ` · 强度 ${l.w}` : ''}`;
    p.addEventListener('pointerenter', ev => tip(msg, ev));
    p.addEventListener('pointermove', ev => tip(msg, ev));
    p.addEventListener('pointerleave', tipHide);
  }

  /* 节点与名字 */
  for (const n of data.nodes) {
    const [x, y] = pt(n.axis, n.pos), d = dir(n.axis);
    const deg = data.links.filter(l => l.a === n.name || l.b === n.name).length;
    const c = el('circle', { cx: x, cy: y, r: dotR, fill: cs[n.axis % cs.length], stroke: '#fff', 'stroke-width': .35, cursor: 'pointer' }, svg);
    const msg = `<b>${n.name}</b>（${data.axes[n.axis].name}）<br>轴上位置 ${fmt(n.pos)} · 关系 ${deg} 条`;
    c.addEventListener('pointerenter', ev => tip(msg, ev));
    c.addEventListener('pointermove', ev => tip(msg, ev));
    c.addEventListener('pointerleave', tipHide);
    text(svg, x + d[0] * (o.labelDy ?? 3.4), y + d[1] * (o.labelDy ?? 3.4) + .8, n.name, { size: 2.1, anchor: Math.abs(d[0]) < .3 ? 'middle' : d[0] > 0 ? 'start' : 'end', fill: cs[n.axis % cs.length] });
  }

  if (o.legend !== false)
    legend(svg, data.axes.map((ax, k) => ({ type: 'rect', color: cs[k % cs.length], label: `${ax.name}（${data.nodes.filter(n => n.axis === k).length} 人）` })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
