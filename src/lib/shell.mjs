// The DMC shell rendered at build time (Branding shell/README.md, "Build-time rendering"): navmodel.js
// writes the header, drawer and footer into every page, so the menu works without JavaScript.
// The menu (web/shell/nav.meshcore-info.json) links to site paths without a language (/devices/); each page
// gets a copy of it with those paths in its own language, the same rule as links in the Markdown.
import { readFileSync } from 'node:fs';
import { ROOT, LANGUAGES, contentFile } from './site.mjs';
import '../../web/shell/navmodel.js';

const N = globalThis.DMCNav;
const nav = JSON.parse(readFileSync(`${ROOT}web/shell/nav.meshcore-info.json`, 'utf8'));
const trim = (href) => href.replace(/^\/+|\/+$/g, '');
const isSitePath = (href) => typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

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
  return m ? m.label[lang] || m.label.en : '';
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
  }).map((c) => ({ href: localize(c.href, lang), label: c.label[lang] || c.label.en }));
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
    page: path === null ? '' : pageOf(path), section: path === null ? '' : sectionOf(path), mode: 'live', lang,
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
