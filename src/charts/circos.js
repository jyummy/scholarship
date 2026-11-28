/* ============ 弦环图 Circos（环形分段 + 弦带关系：总览多对多关系的经典图型） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   nodes: [ { name:'贾宝玉', value:128 }, ... ],
 *     // name  分段名（人物 / 地区 / 类目）；value 可选 = 该分段总量，
 *     //       省略时由 links 中与该分段相关的权重汇总
 *   links: [ { from:'贾宝玉', to:'林黛玉', value:46 }, ... ]
 *     // from / to 为 nodes 中的 name；value = 关系强度（共现次数 / 书信数 / 流量）
 * }
 * 文科用法：经典小说人物共现 / 书信往来关系、文献互引、贸易与迁徙流向等；
 * 图型源自 Krzywinski et al. 2009 的 Circos，结构与领域无关。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   pad          = 0.05  相邻弧段之间的间隙（弧度）
 *   band         = 2.4   弧段环带厚度（mm）
 *   ribbonOpacity = 0.45 弦带填充不透明度
 *   minRibbon    = 0     关系强度低于此值的弦带不绘制（仍计入弧长），用于压噪
 *   labelValue   = true  分段标签是否附带总量数值（如「贾宝玉 · 128」）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const pad = o.pad ?? 0.05, band = o.band ?? 2.4, rop = o.ribbonOpacity ?? .45;
  const minR = o.minRibbon ?? 0, labelValue = o.labelValue !== false;

  const N = data.nodes.map(n => ({ ...n }));
  const idx = new Map(N.map((n, i) => [n.name, i]));
  /* 未给 value 的分段：由 links 中相关权重汇总 */
  N.forEach((n, i) => {
    if (data.nodes[i].value == null) n.value = data.links.reduce((a, l) => a + ((l.from === n.name || l.to === n.name) ? l.value : 0), 0);
  });
  const total = N.reduce((a, n) => a + n.value, 0) || 1;
  const totalLinks = data.links.reduce((a, l) => a + l.value, 0);

  const cx = W / 2, cy = top + (H - top - footH) / 2 + 4;
  const R = Math.min(W, H - top - footH) / 2 - 13;
  const R1 = R - band;
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

  /* 弧段布局：自顶部起顺时针，弧长 ∝ value */
  let ang = -Math.PI / 2;
  const span = (Math.PI * 2 - pad * N.length);
  for (const n of N) {
    n.a0 = ang; n.a1 = ang + span * n.value / total; n.cur = n.a0;
    ang = n.a1 + pad;
  }
  const arcPath = (r0, r1, a0, a1) => {
    const [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0);
    const laf = (a1 - a0) > Math.PI ? 1 : 0;
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${laf} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${laf} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
  };

  /* 弦带（先画，垫在弧段之下）：两端子弧 + 经圆心的二次贝塞尔 */
  for (const l of data.links) {
    const A = N[idx.get(l.from)], B = N[idx.get(l.to)];
    const a0 = A.cur, a1 = A.cur + span * l.value / total; A.cur = a1;
    const b0 = B.cur, b1 = B.cur + span * l.value / total; B.cur = b1;
    if (l.value < minR) continue;
    const [ax0, ay0] = P(R1, a0), [ax1, ay1] = P(R1, a1), [bx0, by0] = P(R1, b0), [bx1, by1] = P(R1, b1);
    const d = `M${ax0.toFixed(2)} ${ay0.toFixed(2)}A${R1} ${R1} 0 0 1 ${ax1.toFixed(2)} ${ay1.toFixed(2)}` +
      `Q${cx} ${cy} ${bx1.toFixed(2)} ${by1.toFixed(2)}A${R1} ${R1} 0 0 0 ${bx0.toFixed(2)} ${by0.toFixed(2)}Q${cx} ${cy} ${ax0.toFixed(2)} ${ay0.toFixed(2)}Z`;
    const rb = el('path', { d, fill: cs[idx.get(l.from) % cs.length], 'fill-opacity': rop, stroke: 'none', cursor: 'pointer' }, svg);
    const msg = `<b>${l.from} — ${l.to}</b><br>关系强度：${fmt(l.value)}`;
    rb.addEventListener('pointerenter', ev => tip(msg, ev));
    rb.addEventListener('pointermove', ev => tip(msg, ev));
    rb.addEventListener('pointerleave', tipHide);
  }

  /* 弧段 + 外侧标签（带总量数值） */
  N.forEach((n, i) => {
    const seg = el('path', { d: arcPath(R1, R, n.a0, n.a1), fill: cs[i % cs.length], cursor: 'pointer' }, svg);
    const msg = `<b>${n.name}</b><br>关系总量：${fmt(n.value)}（占 ${fmt(+(n.value / total * 100).toFixed(1))}%）`;
    seg.addEventListener('pointerenter', ev => tip(msg, ev));
    seg.addEventListener('pointermove', ev => tip(msg, ev));
    seg.addEventListener('pointerleave', tipHide);
    const mid = (n.a0 + n.a1) / 2;
    const [lx, ly] = P(R + 2.2, mid);
    const right = Math.cos(mid) >= 0;
    const deg = mid * 180 / Math.PI;
    const t = text(svg, lx, ly, labelValue ? `${n.name} · ${fmt(n.value)}` : n.name, {
      size: 2.4, anchor: right ? 'start' : 'end',
      extra: { transform: `rotate(${right ? deg : deg + 180} ${lx} ${ly})`, 'dominant-baseline': 'middle' }
    });
  });

  /* 圆心参数标注：关系条数与总强度 */
  text(svg, cx, cy - 1.6, `${data.links.length} 条关系`, { size: 2.6, anchor: 'middle', fill: INK.soft });
  text(svg, cx, cy + 2.4, `总强度 ${fmt(totalLinks)}`, { size: 2.6, anchor: 'middle', fill: INK.soft });

  if (o.legend !== false)
    legend(svg, N.map((n, i) => ({ type: 'rect', color: cs[i % cs.length], label: n.name })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
