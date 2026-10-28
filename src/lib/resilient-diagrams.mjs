// The 3 figures of the guide to a resilient mesh, drawn as inline SVG like the gain diagram (gain-diagram.mjs):
//   {{< forged-path >}}  a packet's path: the sender writes made-up IDs at its start, each repeater adds its own
//                        at the end, so the end is real and the start may not be
//   {{< dc-gate >}}      duty-cycle gating: as the repeater gets busier, messages without a region stop first,
//                        then the widest region; its own region always passes
//   {{< copies >}}       finding the source: observers hear copies of one packet, and the copy with the shortest
//                        path was heard closest to the sender
// Each one loops a short animation from web/css/site.css (.rz-*). With reduced motion it shows its last frame,
// which holds the whole point. The IDs are examples, not real nodes.
import { t } from './site.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = (k, label) => `<span><i class="key ${k}" aria-hidden="true"></i>${label}</span>`;

// The path as it grows: 3 made-up IDs from the sender, then one per repeater on the way.
const FAKE = ['5e', '90', 'c4'];
const HOPS = [{ id: 'a1', x: 170 }, { id: '3b', x: 300 }, { id: 'e0', x: 430 }];
export function forgedPath(lang) {
  const T = (k) => esc(t(lang, `rz_forged_${k}`));
  const W = 600, H = 230, Y = 62, BOX = 50, GAP = 8, BY = 150;
  const x0 = (W - 6 * BOX - 5 * GAP) / 2;
  const box = (id, i, cls) => {
    const x = x0 + i * (BOX + GAP);
    return `<g class="rz-box ${cls} rz-step-${i}"><rect x="${x}" y="${BY}" width="${BOX}" height="40" rx="6"/>` +
      `<text x="${x + BOX / 2}" y="${BY + 26}">${id}</text></g>`;
  };
  const rep = ({ id, x }, i) => `<g class="rz-rep rz-step-${i + 3}"><circle cx="${x}" cy="${Y}" r="17"/><text x="${x}" y="${Y + 6}">${id}</text></g>`;
  const hopLine = [60, ...HOPS.map((h) => h.x), 540].map((x, i) => `${i ? 'L' : 'M'}${x} ${Y}`).join('');
  return `<figure class="rz-figure rz-forged"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('label')}">` +
    `<path class="rz-route" d="${hopLine}"/>` +
    `<g class="rz-sender"><circle cx="60" cy="${Y}" r="17"/><text x="60" y="${Y + 46}">${T('sender')}</text></g>` +
    HOPS.map(rep).join('') +
    `<g class="rz-you"><circle cx="540" cy="${Y}" r="17"/><text x="540" y="${Y + 46}">${T('you')}</text></g>` +
    `<circle class="rz-packet" cx="60" cy="${Y}" r="8"/>` +
    `<text class="rz-path-label" x="${x0 - 12}" y="${BY + 26}">${T('path')}</text>` +
    FAKE.map((id, i) => box(id, i, 'rz-fake')).join('') +
    HOPS.map((h, i) => box(h.id, i + 3, 'rz-real')).join('') +
    `</svg><figcaption>${key('rz-fake', T('made_up'))}${key('rz-real', T('added'))}</figcaption></figure>`;
}

