/* ============ 蜂群图（Beeswarm：原始点互不重叠地排开，分布与样本量同时可见） ============ */

import { el, text, INK, colors } from '../core/svg.js?v=20261128d';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128d';
import { niceTicks, linear } from '../core/scale.js?v=20261128d';
import { tip, tipHide } from '../core/tip.js?v=20261128d';

/*
 * data = {
 *   groups: [ { name:'甲组', values:[..原始数据..] } ],
 *   y: { label:'得分' }
 * }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const G = data.groups, cs = colors();
  const footH = o.note || o.figLabel ? 30 : 18;

  const all = G.flatMap(g => g.values);
  const Y = niceTicks(Math.min(...all), Math.max(...all) * 1.03 + .001, 5);
  const box = { x: 17, y: top + 9, w: W - 26, h: H - top - footH };
  const val = linear(Y.lo, Y.hi, box.y + box.h, box.y);
  const catStep = box.w / G.length;
  const r = Math.max(.55, Math.min(1.05, catStep / 16));

  const tk = el('g', { stroke: INK.axis, 'stroke-width': .3 }, svg);
  for (const t of Y.ticks) {
    el('line', { x1: box.x, x2: box.x + 1.2, y1: val(t), y2: val(t) }, tk);
    text(svg, box.x - 1.6, val(t) + .85, fmt(t), { size: 2.5, anchor: 'end', fill: INK.soft });
    if (t !== Y.lo) el('line', { x1: box.x, x2: box.x + box.w, y1: val(t), y2: val(t), stroke: INK.hair, 'stroke-width': .2 }, svg);
  }
  el('path', { d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}`, fill: 'none', stroke: INK.axis, 'stroke-width': .35 }, svg);
  if (data.y?.label) {
    const t = text(svg, 0, 0, data.y.label, { size: 2.9, anchor: 'middle' });
    t.setAttribute('transform', `translate(${box.x - 8.5} ${box.y + box.h / 2}) rotate(-90)`);
  }

  G.forEach((g, i) => {
    const color = g.color || cs[i % cs.length];
    const xi = box.x + (i + .5) * catStep;
    const vs = [...g.values].sort((a, b) => a - b);
    /* 贪心排布：按值从低到高，依次试探中心→两侧偏移，取第一个不重叠位置 */
    const placed = []; // [x, y] in mm
    const maxOff = catStep * .44;
    vs.forEach(v => {
      const cy = val(v);
      let chosen = null;
      for (let k = 0; k <= 40 && chosen === null; k++) {
        const offs = k === 0 ? [0] : [k * (r * 2 + .12), -k * (r * 2 + .12)];
        for (const off of offs) {
          if (Math.abs(off) > maxOff) continue;
          const cx = xi + off;
          if (placed.every(([px, py]) => (px - cx) ** 2 + (py - cy) ** 2 >= (r * 2 + .08) ** 2)) { chosen = cx; break; }
        }
      }
      if (chosen === null) chosen = xi + ((placed.length % 5) - 2) * r;
      placed.push([chosen, cy]);
      el('circle', { cx: chosen.toFixed(2), cy: cy.toFixed(2), r, fill: color, 'fill-opacity': .8 }, svg);
    });
    /* 中位数横线 */
    const med = vs[Math.floor(vs.length / 2)];
    el('line', { x1: xi - catStep * .3, x2: xi + catStep * .3, y1: val(med), y2: val(med), stroke: INK.base, 'stroke-width': .7 }, svg);
    text(svg, xi, box.y + box.h + 3.4, g.name, { size: 2.5, anchor: 'middle', fill: INK.soft });

    const hit = el('rect', { x: xi - catStep / 2, y: box.y, width: catStep, height: box.h, fill: 'transparent' }, svg);
    const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
    const msg = `<b>${g.name}</b><br>n = ${vs.length} · 中位数 ${fmt(med)} · 均值 ${fmt(+mean.toFixed(1))}`;
    hit.addEventListener('pointerenter', ev => tip(msg, ev));
    hit.addEventListener('pointermove', ev => tip(msg, ev));
    hit.addEventListener('pointerleave', tipHide);
  });

  figureNote(svg, o);
  return svg;
}
