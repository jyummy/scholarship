/* ============ 矩形树图（层级占比：面积即份额，两级 squarified 布局） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128e';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128e';
import { tip, tipHide } from '../core/tip.js?v=20261128e';

/*
 * data = {
 *   children: [ { name:'经部', children:[ {name:'易类', value:820}, ... ] }, ... ]
 *     // 恰两级：顶层为大类（着色），次级为小类（矩形）；value > 0，面积与 value 成正比
 * }
 * 文科用法：藏书部类卷数、丛书构成、语料库子库规模、选集篇目分布等；
 * 结构与领域无关（Shneiderman 矩形树图，squarified 布局使矩形接近方形、便于比较）。
 * 只宜比大小，不宜读精确数值——精确份额由悬浮提示与图内百分比给出。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   minPctLabel = 2.5    份额 ≥ 该百分比的小类才在矩形内标注名称（%）
 *   minPctValue = 6      份额 ≥ 该百分比才在名称下加注百分比（%）
 *   gap         = 0.5    顶层大类之间的间隙（mm）
 *   pad         = 0.35   小类矩形之间的间隙（mm）
 *   headH       = 4.2    顶层大类标题条高度（mm）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const minPctLabel = o.minPctLabel ?? 2.5, minPctValue = o.minPctValue ?? 6;
  const gap = o.gap ?? 0.5, pad = o.pad ?? 0.35, headH = o.headH ?? 4.2;

  const groups = data.children;
  const total = groups.reduce((s, g) => s + g.children.reduce((a, c) => a + c.value, 0), 0);
  const box = { x: 8, y: top + 12, w: W - 16, h: H - top - 12 - footH };

  /* squarified 布局：在 rect 内按 values 排矩形 */
  function squarify(items, rect) {
    const out = [];
    let rest = items.map(it => ({ it, v: it.value }));
    let area = rect.w * rect.h, sum = rest.reduce((s, r) => s + r.v, 0);
    let { x, y, w, h } = rect;
    while (rest.length) {
      const horiz = w >= h, side = horiz ? h : w;
      let row = [], rowSum = 0, best = Infinity;
      for (const r of rest) {
        const cand = [...row, r], cs2 = rowSum + r.v;
        const thick = cs2 / sum * (horiz ? w : h);
        const worst = Math.max(...cand.map(c => Math.max((c.v / cs2 * side) / (c.v / sum * area / thick || 1), 1)));
        const wr = Math.max(...cand.map(c => { const len = c.v / cs2 * side, dep = c.v / sum * area / len; return Math.max(len / dep, dep / len); }));
        if (row.length && wr > best) break;
        row = cand; rowSum = cs2; best = wr;
      }
      const thick = rowSum / sum * (horiz ? w : h);
      let off = 0;
      for (const r of row) {
        const len = r.v / rowSum * side;
        out.push({ it: r.it, rect: horiz ? { x, y: y + off, w: thick, h: len } : { x: x + off, y, w: len, h: thick } });
        off += len;
      }
      if (horiz) { x += thick; w -= thick; } else { y += thick; h -= thick; }
      rest = rest.slice(row.length); sum -= rowSum; area = w * h;
    }
    return out;
  }

  const gLayout = squarify(groups.map(g => ({ name: g.name, value: g.children.reduce((a, c) => a + c.value, 0), g })), box);
  gLayout.forEach((gl, gi) => {
    const col = cs[gi % cs.length], r = gl.rect;
    el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: col, 'fill-opacity': .14, stroke: col, 'stroke-width': .4 }, svg);
    text(svg, r.x + 1.2, r.y + 3.1, `${gl.it.name}（${fmt(gl.it.value / total * 100)}%）`, { size: 2.4, fill: col });
    const inner = { x: r.x + gap, y: r.y + headH, w: r.w - gap * 2, h: r.h - headH - gap };
    if (inner.w <= 2 || inner.h <= 2) return;
    const cLayout = squarify(gl.it.g.children.map(c => ({ name: c.name, value: c.value, c })), inner);
    for (const cl of cLayout) {
      const cr = cl.rect, pct = cl.it.value / total * 100;
      const cell = el('rect', { x: cr.x + pad / 2, y: cr.y + pad / 2, width: Math.max(0, cr.w - pad), height: Math.max(0, cr.h - pad), fill: col, 'fill-opacity': .38 + .3 * (cl.it.value / gl.it.value), stroke: '#fff', 'stroke-width': .2, cursor: 'pointer' }, svg);
      const msg = `<b>${gl.it.name} · ${cl.it.name}</b><br>${fmt(cl.it.value)}（占总量 ${fmt(pct)}%）`;
      cell.addEventListener('pointerenter', ev => tip(msg, ev));
      cell.addEventListener('pointermove', ev => tip(msg, ev));
      cell.addEventListener('pointerleave', tipHide);
      if (pct >= minPctLabel && cr.w > 9 && cr.h > 4.4) {
        text(svg, cr.x + 1, cr.y + 3, cl.it.name, { size: 2.1 });
        if (pct >= minPctValue && cr.h > 7.4) text(svg, cr.x + 1, cr.y + 5.9, fmt(pct) + '%', { size: 1.9, fill: INK.soft });
      }
    }
  });

  if (o.legend !== false)
    legend(svg, groups.map((g, gi) => ({ type: 'rect', color: cs[gi % cs.length], label: `${g.name}（${fmt(g.children.reduce((a, c) => a + c.value, 0) / total * 100)}%）` })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
