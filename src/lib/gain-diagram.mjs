// {{< gain >}}: the beam of the 2 antennas in the gain table of the antenna guide, cut through the mast and seen from
// the side, to scale. Each beam is a power pattern cos^n of the angle above the horizon, with n set so the pattern is
// at half power at half the vertical beamwidth from the datasheet. The radius is the reach, which in free space grows
// with the square root of gain times pattern. Both sides of the mast are drawn, so the dipole shows as the 2 lobes of
// its doughnut and the collinear as its flat disc. The antenna stands on a hill; the ground hides what goes into it.
// 2 nodes show the point of the text: one in the valley steep below, one on a far hill along the horizon.
import { t } from './site.mjs';

const ANTENNAS = [
  { key: 'dipole', gain: 2.2, beamwidth: 88 },
  { key: 'collinear', gain: 5.8, beamwidth: 23 },
];
const SCALE = 185; // px per unit of reach; the collinear reaches 1.95 to each side
const W = 760, H = 280, X0 = W / 2, Y0 = 132;
const FLOOR = Y0 + 97; // the valley floor, where the node below stands
const NODES = [
  { key: 'below', angle: -150, reach: 0.967 },
  { key: 'far', angle: 0, reach: 1.68 },
];
// The valley left of the hill under the antenna, the valley right of it and the far hill, ending below the frame.
const SURFACE = `M0 ${Y0 + 56}L130 ${FLOOR}L300 ${FLOOR}L${X0 - 16} ${Y0 + 14}L${X0 + 16} ${Y0 + 14}` +
  `L460 ${FLOOR}L610 ${FLOOR}L691 ${Y0 + 7}L${W} ${Y0 + 20}`;
const rad = (deg) => (deg * Math.PI) / 180;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const xy = (angle, reach) => [X0 + reach * SCALE * Math.cos(rad(angle)), Y0 - reach * SCALE * Math.sin(rad(angle))];
const pt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

export function reach({ gain, beamwidth }, angle) {
  const n = Math.log(0.5) / Math.log(Math.cos(rad(beamwidth / 2)));
  return Math.sqrt(10 ** (gain / 10) * Math.abs(Math.cos(rad(angle))) ** n);
}

// One lobe to each side; each closes at the antenna, straight above and below it.
function beam(antenna) {
  const lobe = (from) => { const points = []; for (let a = from; a <= from + 180; a += 0.5) points.push(pt(xy(a, reach(antenna, a)))); return `M${points.join('L')}Z`; };
  return `<path class="beam beam-${antenna.key}" d="${lobe(-90)}${lobe(90)}"/>`;
}

export function gainDiagram(lang) {
  const T = (k) => esc(t(lang, `gain_${k}`));
  const node = ({ key, angle, reach: r }) => { const [x, y] = xy(angle, r); return `<circle class="node node-${key}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/>`; };
  const key = (k, label) => `<span><i class="key ${k}" aria-hidden="true"></i>${label}</span>`;
  const label = ({ key: k, gain, beamwidth }) => `${T(k)}, ${gain} dBi, ${beamwidth}°`;
  return `<figure class="gain-diagram"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('label')}">` +
    `<line class="horizon" x1="0" y1="${Y0}" x2="${W}" y2="${Y0}"/>` +
    ANTENNAS.map(beam).join('') +
    `<path class="ground" d="${SURFACE}L${W} ${H}L0 ${H}Z"/><path class="surface" d="${SURFACE}"/>` +
    `<line class="antenna" x1="${X0}" y1="${Y0 - 12}" x2="${X0}" y2="${Y0 + 14}"/>` +
    NODES.map(node).join('') +
    `</svg><figcaption>${ANTENNAS.map((a) => key(`beam-${a.key}`, label(a))).join('')}${key('node', T('node'))}</figcaption></figure>`;
}
