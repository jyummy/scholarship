/* ============ 蜂巢图（二维密度：散点聚合进六边形，颜色深浅即点数） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128d';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128d';
import { niceTicks, linear } from '../core/scale.js?v=20261128d';
import { tip, tipHide } from '../core/tip.js?v=20261128d';

/*
 * data = {
 *   points: [ [x, y], ... ],
 *     // 原始散点，数量建议 ≥ 200 才有聚合意义；坐标为原始单位
 *   xName: '存诗量', yName: '平均篇长', xUnit: '首', yUnit: '字'
 *     // 轴名与单位，图内标注
 * }
 * 原理：尖顶六边形密铺绘图区，每点归入最近的六边形中心（轴向坐标取整），
 * 格内点数以单色深浅编码。适合散点多到重叠成团时看分布骨架与热点；
 * 代价是丢失个体身份——需要看个体时请用散点类图。结构与领域无关。
 * 文科用法：大语料词长×句长分布、作者存诗量×篇幅、版本尺寸×页数等。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   cols     = 18      横向六边形列数（决定格大小：列数越大格越细）
 *   color    = null    主色；默认取调色板首色，单色渐变
 *   minCount = 1       格内点数 < 该值的格不画（滤掉离群噪声）
 *   tickN    = 5       两轴目标刻度数
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const colsN = o.cols ?? 18, minCount = o.minCount ?? 1, tickN = o.tickN ?? 5;
  const base = o.color || cs[0];

  const xs = data.points.map(p => p[0]), ys = data.points.map(p => p[1]);
  const ntx = niceTicks(Math.min(...xs), Math.max(...xs), tickN);
  const nty = niceTicks(Math.min(...ys), Math.max(...ys), tickN);
  const box = { x: 15, y: top + 13, w: W - 24, h: H - top - 13 - footH - 7 };
  const fx = linear(ntx.lo, ntx.hi, box.x, box.x + box.w);
  const fy = linear(nty.lo, nty.hi, box.y + box.h, box.y);

  /* 轴与刻度 */
  el('line', { x1: box.x, x2: box.x + box.w, y1: box.y + box.h, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .3 }, svg);
  el('line', { x1: box.x, x2: box.x, y1: box.y, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of ntx.ticks) {
    el('line', { x1: fx(t), x2: fx(t), y1: box.y + box.h, y2: box.y + box.h + 1.2, stroke: INK.axis, 'stroke-width': .3 }, svg);
    text(svg, fx(t), box.y + box.h + 4.8, fmt(t), { size: 2, anchor: 'middle', fill: INK.soft });
  }
  for (const t of nty.ticks) {
    el('line', { x1: box.x - 1.2, x2: box.x, y1: fy(t), y2: fy(t), stroke: INK.axis, 'stroke-width': .3 }, svg);
    text(svg, box.x - 1.8, fy(t) + .8, fmt(t), { size: 2, anchor: 'end', fill: INK.soft });
  }
  text(svg, box.x + box.w, box.y + box.h + 9.4, `${data.xName}${data.xUnit ? '（' + data.xUnit + '）' : ''}`, { size: 2.2, anchor: 'end' });
  text(svg, box.x, box.y - 2.6, `${data.yName}${data.yUnit ? '（' + data.yUnit + '）' : ''}`, { size: 2.2 });

  /* 六边形分箱：尖顶布局，dx = √3·s，dy = 1.5·s */
  const s = box.w / (Math.sqrt(3) * colsN);
  const dx = Math.sqrt(3) * s, dy = 1.5 * s;
  const bins = new Map();
  for (const [px, py] of data.points) {
    const X = fx(px), Y = fy(py);
    let q = (Math.sqrt(3) / 3 * (X - box.x) - 1 / 3 * (Y - box.y)) / s;
    let r = (2 / 3 * (Y - box.y)) / s;
    /* 立方坐标取整到最近中心 */
    let cx = q, cz = r, cy = -cx - cz;
    const rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    const ex = Math.abs(rx - cx), ey = Math.abs(ry - cy), ez = Math.abs(rz - cz);
    let fq = rx, fr = rz;
    if (ex > ey && ex > ez) fq = -ry - rz; else if (ey <= ez) fr = -rx - ry;
    const key = fq + ',' + fr;
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  const maxC = Math.max(...bins.values());
  const mix = t => {
    const n = parseInt(base.slice(1), 16), rr = n >> 16 & 255, gg = n >> 8 & 255, bb = n & 255;
    const m = c => Math.round(255 - (255 - c) * t);
    return `rgb(${m(rr)},${m(gg)},${m(bb)})`;
  };
  const hexPath = (cx, cy) => 'M' + Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 180 * (60 * k - 30);
    return (cx + s * Math.cos(a)).toFixed(2) + ' ' + (cy + s * Math.sin(a)).toFixed(2);
  }).join('L') + 'Z';
  for (const [key, cnt] of bins) {
    if (cnt < minCount) continue;
    const [q, r] = key.split(',').map(Number);
    const cx = box.x + dx * (q + r / 2), cy = box.y + dy * r;
    if (cx < box.x - s || cx > box.x + box.w + s || cy < box.y - s || cy > box.y + box.h + s) continue;
    const cellEl = el('path', { d: hexPath(cx, cy), fill: mix(.15 + .85 * Math.pow(cnt / maxC, .6)), stroke: '#fff', 'stroke-width': .18, cursor: 'pointer' }, svg);
    const msg = `<b>${cnt} 个点</b><br>中心约 ${data.xName} ${fmt(ntx.lo + (cx - box.x) / box.w * (ntx.hi - ntx.lo))}${data.xUnit || ''} · ${data.yName} ${fmt(nty.lo + (1 - (cy - box.y) / box.h) * (nty.hi - nty.lo))}${data.yUnit || ''}`;
    cellEl.addEventListener('pointerenter', ev => tip(msg, ev));
    cellEl.addEventListener('pointermove', ev => tip(msg, ev));
    cellEl.addEventListener('pointerleave', tipHide);
  }
  /* 色标 */
  const ly = box.y - 2.6;
  text(svg, box.x + box.w - 34, ly + .8, '点数 少', { size: 1.9, fill: INK.soft });
  for (let k = 0; k < 5; k++)
    el('rect', { x: box.x + box.w - 24 + k * 3.4, y: ly - 1.6, width: 3, height: 3, fill: mix(.15 + .85 * k / 4) }, svg);
  text(svg, box.x + box.w - 6 + 8, ly + .8, '多', { size: 1.9, fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
