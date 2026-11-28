import { makeSvg } from '/tmp/svgstub.mjs';
import fs from 'node:fs';
const idx = JSON.parse(fs.readFileSync('samples/index.json','utf8'));
const SQUARE = ['radar','circos','spiral','sunburst','treemap','waffle','ternary','recurrence','hive'];
fs.mkdirSync('gallery', { recursive: true });
const manifest = [];
for (const s of idx) {
  const sample = JSON.parse(fs.readFileSync('samples/'+s.file,'utf8'));
  const type = sample.type;
  const mod = await import('./src/charts/'+type+'.js?v=20261128e');
  const sq = SQUARE.includes(type);
  const svg = makeSvg(170, sq ? 170 : 110);
  mod.draw(svg, sample.data, sample.opts||{});
  let out = svg.serialize();
  if (/NaN|undefined/.test(out)) { console.log('BAD OUTPUT', type); process.exitCode = 1; continue; }
  const fname = type + '.svg';
  fs.writeFileSync('gallery/'+fname, out);
  manifest.push({ type, file: fname, name: s.name, fig: (sample.opts||{}).figLabel || '' });
  console.log('ok', fname, out.length);
}
fs.writeFileSync('gallery/manifest.json', JSON.stringify(manifest, null, 1));
console.log('total', manifest.length);
