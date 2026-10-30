// The radius search on /community/ (web/js/radius-core.js has the maths). Everything runs in the browser:
// the place file of the chosen country (/places/<cc>.json, our own copy of GeoNames) is fetched on the first
// search, and a position from "Use my location" never leaves the device.
import { search, lookup, ALL_OF_COUNTRY } from './radius-core.js';

const root = document.querySelector('[data-community-search]');

if (root) {
  const list = document.querySelector(root.dataset.list);
  const form = root.querySelector('[data-search-form]');
  const out = root.querySelector('[data-results]');
  const msg = (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), root.getAttribute(`data-${key}`));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const countryName = (cc) => root.getAttribute(`data-country-${cc.toLowerCase()}`) || cc;

  const cards = [...document.querySelectorAll('.community-card[data-scope]')];
  const groups = cards.map((card) => ({
    id: card.dataset.id, country: card.dataset.country, scope: card.dataset.scope, card,
    lat: Number(card.dataset.lat), lon: Number(card.dataset.lon), radiusKm: Number(card.dataset.radius),
  }));

  const files = new Map();
  const placesOf = (cc) => {
    if (!files.has(cc)) {
      files.set(cc, fetch(`/places/${cc.toLowerCase()}.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch((e) => { files.delete(cc); throw e; }));
    }
    return files.get(cc);
  };

  const say = (text, cls = 'note') => { out.hidden = false; out.replaceChildren(el('p', cls, text)); };
  const cardOf = (group, badge) => {
    const li = group.card.cloneNode(true);
    li.removeAttribute('id');
    li.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    if (badge) li.prepend(el('p', 'badge community-distance', badge));
    return li;
  };
  const section = (title, items) => {
    const s = el('section', 'community-block');
    s.append(el('h3', null, title));
    const ul = el('ul', 'card-grid');
    ul.append(...items);
    s.append(ul);
    return s;
  };
  const km = (n) => msg('search-km', { n: Math.round(n) });

  const radiusOf = (form) => (form.elements.radius.value === 'all' ? ALL_OF_COUNTRY : Number(form.elements.radius.value));

  const show = (point, label, radius, country) => {
    const r = search(point, groups, radius, country);
    const blocks = [];
    if (r.local.length) {
      blocks.push(section(msg('search-results', { place: label }), r.local.map((x) => cardOf(x.group, x.covers ? msg('search-covers') : km(x.km)))));
    } else {
      const none = el('div', 'community-none');
      none.append(el('p', null, radius === ALL_OF_COUNTRY ? msg('search-none-country', { country: countryName(country) }) : msg('search-none', { n: radius })));
      if (r.nearest) {
        none.append(el('p', null, msg('search-nearest', { n: Math.round(r.nearest.km) })));
        const ul = el('ul', 'card-grid'); ul.append(cardOf(r.nearest.group)); none.append(ul);
      }
      blocks.push(none);
    }
    if (r.national.length) blocks.push(section(msg('search-national', { country: countryName(country) }), r.national.map((g) => cardOf(g))));
    // No local group in the radius: the same "Is your group missing?" box as at the foot of the page.
    if (!r.local.length) blocks.push(root.querySelector('template[data-missing]').content.cloneNode(true));
    out.hidden = false;
    out.replaceChildren(...blocks);
  };

  // Several places with one name: a short list to pick from.
  const choose = (hits, name, radius, country) => {
    const ul = el('ul', 'tags');
    for (const h of hits) {
      const b = el('button', 'badge', h.label); b.type = 'button';
      b.addEventListener('click', () => show(h, h.label, radius, country));
      const li = el('li'); li.append(b); ul.append(li);
    }
    out.hidden = false;
    out.replaceChildren(el('p', null, msg('search-pick', { name })), ul);
  };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const country = form.elements.country.value, text = form.elements.place.value.trim();
    const radius = radiusOf(form);
    if (!country) return say(msg('search-need-country'));
    if (!text) return;
    say(msg('search-loading'));
    let places;
    try { places = await placesOf(country); } catch { return say(msg('search-error')); }
    const hits = lookup(places, text, country);
    if (!hits.length) return say(msg('search-unknown', { country: countryName(country) }));
    if (hits.length > 1) return choose(hits, text, radius, country);
    show(hits[0], hits[0].label, radius, country);
  });

  root.querySelector('[data-locate]').addEventListener('click', () => {
    const country = form.elements.country.value, radius = radiusOf(form);
    if (!country) return say(msg('search-need-country'));
    if (!navigator.geolocation) return say(msg('search-denied'));
    navigator.geolocation.getCurrentPosition(
      (pos) => show({ lat: pos.coords.latitude, lon: pos.coords.longitude }, msg('search-here'), radius, country),
      () => say(msg('search-denied')),
      { maximumAge: 600000, timeout: 15000 });
  });

  // The country select starts on the country of the browser language, when a group is listed there.
  const region = (navigator.language || '').split('-')[1];
  if (region && [...form.elements.country.options].some((o) => o.value === region.toUpperCase())) form.elements.country.value = region.toUpperCase();

  root.hidden = false;
}
