/* ============ 华夫饼图（构成占比：每格 = 总量的 1/N，适合讲份额而非精确值） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128e';
import { caption, figureNote, legend, fmt } from '../core/axis.js?v=20261128e';
import { tip, tipHide } from '../core/tip.js?v=20261128e';

/*
 * data = {
 *   parts: [ { name:'五言绝句', value:58 }, { name:'七言绝句', value:72 }, ... ]
 *     // 各部分 value 任意单位；内部按总量换算成格数（四舍五入后微调使总和 = cols×rows）
 * }
 * 文科用法：选集体裁构成、藏书部类份额、出土文献类别占比等受众面广的构成展示；
 * 结构与领域无关。每格份额 = 100/(cols×rows)%，默认 10×10 时每格恰为 1%。
 * 格数是取整结果，与精确百分比可差半格——图注中应注明，精确值见悬浮提示。
 *
 * opts（除 title/subtitle/figLabel/figTitle/note/legend 等通用项外）：
 *   cols    = 10     列数
 *   rows    = 10     行数（cols×rows 即总格数）
 *   cellGap = 0.45   格间距（mm）
 *   order   = 'given'  填充顺序：'given' 按数据顺序 | 'desc' 按份额降序
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const cols = o.cols ?? 10, rows = o.rows ?? 10, gap = o.cellGap ?? 0.45;
  const N = cols * rows;

  let parts = data.parts.map((p, i) => ({ ...p, i }));
  if (o.order === 'desc') parts = [...parts].sort((a, b) => b.value - a.value);
  const total = parts.reduce((s, p) => s + p.value, 0);
  /* 换算格数：先取整，再把差额逐个补给余数最大者，保证总和 = N */
  const raw = parts.map(p => p.value / total * N);
  const cells = raw.map(v => Math.floor(v));
  let diff = N - cells.reduce((s, v) => s + v, 0);
  const byRem = raw.map((v, i) => [v - cells[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; diff > 0; k++, diff--) cells[byRem[k % byRem.length][1]]++;
  parts.forEach((p, k) => p.cells = cells[k]);

  const box = { x: 10, y: top + 13, w: W - 20, h: H - top - 13 - footH };
  const cw = box.w / cols, ch = box.h / rows;
  let idx = 0;
  const grid = [];
  for (const p of parts) for (let k = 0; k < p.cells; k++) grid.push(p);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = grid[idx++]; if (!p) break;
    const cell = el('rect', {
      x: box.x + c * cw + gap / 2, y: box.y + (rows - 1 - r) * ch + gap / 2,
      width: cw - gap, height: ch - gap, rx: .5,
      fill: cs[p.i % cs.length], 'fill-opacity': .82, cursor: 'pointer'
    }, svg);
    const msg = `<b>${p.name}</b><br>${fmt(p.value)}（${fmt(p.value / total * 100)}%，约 ${p.cells} 格）`;
    cell.addEventListener('pointerenter', ev => tip(msg, ev));
    cell.addEventListener('pointermove', ev => tip(msg, ev));
    cell.addEventListener('pointerleave', tipHide);
  }
  text(svg, box.x, box.y + box.h + 5.4, `每格 = ${fmt(100 / N)}%`, { size: 2, fill: INK.soft });

  if (o.legend !== false)
    legend(svg, data.parts.map((p, i) => ({ type: 'rect', color: cs[i % cs.length], label: `${p.name}（${fmt(p.value / total * 100)}%）` })), { pos: 'top', x: 24, y: top + 2.5 });

  figureNote(svg, o);
  return svg;
}
