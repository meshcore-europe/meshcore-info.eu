// The two Hugo shortcodes in the content, kept as they are written so contributors and the translations
// repository keep one syntax:
//   {{< callout type="tip|warning|legal" verified="YYYY-MM-DD" >}}Markdown{{< /callout >}}
//   {{< coverage >}}   the translation table from data/coverage.json
//   {{< presets >}}    the European radio presets from data/presets.yaml
//   {{< gain >}}       the beam of a dipole and a collinear, to scale (gain-diagram.mjs)
//   {{< forged-path >}}, {{< dc-gate >}}, {{< copies >}}  the figures of the guide to a resilient mesh (resilient-diagrams.mjs)
// The same mistakes fail the build as in themes/fieldmap/layouts/_shortcodes/: positional parameters, an
// unknown type, a legal callout without verified=, a verified= that is not a date.
import { readFileSync } from 'node:fs';
import { ROOT, t, loadData } from './site.mjs';
import { gainDiagram } from './gain-diagram.mjs';
import { forgedPath, dcGate, copies } from './resilient-diagrams.mjs';

const OPEN = /^\{\{<\s*callout\b([^>]*)>\}\}[ \t]*\n?/;
const CLOSE = /\n?[ \t]*\{\{<\s*\/callout\s*>\}\}\s*$/;
const COVERAGE = /^\{\{<\s*coverage\s*>\}\}$/;
const PRESETS = /^\{\{<\s*presets\s*>\}\}$/;
const GAIN = /^\{\{<\s*gain\s*>\}\}$/;
const FIGURES = { 'forged-path': forgedPath, 'dc-gate': dcGate, copies };
const FIGURE = /^\{\{<\s*(forged-path|dc-gate|copies)\s*>\}\}$/;
const TYPES = ['tip', 'warning', 'legal'];

function langOf(file) {
  const m = /(?:^|[\\/])content[\\/]([a-z]{2})[\\/]/.exec(String(file.path || (file.history || [])[0] || ''));
  return m ? m[1] : 'en';
}

// The first or last text node of a block, through its first or last children.
function edgeText(node, last) {
  let n = node;
  while (n && n.children && n.children.length) n = n.children[last ? n.children.length - 1 : 0];
  return n && n.type === 'text' ? n : null;
}

