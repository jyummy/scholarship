/* ============ 平行坐标图（多维个体画像：每维独立标度，折线穿越多轴对比多指标） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128b';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128b';
import { niceTicks, linear, smoothPath } from '../core/scale.js?v=20261128b';
import { tip, tipHide } from '../core/tip.js?v=20261128b';

/*
 * data = {
 *   dims: [ { name:'平均句长', unit:'字' }, { name:'虚词率', unit:'%' }, ... ],
 *     // 维度轴自左向右排列；每轴按本维数据的实际范围独立标度（图内逐轴标注刻度）
 *   items: [ { name:'李白', group:'盛唐', values:[21.4, 18.2, ...] }, ... ]
 *     // 每条折线一个个体；values 与 dims 等长；group 可选，用于着色与图例（缺失时归「全部」）
 * }
 * 文科用法：作者文体计量多指标画像、版本特征对比、译者风格指纹等；
 * 结构与领域无关（Inselberg 平行坐标）。注意各轴标度独立，跨轴斜率不可直接比数值。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   smooth      = false  折线是否平滑（保形三次插值）；默认直线段
 *   lineOpacity = 0.85   折线不透明度
 *   lineWidth   = 0.5    折线宽（mm）
 *   labelEnds   = true   是否在末轴右侧标注个体名（自动纵向避让）
 *   tickN       = 4      每轴目标刻度数（niceTicks 取整）
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const labelEnds = o.labelEnds !== false, tickN = o.tickN ?? 4;

  const D = data.dims, I = data.items;
  const groups = [...new Set(I.map(it => it.group || '全部'))];
  const gCol = g => cs[groups.indexOf(g) % cs.length];

  const box = { x: 13, y: top + 14, w: W - 24 - (labelEnds ? 13 : 0), h: H - top - 14 - footH };
  const axX = k => box.x + (D.length === 1 ? box.w / 2 : box.w * k / (D.length - 1));
  const scales = D.map((d, k) => {
    const vs = I.map(it => it.values[k]);
    const nt = niceTicks(Math.min(...vs), Math.max(...vs), tickN);
    return { nt, f: linear(nt.lo, nt.hi, box.y + box.h, box.y) };
  });

  /* 维度轴：轴线 + 刻度（逐轴独立标度，刻度值标注在轴左侧）+ 轴名/单位 */
  D.forEach((d, k) => {
    const x = axX(k), { nt, f } = scales[k];
    el('line', { x1: x, x2: x, y1: box.y, y2: box.y + box.h, stroke: INK.axis, 'stroke-width': .3 }, svg);
    const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
    for (const t of nt.ticks) {
      el('line', { x1: x - 1.2, x2: x, y1: f(t), y2: f(t) }, tk);
      text(svg, x - 1.7, f(t) + .8, fmt(t), { size: 2, anchor: 'end', fill: INK.soft });
    }
    text(svg, x, box.y - 5.6, d.name, { size: 2.6, anchor: 'middle' });
    if (d.unit) text(svg, x, box.y - 2.2, d.unit, { size: 2, anchor: 'middle', fill: INK.soft });
  });

  /* 折线（先画线，再盖透明粗线承接悬浮提示） */
  const lineOf = it => D.map((d, k) => [axX(k), scales[k].f(it.values[k])]);
  for (const it of I) {
    const pts = lineOf(it);
    el('path', {
      d: o.smooth ? smoothPath(pts) : 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L'),
      fill: 'none', stroke: gCol(it.group || '全部'), 'stroke-width': o.lineWidth ?? .5, 'stroke-opacity': o.lineOpacity ?? .85
    }, svg);
  }
  for (const it of I) {
    const pts = lineOf(it);
    const ov = el('path', {
      d: 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L'),
      fill: 'none', stroke: '#fff', 'stroke-opacity': 0, 'stroke-width': 2.4, 'pointer-events': 'stroke', cursor: 'pointer'
    }, svg);
    const msg = `<b>${it.name}</b>（${it.group || '全部'}）<br>` + D.map((d, k) => `${d.name}：${fmt(it.values[k])}${d.unit || ''}`).join('<br>');
    ov.addEventListener('pointerenter', ev => tip(msg, ev));
    ov.addEventListener('pointermove', ev => tip(msg, ev));
    ov.addEventListener('pointerleave', tipHide);
  }

  /* 末轴右端个体名（按 y 排序后纵向避让） */
  if (labelEnds) {
    const last = D.length - 1, x = axX(last) + 2;
    const items = I.map(it => ({ it, y: scales[last].f(it.values[last]) }))
      .sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    for (const e of items) { e.ly = Math.max(e.y, prev + 3.1); prev = e.ly; }
    for (const e of items) {
      el('line', { x1: axX(last), x2: x - .6, y1: e.y, y2: e.ly, stroke: INK.axis, 'stroke-width': .2 }, svg);
      text(svg, x, e.ly + .8, e.it.name, { size: 2.2, fill: gCol(e.it.group || '全部') });
    }
  }

  if (o.legend !== false)
    legend(svg, groups.map(g => ({
      type: 'line', color: gCol(g),
      label: `${g}（${I.filter(it => (it.group || '全部') === g).length}）`
    })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
