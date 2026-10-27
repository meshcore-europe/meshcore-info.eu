// The channels guide (/guides/channels/): lists the channels the MeshCore Analyzer heard in the chosen
// country (GET /api/channels?country=XX), and computes the key of any #name. Only the country code leaves the
// browser; the key of a typed name is computed here. The list shows the first 50; a button shows the rest.
import { keyFor, isHashtag, openChannels, matches } from './channels-core.js';

const API = 'https://meshcore-analyzer.eu/api/channels';
const root = document.querySelector('[data-channels]');

if (root) {
  const $ = (sel) => root.querySelector(sel);
  const lang = document.documentElement.lang || 'en';
  const msg = (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), root.getAttribute(`data-${key}`));
  const copyLabel = document.body.getAttribute('data-copy-label');
  const copiedLabel = document.body.getAttribute('data-copied-label');
  const rel = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const ago = (iso) => {
    const s = (Date.parse(iso) - Date.now()) / 1000;
    for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= size) return rel.format(Math.round(s / size), unit);
    return rel.format(Math.round(s), 'second');
  };
  const copyButton = (text) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'copy-btn ch-copy'; b.textContent = copyLabel;
    b.addEventListener('click', () => navigator.clipboard.writeText(text).then(() => {
      b.textContent = copiedLabel; setTimeout(() => { b.textContent = copyLabel; }, 2000);
    }, () => {}));
    return b;
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  const form = $('[data-list-form]'), country = $('select[name="country"]'), search = $('input[name="q"]');
  const status = $('[data-status]'), list = $('[data-list]'), more = $('[data-more]');
  const FIRST = 50;
  let channels = [], all = false;

  const render = () => {
    const shown = channels.filter((c) => matches(c, search.value.trim()));
    list.replaceChildren(...shown.slice(0, all ? shown.length : FIRST).map((c) => {
      const li = el('li', 'ch');
      const head = el('p', 'ch-head');
      head.append(el('strong', 'mono', c.name), ' ', el('span', 'muted', `${c.messageCount.toLocaleString(lang)} ${msg('messages')} · ${ago(c.lastActivity)}`));
      li.append(head);
      if (c.scopes && c.scopes.length) {
        const tags = el('ul', 'tags');
        c.scopes.slice(0, 6).forEach((s) => tags.append(el('li', 'badge mono', s)));
        li.append(tags);
      }
      const key = el('p', 'ch-key');
      key.append(el('span', 'muted', `${msg('key')} `), el('code', null, c.secretHex), ' ', copyButton(c.secretHex));
      li.append(key);
      return li;
    }));
    more.hidden = all || shown.length <= FIRST;
    more.firstElementChild.textContent = msg('show-all', { n: shown.length.toLocaleString(lang) });
    status.textContent = msg(shown.length === 1 ? 'count-one' : 'count', { n: shown.length.toLocaleString(lang), country: country.selectedOptions[0].textContent });
  };

  const load = async () => {
    all = false;
    if (!country.value) { channels = []; list.replaceChildren(); more.hidden = true; status.textContent = ''; return; }
    status.textContent = msg('loading');
    try {
      const r = await fetch(`${API}?country=${encodeURIComponent(country.value)}`, { credentials: 'omit' });
      if (!r.ok) throw new Error(String(r.status));
      channels = openChannels((await r.json()).channels || []);
      render();
    } catch {
      channels = []; list.replaceChildren(); more.hidden = true; status.textContent = msg('error');
    }
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  country.addEventListener('change', load);
  search.addEventListener('input', render);
  more.firstElementChild.addEventListener('click', () => { all = true; render(); });
  form.hidden = false;

  // The key of any #name, computed here.
  const calc = $('[data-calc]'), name = $('input[name="name"]'), out = $('[data-calc-out]');
  calc.addEventListener('submit', (e) => e.preventDefault());
  name.addEventListener('input', async () => {
    let n = name.value.trim();
    if (n && !n.startsWith('#')) n = `#${n}`;
    if (!isHashtag(n)) { out.replaceChildren(); return; }
    const k = await keyFor(crypto.subtle, n);
    out.replaceChildren(el('code', null, k), ' ', copyButton(k));
  });
  calc.hidden = false;
  $('[data-needs-js]').hidden = true;
}
