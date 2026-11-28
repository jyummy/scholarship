/* ============ 地平线图（多序列高密度时序：色带分层折叠，一屏塞下多条序列） ============ */

import { el, text, INK, SEQUENTIAL } from '../core/svg.js?v=20261128f';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128f';
import { linear } from '../core/scale.js?v=20261128f';
import { tip, tipHide } from '../core/tip.js?v=20261128f';

/*
 * data = {
 *   x: { categories:['730','740',...], label:'年份' },   // 等间隔时序类目，各序列共用
 *   series: [ { name:'李白', values:[85,120,...] }, ... ], // 每行一条序列，values 与 categories 等长
 *   y: { label:'存诗量 / 首' }                            // 值量纲（用于悬浮提示与峰值标注）
 * }
 * 文科用法：多位作者逐年产量、多主题词频、多版本印数等高密度多序列时序；
 * 结构与领域无关。图型源自 Few 的 horizon graph；数量级（order-of-magnitude）
 * 变体见 Braun et al., IEEE TVCG《Reclaiming the Horizon》——本模块以 scale='log' 对应。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   bands       = 3       色带层数：值域 [0, max] 均分为 bands 层，逐层折叠叠印
 *   scale       = 'linear' 值标度：'linear' 线性 | 'log' 数量级标度（sign(v)·log₁₀(1+|v|)）
 *   palette     = 'blue'  正值色带序列色（core/svg 的 SEQUENTIAL 键：blue / sage / clay）
 *   negPalette  = 'clay'  负值色带序列色（仅当数据含负值时启用上下镜像发散布局）
 *   rowGap      = 1.2     行间间隙（mm）
 *   annotateMax = true    是否在每行峰值上方标注峰值数值
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const footH = (o.note || o.figLabel ? 28 : 16) + 10;
  const bands = o.bands ?? 3, scaleMode = o.scale ?? 'linear';
  const seq = SEQUENTIAL[o.palette ?? 'blue'] || SEQUENTIAL.blue;
  const seqN = SEQUENTIAL[o.negPalette ?? 'clay'] || SEQUENTIAL.clay;
  const rowGap = o.rowGap ?? 1.2;
  const yLabel = data.y?.label || '值';

  const cats = data.x.categories, n = cats.length, S = data.series;
  const tf = v => scaleMode === 'log' ? Math.sign(v) * Math.log10(1 + Math.abs(v)) : v;
  const T = S.map(s => s.values.map(tf));
  const vmax = Math.max(...T.flatMap(r => r.map(Math.abs)), 0) || 1;
  const bs = vmax / bands;
  const hasNeg = T.flat().some(v => v < 0);

  const box = { x: 17, y: top + 13, w: W - 26, h: H - top - 13 - footH };
  const X = linear(0, n - 1, box.x, box.x + box.w);
  const rowH = box.h / S.length;

  /* 顶部色带图例：层色块 + 每层数值（参数标注） */
  const lg = el('g', {}, svg);
  let lx = box.x;
  for (let b = 0; b < bands; b++) {
    const idx = Math.round((b + 1) / bands * (seq.length - 1));
    el('rect', { x: lx, y: top + 5.4, width: 2.2, height: 2.2, fill: seq[idx] }, lg);
    lx += 3;
  }
  text(lg, lx + 1, top + 7.4, scaleMode === 'log'
    ? `色带 ${bands} 层 · 每层 ${fmt(bs)}（对数标度 log₁₀(1+|值|)）`
    : `色带 ${bands} 层 · 每层 ${fmt(bs)}`, { size: 2.3, fill: INK.soft });
  if (hasNeg) text(lg, box.x + box.w, top + 7.4, '负值向下镜像', { size: 2.3, anchor: 'end', fill: INK.soft });

  const bandPath = (vals, b, yBase, hgt, neg) => {
    let d = `M${X(0).toFixed(2)} ${yBase.toFixed(2)}`;
    vals.forEach((t, i) => {
      const f = Math.min(Math.max(((neg ? -t : t) - b * bs) / bs, 0), 1);
      d += `L${X(i).toFixed(2)} ${(neg ? yBase + f * hgt : yBase - f * hgt).toFixed(2)}`;
    });
    return d + `L${X(n - 1).toFixed(2)} ${yBase.toFixed(2)}Z`;
  };

  S.forEach((s, si) => {
    const ry = box.y + si * rowH, rh = rowH - rowGap;
    const yb = hasNeg ? ry + rh / 2 : ry + rh;         // 基线：发散时居中
    const hgt = hasNeg ? rh / 2 : rh;
    for (let b = 0; b < bands; b++) {
      const idx = Math.round((b + 1) / bands * (seq.length - 1));
      el('path', { d: bandPath(T[si], b, yb, hgt, false), fill: seq[idx], stroke: 'none' }, svg);
      if (hasNeg) el('path', { d: bandPath(T[si], b, yb, hgt, true), fill: seqN[idx], stroke: 'none' }, svg);
    }
    el('line', { x1: box.x, x2: box.x + box.w, y1: ry + rh, y2: ry + rh, stroke: INK.hair, 'stroke-width': .2 }, svg);
    text(svg, box.x - 1.8, ry + rh / 2 + .9, s.name, { size: 2.6, anchor: 'end' });

    /* 峰值标注（原始值口径） */
    if (o.annotateMax !== false) {
      let mi = 0; s.values.forEach((v, i) => { if (v > s.values[mi]) mi = i; });
      text(svg, X(mi), ry + 2.8, fmt(s.values[mi]), { size: 2.1, anchor: 'middle', fill: INK.soft });
    }
    /* 整行悬浮提示 */
    const ov = el('rect', { x: box.x, y: ry, width: box.w, height: rh, fill: '#fff', 'fill-opacity': 0, cursor: 'pointer' }, svg);
    const tot = s.values.reduce((a, b) => a + b, 0), mx = Math.max(...s.values);
    const msg = `<b>${s.name}</b><br>${yLabel}：合计 ${fmt(tot)} · 峰值 ${fmt(mx)}`;
    ov.addEventListener('pointerenter', ev => tip(msg, ev));
    ov.addEventListener('pointermove', ev => tip(msg, ev));
    ov.addEventListener('pointerleave', tipHide);
  });

  /* 坐标框 + x 轴刻度（抽稀至多 6 个） */
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  const step = Math.max(1, Math.ceil(n / 6));
  for (let i = 0; i < n; i += step) {
    el('line', { x1: X(i), x2: X(i), y1: box.y + box.h, y2: box.y + box.h + 1.2 }, tk);
    text(svg, X(i), box.y + box.h + 4.4, cats[i], { size: 2.5, anchor: 'middle', fill: INK.soft });
  }
  if (data.x.label) text(svg, box.x + box.w / 2, box.y + box.h + 8.6, data.x.label, { size: 2.8, anchor: 'middle' });

  figureNote(svg, o);
  return svg;
}