// The regions round a repeater as rings, widest outside: messages without a region, a country, a province, and the
// repeater's own region in the middle. The meter is its share of the last minute spent transmitting, with the
// threshold of 35% (dc.gate.thresh, its default).
const RINGS = [{ k: 'none', r: 118 }, { k: 'country', r: 90 }, { k: 'province', r: 62 }, { k: 'yours', r: 34 }];
export function dcGate(lang) {
  const T = (k) => esc(t(lang, `rz_gate_${k}`));
  const W = 600, H = 270, CX = 150, CY = 135, MX = 420, MY = 30, MH = 200, MW = 56;
  const ring = ({ k, r }, i) => `<circle class="rz-ring rz-ring-${i}" cx="${CX}" cy="${CY}" r="${r}"/>`;
  const label = ({ k, r }, i) => `<text class="rz-ring-label rz-ring-label-${i}" x="${CX}" y="${CY - r + (i === 3 ? 39 : 20)}">${T(k)}</text>`;
  const thresh = MY + MH * (1 - 0.35);
  return `<figure class="rz-figure rz-gate"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('label')}">` +
    RINGS.map(ring).join('') + RINGS.map(label).join('') +
    `<rect class="rz-meter" x="${MX}" y="${MY}" width="${MW}" height="${MH}" rx="6"/>` +
    `<rect class="rz-level" x="${MX}" y="${MY}" width="${MW}" height="${MH}" rx="6"/>` +
    `<line class="rz-thresh" x1="${MX - 14}" y1="${thresh}" x2="${MX + MW + 14}" y2="${thresh}"/>` +
    `<text class="rz-thresh-label" x="${MX + MW + 20}" y="${thresh + 5}">35%</text>` +
    `<text class="rz-meter-label" x="${MX + MW / 2}" y="${MY + MH + 30}">${T('meter')}</text>` +
    `</svg><figcaption><ol class="rz-steps">` +
    ['calm', 'none', 'wide'].map((s, i) => `<li class="rz-gate-step rz-gate-step-${i}">${T(`step_${s}`)}</li>`).join('') +
    `</ol></figcaption></figure>`;
}

// One packet from a sender nobody sees, through 4 repeaters; 3 observers each report the copy they heard, with its
// path. The copy with the shortest path lights up: that observer is closest to the sender.
const NODES = { s: [70, 120], a1: [180, 70], '3b': [310, 60], e0: [430, 110], '77': [540, 70] };
const OBS = [
  { at: [160, 190], from: 'a1', path: ['a1'] },
  { at: [330, 180], from: '3b', path: ['a1', '3b'] },
  { at: [520, 190], from: '77', path: ['a1', '3b', 'e0', '77'] },
];
export function copies(lang) {
  const T = (k) => esc(t(lang, `rz_copies_${k}`));
  const W = 600, H = 270;
  const line = (a, b, cls) => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  const chain = ['s', 'a1', '3b', 'e0', '77'];
  const links = chain.slice(1).map((n, i) => line(NODES[chain[i]], NODES[n], `rz-hop rz-hop-${i}`)).join('');
  const reps = chain.slice(1).map((n) => `<g class="rz-rep"><circle cx="${NODES[n][0]}" cy="${NODES[n][1]}" r="16"/><text x="${NODES[n][0]}" y="${NODES[n][1] + 6}">${n}</text></g>`).join('');
  const obs = OBS.map((o, i) => {
    const [x, y] = o.at, w = 24 + o.path.join(' ').length * 12.5; // room for the label at the phone's larger text
    return line(NODES[o.from], o.at, `rz-hear rz-copy-${i}`) +
      `<g class="rz-obs rz-copy-${i}${i === 0 ? ' rz-shortest' : ''}"><rect x="${x - 12}" y="${y - 12}" width="24" height="24" rx="3"/>` +
      `<rect class="rz-copy-path" x="${x - w / 2}" y="${y + 20}" width="${w}" height="30" rx="6"/>` +
      `<text x="${x}" y="${y + 41}">${o.path.join(' ')}</text></g>`;
  }).join('');
  return `<figure class="rz-figure rz-copies"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('label')}">` +
    links + obs + reps +
    `<g class="rz-sender rz-hidden"><circle cx="${NODES.s[0]}" cy="${NODES.s[1]}" r="17"/><text x="${NODES.s[0]}" y="${NODES.s[1] + 6}">?</text></g>` +
    `</svg><figcaption>${key('rz-rep', T('repeater'))}${key('rz-obs', T('observer'))}${key('rz-shortest', T('shortest'))}</figcaption></figure>`;
}
