// The radius search on /community/ (web/js/radius-core.js has the maths). Everything runs in the browser:
// the postcode file of the chosen country (/places/<cc>.json, our own copy of GeoNames) is fetched on the first
// search, and a position from "Use my location" never leaves the device.
import { search, lookup, hasPostcodes, distanceKm, ALL_OF_COUNTRY } from './radius-core.js';
import { todayIn } from './meetings-core.js';
import { refreshRow, pageLocale } from './meeting-row.js';

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

  // Meetings a group card does not show: without a group, near the point, and those a group in the results lists.
  const meetingRows = [...root.querySelector('template[data-meeting-rows]').content.querySelectorAll('ul')];
  const meetingsNear = (point, radius, country, ids) => {
    const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
    return meetingRows.flatMap((ul) => {
      const near = ul.dataset.lat ? distanceKm(point.lat, point.lon, Number(ul.dataset.lat), Number(ul.dataset.lon)) <= radius : false;
      if (!near && !ids.includes(ul.dataset.listedBy)) return [];
      const row = ul.firstElementChild.cloneNode(true);
      return refreshRow(row, JSON.parse(row.dataset.meeting), today, pageLocale()) ? [row] : [];
    });
  };
  const meetingsSection = (title, rows) => {
    const s = el('section', 'community-block');
    const ul = el('ul', 'meeting-list');
    ul.append(...rows);
    s.append(el('h3', null, title), ul);
    return s;
  };

  const show = (point, label, radius, country) => {
    const r = search(point, groups, radius, country);
    // web/js/community-map.js shows the point and how far the search reached.
    document.dispatchEvent(new CustomEvent('community:point', { detail: { lat: point.lat, lon: point.lon, km: radius, country } }));
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
    const meetings = meetingsNear(point, radius, country, r.local.map((x) => x.group.id));
    if (meetings.length) blocks.push(meetingsSection(msg('search-meetings', { place: label }), meetings));
    if (r.national.length) blocks.push(section(msg('search-national', { country: countryName(country) }), r.national.map((g) => cardOf(g))));
    // No local group in the radius: the same "Is your group missing?" box as at the foot of the page.
    if (!r.local.length) blocks.push(root.querySelector('template[data-missing]').content.cloneNode(true));
    out.hidden = false;
    out.replaceChildren(...blocks);
  };

  // A country without postcodes in GeoNames (Greece): no distance search, all its groups instead.
  const listCountry = (country) => {
    const mine = groups.filter((g) => g.country === country);
    const blocks = [el('p', null, msg('search-no-postcodes', { country: countryName(country) }))];
    if (mine.length) blocks.push(section(msg('search-national', { country: countryName(country) }), mine.map((g) => cardOf(g))));
    out.hidden = false;
    out.replaceChildren(...blocks);
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
    if (!hasPostcodes(places)) return listCountry(country);
    const hits = lookup(places, text, country);
    if (!hits.length) return say(msg('search-unknown', { country: countryName(country) }));
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

  // A dot or a country on the map (web/js/community-map.js): the same list, without a distance.
  document.addEventListener('community:groups', (ev) => {
    const { ids, country, none, title } = ev.detail;
    out.hidden = false;
    if (none) out.replaceChildren(el('p', null, title), root.querySelector('template[data-missing]').content.cloneNode(true));
    else {
      const mine = country ? groups.filter((g) => g.country === country) : ids.map((id) => groups.find((g) => g.id === id));
      out.replaceChildren(section(title.replace('{country}', country ? countryName(country) : ''), mine.map((g) => cardOf(g))));
    }
    const box = out.getBoundingClientRect();
    if (box.top > innerHeight - 80 || box.bottom < 0) out.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  // The country select starts on the country of the browser language, when a group is listed there.
  const region = (navigator.language || '').split('-')[1];
  if (region && [...form.elements.country.options].some((o) => o.value === region.toUpperCase())) form.elements.country.value = region.toUpperCase();

  root.hidden = false;
}
