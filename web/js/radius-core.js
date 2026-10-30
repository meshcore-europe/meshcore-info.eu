// The radius search on /community/: distance, the match rule and the place lookup, as pure functions
// (tests/js/radius.test.mjs). web/js/radius.js does the page.

const EARTH_KM = 6371.0088;
const rad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km (haversine).
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// A local group shows when the search reaches its area: distance <= search radius + the group's radius.
// It "covers" the point when the point lies inside the group's own area.
export function match(point, group, searchKm) {
  const km = distanceKm(point.lat, point.lon, group.lat, group.lon);
  return { km, covers: km <= group.radiusKm, shows: km <= searchKm + group.radiusKm };
}

// groups: [{ id, country, scope, lat, lon, radiusKm }]. Local groups of every country that match, nearest
// first; the national groups of the chosen country; the nearest local group that did not match.
// searchKm = ALL_OF_COUNTRY lists every local group of the chosen country, whatever its distance.
export const ALL_OF_COUNTRY = Infinity;
export function search(point, groups, searchKm, country) {
  const local = [], outside = [];
  for (const g of groups) {
    if (g.scope === 'country') continue;
    if (searchKm === ALL_OF_COUNTRY && g.country !== country) { outside.push({ group: g, km: distanceKm(point.lat, point.lon, g.lat, g.lon), covers: false }); continue; }
    const m = match(point, g, searchKm);
    (m.shows ? local : outside).push({ group: g, km: m.km, covers: m.covers });
  }
  const byKm = (a, b) => a.km - b.km;
  local.sort(byKm); outside.sort(byKm);
  return {
    local,
    national: groups.filter((g) => g.scope === 'country' && g.country === country),
    nearest: outside[0] || null,
  };
}

export const normName = (text) => text.trim().toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[\s\-_.,']+/g, ' ').trim();
// Same keys as norm_postcode in tools/build_places.py (tests/js/postcode-parity.test.mjs compares them):
// no spaces or hyphens, upper case, and the written prefix of Luxembourg ("L-1234") and Latvia ("LV-1050") dropped.
const PREFIX = { LU: 'L', LV: 'LV' };
export function normPostcode(text, country = '') {
  let key = text.replace(/[\s-]+/g, '').toUpperCase();
  const prefix = PREFIX[country.toUpperCase()];
  if (prefix && key.startsWith(prefix) && /\d/.test(key[prefix.length] || '')) key = key.slice(prefix.length);
  return key;
}

// The place file of one country: { p: { postcode: [lat, lon, place] }, n: { name: [[lat, lon, label]] } }.
// Returns [{ lat, lon, label }]: one point for a postcode, one or more for a name, none when unknown.
// A typed postcode longer than the keys (UK "SW1A 1AA", Portuguese "1000-001") loses characters from the
// end until a key matches.
export function lookup(places, input, country = '') {
  const text = input.trim();
  if (!text) return [];
  if (/\d/.test(text)) {
    let key = normPostcode(text, country);
    while (key.length >= 2) {
      const hit = places.p[key];
      if (hit) return [{ lat: hit[0], lon: hit[1], label: hit[2] }];
      key = key.slice(0, -1);
    }
  }
  return (places.n[normName(text)] || []).map(([lat, lon, label]) => ({ lat, lon, label }));
}
