/* ============ 矩阵热力图（共现矩阵 · 序列色 · 色标） ============ */

import { el, text, INK, SEQUENTIAL } from '../core/svg.js?v=20261128b';
import { caption, figureNote, fmt } from '../core/axis.js?v=20261128b';
import { tip, tipHide } from '../core/tip.js?v=20261128b';

/*
 * data = {
 *   rows: ['庄子','墨子',...], cols: [...],
 *   values: [[..],[..],...],          // 行 x 列
 *   label: '共现频次'
 * }
 * o = { seq:'sage'|'blue'|'clay', showValues, vmin, vmax }
 */
export function draw(svg, data, o = {}) {
  svg.innerHTML = '';
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const top = caption(svg, o);
  const seq = SEQUENTIAL[o.seq || 'sage'];

  const R = data.rows, C = data.cols, V = data.values;
  /* 大矩阵不展开成参数（避免调用栈上限），循环求最大值 */
  let vmax = o.vmax;
  if (vmax === undefined) {
    vmax = -Infinity;
    for (const row of V) for (const v of row) if (v > vmax) vmax = v;
  }
  const vmin = o.vmin ?? 0;
  const color = v => {
    const t = Math.min(1, Math.max(0, (v - vmin) / (vmax - vmin || 1)));
    return seq[Math.min(seq.length - 1, Math.floor(t * seq.length))];
  };

  const labW = 20;                        // 左侧行标签区
  const cbSpace = 11;                     // 右侧色标区（刻度 + 轴题）
  const footH = o.note || o.figLabel ? 26 : 16;
  const availW = W - labW - cbSpace - 8;
  const plotW = availW;
  const estW = s => [...String(s)].length * 2.5;   // 标签粗略宽度（全角估算）
  const cw0 = plotW / C.length;
  const maxColW = C.reduce((m, c) => Math.max(m, estW(c)), 0);
  /* 列标签：放得下就水平居中；放不下斜排 45° 向右上延伸（不压格子），顶部高度随之自适应 */
  const slant = maxColW > cw0 * .92;
  const topH = Math.min(24, Math.max(7, slant ? maxColW * .72 + 4 : 6));
  const plotH = H - top - topH - footH;
  const ox = labW, oy = top + topH;
  const cw = plotW / C.length, ch = plotH / R.length;

  /* 单元格 */
  R.forEach((r, i) => {
    C.forEach((c, j) => {
      const v = V[i][j];
      const rect = el('rect', {
        x: ox + j * cw, y: oy + i * ch, width: cw + .12, height: ch + .12,
        fill: color(v), stroke: '#fff', 'stroke-width': .5
      }, svg);
      if (o.showValues && cw > 7 && ch > 5) {
        const t = (v - vmin) / (vmax - vmin || 1);
        text(svg, ox + j * cw + cw / 2, oy + i * ch + ch / 2 + .95, fmt(v), {
          size: 2.1, anchor: 'middle',
          fill: t > .5 ? '#FFFFFF' : INK.base
        });
      }
      rect.addEventListener('pointerenter', ev => {
        rect.setAttribute('stroke', INK.base); rect.setAttribute('stroke-width', .7);
        tip(`<b>${r} × ${c}</b>　${fmt(v)}`, ev);
      });
      rect.addEventListener('pointermove', ev => tip(`<b>${r} × ${c}</b>　${fmt(v)}`, ev));
      rect.addEventListener('pointerleave', () => { rect.setAttribute('stroke', '#fff'); rect.setAttribute('stroke-width', .5); tipHide(); });
    });
  });

  /* 行标签（左侧，右端对齐格子） */
  R.forEach((r, i) => text(svg, ox - 1.6, oy + i * ch + ch / 2 + .9, r, { size: 2.5, anchor: 'end', fill: INK.base }));

  /* 列标签 */
  C.forEach((c, j) => {
    const cx = ox + j * cw + cw / 2;
    if (!slant) {
      text(svg, cx, oy - 2, c, { size: 2.5, anchor: 'middle', fill: INK.base });
    } else {
      const t = text(svg, 0, 0, c, { size: 2.5, anchor: 'start', fill: INK.base });
      t.setAttribute('transform', `translate(${cx - 1} ${oy - 2.2}) rotate(-45)`);
    }
  });

  /* 色标（右侧竖条：顶 = vmax，底 = vmin，刻度在外，轴题再外） */
  const cbW = 2.6, cbH = plotH * .6, cbx = W - 4.5, cby = oy + 4;
  const cbG = el('g', {}, svg);
  const n = seq.length, mid = Math.floor(n / 2);
  seq.forEach((col, k) => {
    el('rect', { x: cbx, y: cby + k * (cbH / n), width: cbW, height: cbH / n + .05, fill: col }, cbG);
  });
  const tick = (v, y) => {
    const rv = vmax - vmin >= 5 ? Math.round(v) : +v.toFixed(1);
    text(svg, cbx - 1.5, y, fmt(rv), { size: 2, anchor: 'end', fill: INK.soft });
  };
  tick(vmax, cby + 1);
  tick(vmin + (vmax - vmin) * (1 - mid / n), cby + mid * (cbH / n) + 1);
  tick(vmin, cby + cbH);
  el('rect', { x: cbx, y: cby, width: cbW, height: cbH, fill: 'none', stroke: INK.axis, 'stroke-width': .25 }, cbG);
  if (data.label) {
    const t = text(svg, 0, 0, data.label, { size: 2.2, anchor: 'middle', fill: INK.soft });
    t.setAttribute('transform', `translate(${cbx - 7} ${cby + cbH / 2}) rotate(-90)`);
  }

  figureNote(svg, o);
  return svg;
}