export function parseParams(raw, where) {
  const params = {};
  let rest = raw.trim();
  while (rest) {
    // SmartyPants may have curled the quotes before this plugin runs.
    const m = /^(\w+)=["\u201c\u201d]([^"\u201c\u201d]*)["\u201c\u201d]\s*/.exec(rest);
    if (!m) throw new Error(`callout: use named parameters (type="tip") in ${where}`);
    params[m[1]] = m[2];
    rest = rest.slice(m[0].length);
  }
  const type = params.type || 'tip';
  if (!TYPES.includes(type)) throw new Error(`callout: unknown type "${type}" in ${where}`);
  if (type === 'legal' && !params.verified) throw new Error(`callout: type=legal needs verified="YYYY-MM-DD" in ${where}`);
  if (params.verified && !/^\d{4}-\d{2}-\d{2}$/.test(params.verified)) throw new Error(`callout: verified="${params.verified}" must be a date as YYYY-MM-DD in ${where}`);
  return { type, verified: params.verified || null };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function coverageTable(lang) {
  const cov = JSON.parse(readFileSync(`${ROOT}data/coverage.json`, 'utf8'));
  const T = (k) => esc(t(lang, `coverage_${k}`));
  const row = (l) => {
    const s = l.strings, p = l.pages;
    const cell = (a, b) => `<td class="num">${a} / ${b}</td>`;
    return `<tr><th scope="row" lang="${esc(l.locale)}">${esc(l.label)}</th>${cell(s.human, s.total)}${cell(s.ai, s.total)}${cell(s.missing, s.total)}` +
      `${cell(p.human, p.total)}${cell(p.ai, p.total)}${cell(p.stale, p.total)}${cell(p.missing, p.total)}</tr>`;
  };
  // The wide table scrolls inside its wrapper on phones; tabindex lets keyboard users scroll it too.
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${T('caption')}"><table class="coverage"><caption>${T('caption')}</caption>` +
    `<thead><tr><th scope="col" rowspan="2">${T('language')}</th><th scope="colgroup" colspan="3">${T('strings')}</th><th scope="colgroup" colspan="4">${T('pages')}</th></tr>` +
    `<tr><th scope="col">${T('human')}</th><th scope="col">${T('ai')}</th><th scope="col">${T('missing')}</th><th scope="col">${T('human')}</th><th scope="col">${T('ai')}</th><th scope="col">${T('stale')}</th><th scope="col">${T('missing')}</th></tr></thead>` +
    `<tbody>${cov.languages.map(row).join('')}</tbody></table></div>`;
}

export function presetsTable(lang) {
  const T = (k) => esc(t(lang, `presets_${k}`));
  // The presets an area uses; the others (other: true) are on Recommended settings only.
  const rows = loadData('presets').filter((p) => !p.other).map((p) => `<tr><th scope="row">${esc(p.name)}</th><td class="num">${esc(p.frequency)}</td><td class="num">${esc(p.bandwidth)}</td><td class="num">${p.spreading_factor}</td><td class="num">${p.coding_rate}</td></tr>`).join('');
  const checked = loadData('presets').map((p) => p.last_checked).sort().at(-1);
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${T('caption')}"><table class="presets"><caption>${T('caption')}</caption>` +
    `<thead><tr><th scope="col">${T('name')}</th><th scope="col">${T('frequency')}</th><th scope="col">${T('bandwidth')}</th><th scope="col">${T('sf')}</th><th scope="col">${T('cr')}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div><p class="meta">${T('source')} <time datetime="${checked}">${checked}</time>.</p>`;
}

export function remarkShortcodes() {
  return (tree, file) => {
    const lang = langOf(file);
    const where = String(file.path || 'a Markdown file');
    const kids = tree.children;
    for (let i = 0; i < kids.length; i++) {
      const first = edgeText(kids[i], false);
      if (kids[i].type === 'paragraph' && first && COVERAGE.test(first.value.trim()) && kids[i].children.length === 1) {
        kids[i] = { type: 'html', value: coverageTable(lang) };
        continue;
      }
      if (kids[i].type === 'paragraph' && first && PRESETS.test(first.value.trim()) && kids[i].children.length === 1) {
        kids[i] = { type: 'html', value: presetsTable(lang) };
        continue;
      }
      if (kids[i].type === 'paragraph' && first && GAIN.test(first.value.trim()) && kids[i].children.length === 1) {
        kids[i] = { type: 'html', value: gainDiagram(lang) };
        continue;
      }
      if (kids[i].type === 'paragraph' && first && FIGURE.test(first.value.trim()) && kids[i].children.length === 1) {
        kids[i] = { type: 'html', value: FIGURES[FIGURE.exec(first.value.trim())[1]](lang) };
        continue;
      }
      if (kids[i].type !== 'paragraph' || !first) continue;
      const open = OPEN.exec(first.value);
      if (!open) continue;
      const { type, verified } = parseParams(open[1], where);
      first.value = first.value.slice(open[0].length);
      let j = i;
      for (; j < kids.length; j++) {
        const last = edgeText(kids[j], true);
        if (last && CLOSE.test(last.value)) { last.value = last.value.replace(CLOSE, ''); break; }
      }
      if (j === kids.length) throw new Error(`callout: no {{< /callout >}} in ${where}`);
      const inner = kids.slice(i, j + 1).filter((n) => !(n.type === 'paragraph' && n.children.every((c) => c.type === 'text' && !c.value.trim())));
      const title = { type: 'paragraph', data: { hProperties: { className: ['callout-title'] } }, children: [{ type: 'text', value: t(lang, `callout_${type}`) }] };
      const meta = verified ? [{ type: 'paragraph', data: { hProperties: { className: ['meta'] } }, children: [
        { type: 'text', value: `${t(lang, 'last_verified')}: ` },
        { type: 'time', data: { hName: 'time', hProperties: { dateTime: verified } }, children: [{ type: 'text', value: verified }] },
      ] }] : [];
      const aside = { type: 'callout', data: { hName: 'aside', hProperties: { className: ['callout', `callout-${type}`], role: 'note' } }, children: [title, ...inner, ...meta] };
      kids.splice(i, j - i + 1, aside);
    }
  };
}
