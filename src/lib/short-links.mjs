// The short links: a mesh message has little room, so meshcore-info.eu/flash and /s/nl-li stand in for the long
// addresses. Each one redirects (dist/_redirects, written after the build) to the page's address without a
// language, where the language picker takes over, so the anchor and the reader's own language both survive.
// A page's name comes from data/short_links.yaml; a country is /s/<ISO code>, a part of a country /s/<short> from
// data/areas.yaml. /s/ is there because /de and /nl are the languages.
import { BASE_URL, loadData } from './site.mjs';

// The countries MeshCore's own list names for EU/UK (Narrow): the EU and the UK.
export const COVERED = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];

const SETTINGS = '/guides/settings/';
export const SHORT_ORIGIN = BASE_URL.replace(/\/$/, '');

export const countryName = (cc) => `/s/${cc.toLowerCase()}`;
export const areaName = (area) => (area.short ? `/s/${area.short}` : null);
export const pageName = (slug) => {
  const page = loadData('short_links').find((p) => p.path === slug);
  return page ? `/${page.id}` : null;
};

// Every short link: its name and where it sends the reader.
export function shortLinks() {
  const areas = loadData('areas');
  const own = new Set(areas.map((a) => a.country));
  const countries = [...new Set([...COVERED, ...own])].sort();
  return [
    ...loadData('short_links').map((p) => ({ name: `/${p.id}`, target: `/${p.path}/` })),
    ...countries.map((cc) => ({
      name: countryName(cc),
      target: `${SETTINGS}#${own.has(cc) ? 'country' : 'area'}-${cc.toLowerCase()}`,
    })),
    ...areas.filter((a) => a.short).map((a) => ({ name: areaName(a), target: `${SETTINGS}#area-${a.id}` })),
  ];
}

// A 302, so a name can point elsewhere later without browsers holding on to the old page. Every name twice:
// a path with a slash does not match the one without.
export function redirectsFile() {
  return shortLinks().flatMap((l) => [`${l.name} ${l.target} 302`, `${l.name}/ ${l.target} 302`]).join('\n') + '\n';
}
