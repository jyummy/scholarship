/* ============ 冲积图（Alluvial：类目在多个阶段之间的流动，桑基图的类目版） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128g';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128g';
import { tip, tipHide } from '../core/tip.js?v=20261128g';

/*
 * data = {
 *   stages: [ ['博士','硕士'], ['高校','机构','其他'], ... ],   // 每阶段的类目（顺序即堆叠序）
 *   stageNames: ['毕业学历','去向'],
 *   flows: [ { path:['博士','高校'], value: 120 }, ... ]          // path 长度 = 阶段数
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const ST = data.stages, FL = data.flows, cs = colors();
  const footH = o.note || o.figLabel ? 28 : 16;
  const box = { x: 12, y: top + 11, w: W - 24, h: H - top - 11 - footH };
  const nStage = ST.length;
  const colX = ST.map((_, i) => box.x + box.w * (nStage === 1 ? .5 : i / (nStage - 1)));
  const barW = Math.min(7, box.w / nStage * .22);

  /* 每阶段各类目总量与堆叠偏移 */
  const totals = ST.map((cats, si) => {
    const m = new Map(cats.map(c => [c, 0]));
    FL.forEach(f => m.set(f.path[si], (m.get(f.path[si]) || 0) + f.value));
    return m;
  });
  const grand = [...totals[0].values()].reduce((a, b) => a + b, 0) || 1;
  const scaleY = v => v / grand * (box.h - (ST[0].length - 1) * 2.5);
  const nodePos = ST.map((cats, si) => {
    const m = new Map(); let y = box.y;
    cats.forEach(c => { const h = scaleY(totals[si].get(c) || 0); m.set(c, { y, h }); y += h + 2.5; });
    return m;
  });
  /* 每条流在各阶段节点内的子偏移：预先按流顺序逐阶段累加，offsets[fi][si] */
  const offsets = FL.map(() => new Array(nStage).fill(0));
  for (let si = 0; si < nStage; si++) {
    const cur = new Map(ST[si].map(c => [c, 0]));
    FL.forEach((f, fi) => {
      offsets[fi][si] = cur.get(f.path[si]) || 0;
      cur.set(f.path[si], offsets[fi][si] + scaleY(f.value));
    });
  }

  /* 先画流带（三次贝塞尔缎带） */
  FL.forEach((f, fi) => {
    const color = cs[(ST[0].indexOf(f.path[0])) % cs.length];
    for (let si = 0; si < nStage - 1; si++) {
      const a = nodePos[si].get(f.path[si]), b = nodePos[si + 1].get(f.path[si + 1]);
      const offA = offsets[fi][si], offB = offsets[fi][si + 1];
      const hA = scaleY(f.value), hB = scaleY(f.value);
      const x0 = colX[si] + barW, x1 = colX[si + 1];
      const y0 = a.y + offA, y1 = b.y + offB;
      const mx = (x0 + x1) / 2;
      const d = `M${x0} ${y0}C${mx} ${y0},${mx} ${y1},${x1} ${y1}L${x1} ${y1 + hB}C${mx} ${y1 + hB},${mx} ${y0 + hA},${x0} ${y0 + hA}Z`;
      const p = el('path', { d, fill: color, 'fill-opacity': .38, cursor: 'pointer' }, svg);
      const msg = `<b>${f.path.join(' → ')}</b><br>流量 ${fmt(f.value)}（${(f.value / grand * 100).toFixed(1)}%）`;
      p.addEventListener('pointerenter', ev => tip(msg, ev));
      p.addEventListener('pointermove', ev => tip(msg, ev));
      p.addEventListener('pointerleave', tipHide);
    }
  });

  /* 节点块 + 标签 */
  ST.forEach((cats, si) => {
    if (data.stageNames?.[si]) text(svg, colX[si] + barW / 2, box.y - 3, data.stageNames[si], { size: 2.7, anchor: 'middle' });
    cats.forEach((c, ci) => {
      const np = nodePos[si].get(c);
      if (!np || np.h <= 0) return;
      const color = si === 0 ? cs[ci % cs.length] : cs[(ST[0].indexOf(FL.find(f => f.path[si] === c)?.path[0]) + cs.length) % cs.length] || cs[ci % cs.length];
      el('rect', { x: colX[si], y: np.y, width: barW, height: np.h, fill: color, 'fill-opacity': .9 }, svg);
      const anchor = si === 0 ? 'end' : si === nStage - 1 ? 'start' : 'middle';
      const tx = si === 0 ? colX[si] - 1.5 : si === nStage - 1 ? colX[si] + barW + 1.5 : colX[si] + barW / 2;
      text(svg, tx, np.y + np.h / 2 + .9, `${c} ${fmt(totals[si].get(c))}`, { size: 2.4, anchor, fill: INK.base, extra: { 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': .5 } });
    });
  });

  figureNote(svg, o);
  return svg;
}
