// The DMC shell rendered at build time (Branding shell/README.md, "Build-time rendering"): navmodel.js
// writes the header, drawer and footer into every page, so the menu works without JavaScript.
// The menu (web/shell/nav.meshcore-info.json) links to site paths without a language (/devices/); each page
// gets a copy of it with those paths in its own language, the same rule as links in the Markdown.
import { readFileSync } from 'node:fs';
import { ROOT, LANGUAGES, contentFile, t, ownString } from './site.mjs';
import '../../web/shell/navmodel.js';

const N = globalThis.DMCNav;
const nav = JSON.parse(readFileSync(`${ROOT}web/shell/nav.meshcore-info.json`, 'utf8'));
const trim = (href) => href.replace(/^\/+|\/+$/g, '');
const isSitePath = (href) => typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

// Every menu text gets a key in data/i18n (menu_*), so it is translated like any other string. The menu
// itself only has NL, EN and DE. English in en.json must match the menu's English, so a change in Branding
// fails the build until en.json follows; a text without a key fails it too.
const keyOf = (id) => `menu_${id.replace(/-/g, '_')}`;
function keyMenu() {
  const set = (label, key) => { if (label) label.key = key; };
  const item = (i) => { set(i.label, keyOf(i.id)); set(i.sub, `${keyOf(i.id)}_sub`); };
  item(nav.disclaimer);
  (nav.extra || []).forEach(item);
  for (const m of nav.primary) {
    const k = keyOf(m.id);
    item(m);
    (m.children || []).forEach(item);
    (m.groups || []).forEach((g, i) => { set(g.title, `${k}_group_${i + 1}`); set(g.all, `${k}_group_${i + 1}_all`); });
    if (m.card) {
      for (const f of ['eyebrow', 'title', 'body']) set(m.card[f], `${k}_card_${f}`);
      if (typeof m.card.primary === 'object') set(m.card.primary.label, `${k}_card_button`);
    }
  }
  (nav.footer || []).forEach((c, i) => set(c.title, `menu_footer_${i + 1}`));
  (nav.footerNote || []).forEach((l, i) => set(l, `menu_footer_note_${i + 1}`));
  const check = (o, where) => {
    if (Array.isArray(o)) return o.forEach((x, i) => check(x, `${where}[${i}]`));
    if (!o || typeof o !== 'object') return;
    if (typeof o.en !== 'string') return Object.entries(o).forEach(([f, v]) => check(v, `${where}.${f}`));
    if (!o.key) throw new Error(`menu: ${where} ("${o.en}") has no data/i18n key; add it in keyMenu()`);
    if (t('en', o.key) !== o.en) throw new Error(`menu: data/i18n/en.json "${o.key}" is "${t('en', o.key)}", the menu says "${o.en}"`);
  };
  check(nav, 'nav');
}
keyMenu();

// A menu text in a language: its translation in data/i18n, else the menu's own text, else English.
export const menuText = (label, lang) => (label.key && ownString(lang, label.key)) || label[lang] || label.en;

// Every menu item with a site path, from the menus, their cards and the footer.
function menuItems() {
  const out = [nav.brand, nav.disclaimer];
  for (const p of nav.primary) {
    out.push(p, ...(p.children || []));
    if (p.card && typeof p.card.primary === 'object') out.push(p.card.primary);
  }
  return out.filter((i) => i && isSitePath(i.href));
}

// Menu paths no content file covers yet (the firmware, guide and network pages come in later plans). The build
// gives each a stub in every language, so the menu never links to a missing page.
export const PLANNED = [...new Set(menuItems().map((i) => trim(i.href)).filter((p) => !contentFile('en', p)))]
  .map((path) => ({ path, label: menuItems().find((i) => trim(i.href) === path).label }));

// The page in a language: its own content, else English, else the stub in this language.
export function localize(href, lang) {
  const path = trim(href);
  const target = contentFile(lang, path) ? lang : contentFile('en', path) ? 'en' : lang;
  return `/${target}/${path ? path + '/' : ''}`;
}

function navFor(lang) {
  const copy = JSON.parse(JSON.stringify(nav));
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (isSitePath(o.href)) o.href = localize(o.href, lang);
    Object.values(o).forEach(walk);
  };
  walk(copy);
  return copy;
}
const navs = Object.fromEntries(LANGUAGES.map((l) => [l.key, navFor(l.key)]));

// The menu a page belongs to, for aria-current on its section. A page under a menu page (a news post under
// /blog/) belongs to that page's menu.
function menuOf(path) {
  const owns = (m, p) => trim(m.href) === p || (m.children || []).some((c) => trim(c.href) === p);
  for (let p = path; p; p = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '') {
    const m = nav.primary.find((x) => owns(x, p));
    if (m) return m;
  }
  return null;
}
export function sectionOf(path) {
  const m = menuOf(path);
  return m ? m.id : '';
}
// The name of a page's menu in a language (English where the menu has none), for the eyebrow over its title.
export function sectionLabel(path, lang) {
  const m = menuOf(path);
  return m ? menuText(m.label, lang) : '';
}
// The other pages of a page's menu that exist, for a page that is planned but not built yet.
export function siblingsOf(path, lang) {
  const m = menuOf(path);
  if (!m) return [];
  const seen = new Set([path]);
  const built = (m.children || []).filter((c) => contentFile('en', trim(c.href)));
  // A menu with nothing built yet points to the Start menu, where Get started covers flashing.
  const from = built.length ? m.children : (nav.primary.find((x) => x.id === 'start') || {}).children || [];
  return from.filter((c) => {
    const p = trim(c.href);
    if (seen.has(p) || !contentFile('en', p)) return false;
    seen.add(p);
    return true;
  }).map((c) => ({ href: localize(c.href, lang), label: menuText(c.label, lang) }));
}
// A menu entry under a heading wins over the menu's own overview link to the same page.
const pageOf = (path) => {
  const hits = menuItems().filter((i) => trim(i.href) === path);
  const child = hits.find((i) => !nav.primary.includes(i));
  return ((child || hits[0]) || {}).page || '';
};

// ctx for one page. alternates: [{ lang, href }] for every language the page exists in.
function ctxFor({ lang, path = null, alternates }) {
  const names = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]));
  return {
    page: path === null ? '' : pageOf(path), section: path === null ? '' : sectionOf(path), mode: 'live', lang, t: (key) => ownString(lang, key),
    alternates: alternates.map((a) => ({ lang: a.lang, name: names[a.lang], href: a.href })),
  };
}

export function shellTop(opts) {
  const ctx = ctxFor(opts);
  return N.headerHTML(navs[opts.lang], ctx) + N.appRowHTML(navs[opts.lang], ctx) + N.drawerHTML(navs[opts.lang], ctx);
}

export function shellBottom(opts) {
  return N.footerHTML(navs[opts.lang], ctxFor(opts));
}
