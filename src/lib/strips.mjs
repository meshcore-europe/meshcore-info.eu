// The strip at the foot of a page's hero: one measured fact about the mesh in Europe under every title,
// in the format of the live strip on the home. A live strip takes its numbers from meshcore-analyzer.eu in the
// browser (web/js/live-strip.js) and stays hidden until they load; a fixed strip is counted from data/ at build time
// and always shows. A page without an entry here has no strip.
import { readFileSync } from 'node:fs';
import { LANG_KEYS, ROOT, hasString, loadData, t } from './site.mjs';

const ANALYZER = 'https://meshcore-analyzer.eu/';
const firmware = () => JSON.parse(readFileSync(`${ROOT}web/data/firmware.json`, 'utf8'));
// The countries the channel list offers, counted as src/components/ChannelBrowser.astro builds its menu.
const channelCountries = () => Object.keys(JSON.parse(readFileSync(`${ROOT}src/data/europe-map.json`, 'utf8')).countries).filter((cc) => hasString(`country_${cc.toLowerCase()}`)).length;
const listOf = (d) => (Array.isArray(d) ? d : Object.values(d).flat());
// The newest last_checked of a data file: the day its entries were last checked live.
const checked = (rows) => rows.map((r) => String(r.last_checked || '')).filter(Boolean).map((s) => new Date(s)).sort((a, b) => b - a)[0];

// The live numbers say what they say on the home; observers as on the network page before the strip.
const LIVE_TEXT = { packets: 'home_live_packets', countries: 'home_live_countries', repeaters: 'home_live_repeaters', observers: 'net_live_observers' };
const live = (...keys) => ({ live: true, keys });
const STRIPS = {
  about: live('packets', 'countries'),
  'repeater-guide': live('repeaters'),
  'guides/antenna': live('repeaters'),
  'guides/keygen': live('repeaters'),
  'guides/mctomqtt': live('observers'),
  'guides/mqtt': live('observers'),
  'guides/filter': live('repeaters'),
  network: live('observers', 'packets', 'repeaters'),
  firmware: 'release',
  'firmware/flasher': 'release',
  'firmware/console': 'commands',
  'guides/cli': 'commands',
  'firmware/changelog': 'changelog',
  guides: 'guides',
  'guides/settings': 'settings',
  'guides/channels': 'channels',
  'get-started': 'start',
  devices: 'devices',
  map: 'maps',
  community: 'community',
  projects: 'projects',
  contribute: 'contribute',
  privacy: 'privacy',
};

// Each fixed strip: its label, its facts as [number or text, string key], and what the right side says.
function fixed(kind, lang) {
  const date = (d) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'long' }).format(d);
  const checkedOn = (d) => d && { text: `${t(lang, 'strip_checked')} ${date(d)}` };
  const fw = () => firmware();
  const groups = () => listOf(loadData('communities'));
  const release = () => ({ text: t(lang, 'strip_release_source'), href: fw().source });
  switch (kind) {
    case 'release': return { label: 'strip_label_release', items: [[fw().version, 'strip_released', date(new Date(fw().date))], [fw().boards.length, 'strip_boards']], src: release() };
    case 'commands': return { label: 'strip_label_reference', items: [[listOf(loadData('commands')).length, 'strip_commands'], [fw().version, 'strip_latest_firmware']], src: release() };
    case 'changelog': {
      const r = loadData('releases');
      return { label: 'strip_label_release', items: [[r[0].version, 'strip_released', date(new Date(r[0].date))], [r.length, 'strip_releases']], src: release() };
    }
    case 'guides': return { label: 'strip_label_guides', items: [[loadData('areas').length, 'strip_areas'], [listOf(loadData('commands')).length, 'strip_commands']] };
    case 'settings': return { label: 'strip_label_guides', items: [[loadData('areas').length, 'strip_areas'], [listOf(loadData('presets')).length, 'strip_presets']] };
    case 'channels': return { label: 'strip_label_directory', items: [[channelCountries(), 'strip_channel_countries']] };
    case 'start': return { label: 'strip_label_directory', items: [[listOf(loadData('devices')).length, 'strip_devices'], [groups().length, 'strip_groups'], [new Set(groups().map((g) => g.country)).size, 'strip_countries']] };
    case 'devices': return { label: 'strip_label_directory', items: [[listOf(loadData('devices')).length, 'strip_devices']] };
    case 'maps': return { label: 'strip_label_directory', items: [[listOf(loadData('maps')).length, 'strip_maps']] };
    case 'community': return { label: 'strip_label_directory', items: [[groups().length, 'strip_groups'], [new Set(groups().map((g) => g.country)).size, 'strip_countries']], src: checkedOn(checked(groups())) };
    case 'projects': {
      const rows = listOf(loadData('projects'));
      return { label: 'strip_label_directory', items: [[rows.length, 'strip_projects']], src: checkedOn(checked(rows)) };
    }
    case 'contribute': return { label: 'strip_label_site', items: [[LANG_KEYS.length, 'strip_languages']] };
    case 'privacy': return { label: 'strip_label_site', items: [[0, 'strip_trackers'], [0, 'strip_third_party'], [1, 'strip_cookie']] };
  }
}

export function stripFor(slug, lang) {
  const s = STRIPS[slug];
  if (!s) return null;
  if (s.live) return { live: true, label: t(lang, 'home_live_label'), keys: s.keys.map((k) => ({ key: k, text: t(lang, LIVE_TEXT[k]) })), src: { text: t(lang, 'home_live_source'), href: ANALYZER } };
  const f = fixed(s, lang);
  const num = new Intl.NumberFormat(lang);
  return {
    live: false,
    label: t(lang, f.label),
    items: f.items.map(([n, key, extra]) => ({ n: typeof n === 'number' ? num.format(n) : n, text: extra ? `${t(lang, key)} ${extra}` : t(lang, key) })),
    src: f.src || null,
  };
}
