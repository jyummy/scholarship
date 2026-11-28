/* ============ 日历热力图（全年逐日强度：GitHub 式周列布局，颜色深浅即数值） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128c';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128c';
import { linear } from '../core/scale.js?v=20261128c';
import { tip, tipHide } from '../core/tip.js?v=20261128c';

/*
 * data = {
 *   year: 2026,
 *   values: [ n0, n1, ... ]
 *     // 自 1 月 1 日起逐日数值，长度 = 该年天数（365/366）；缺日可传 null（画空格）
 *   unit: '字'
 *     // 悬浮提示与色标的单位
 * }
 * 文科用法：日记/写作逐日字数、借阅记录、发帖与创作节律、田野调查天数等；
 * 结构与领域无关。适合看节律与空白（哪几周停了），不适合读单日精确值。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   color    = null    主色（十六进制）；默认取调色板首色，单色渐变
 *   steps    = 5       色阶档数（0 值另用浅灰底）
 *   weekStart = 1      每周起始：1 = 周一（默认）| 0 = 周日
 *   monthLabel = true  是否在每月首周上方标注月份
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const steps = o.steps ?? 5, weekStart = o.weekStart ?? 1, base = o.color || cs[0];

  const year = data.year, vals = data.values;
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const lead = (jan1.getUTCDay() - weekStart + 7) % 7;
  const nDays = vals.length;
  const weeks = Math.ceil((lead + nDays) / 7);
  const max = Math.max(...vals.filter(v => v != null));

  const box = { x: 11, y: top + 15, w: W - 19, h: H - top - 15 - footH - 6 };
  const cw = box.w / weeks, ch = box.h / 7, cell = Math.min(cw, ch);

  /* 单色渐变：把 base 与白色按比例混合 */
  const mix = t => {
    const n = parseInt(base.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const m = c => Math.round(255 - (255 - c) * t);
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  };
  const fillFor = v => v == null ? 'none' : v === 0 ? '#eceae4' : mix(.18 + .82 * Math.ceil(v / max * steps) / steps * .999);

  const monthFirstCol = {};
  for (let d = 0; d < nDays; d++) {
    const date = new Date(Date.UTC(year, 0, 1 + d));
    const col = Math.floor((lead + d) / 7), row = (lead + d) % 7;
    const m = date.getUTCMonth();
    if (date.getUTCDate() === 1) monthFirstCol[m] = col;
    const v = vals[d];
    const cellEl = el('rect', {
      x: box.x + col * cw + (cw - cell) / 2 + .18, y: box.y + row * ch + (ch - cell) / 2 + .18,
      width: cell - .36, height: cell - .36, rx: .4,
      fill: fillFor(v), stroke: v == null ? 'none' : INK.axis, 'stroke-width': .08, cursor: 'pointer'
    }, svg);
    const ds = `${year}-${String(m + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const msg = `<b>${ds}</b><br>${v == null ? '无记录' : fmt(v) + ' ' + (data.unit || '')}`;
    cellEl.addEventListener('pointerenter', ev => tip(msg, ev));
    cellEl.addEventListener('pointermove', ev => tip(msg, ev));
    cellEl.addEventListener('pointerleave', tipHide);
  }
  /* 星期与月份标注 */
  const wd = weekStart === 1 ? ['一', '二', '三', '四', '五', '六', '日'] : ['日', '一', '二', '三', '四', '五', '六'];
  wd.forEach((w, r) => { if (r % 2 === 0) text(svg, box.x - 1.6, box.y + r * ch + ch / 2 + .7, w, { size: 1.8, anchor: 'end', fill: INK.soft }); });
  if (o.monthLabel !== false)
    for (const m in monthFirstCol)
      text(svg, box.x + monthFirstCol[m] * cw, box.y - 2.2, `${+m + 1}月`, { size: 1.9, fill: INK.soft });

  /* 色标 */
  const ly = box.y + box.h + 5.6;
  text(svg, box.x, ly + 2.2, '少', { size: 1.9, fill: INK.soft });
  for (let k = 0; k < steps; k++)
    el('rect', { x: box.x + 5 + k * (cell * .72 + .5), y: ly, width: cell * .72, height: cell * .72, fill: k === 0 ? '#eceae4' : mix(.18 + .82 * k / (steps - 1) * .999) }, svg);
  text(svg, box.x + 5 + steps * (cell * .72 + .5) + 1, ly + 2.2, `多（最大 ${fmt(max)}${data.unit || ''}）`, { size: 1.9, fill: INK.soft });

  figureNote(svg, o);
  return svg;
}
