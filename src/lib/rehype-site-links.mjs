// Links in Markdown to a site path without a language ([devices](/devices/)) resolve per language, as
// themes/fieldmap/layouts/_markup/render-link.html does: to the page in the page's own language, else to the
// English page marked hreflang="en". A path with no English page stays as written; tools/check_site.py reports it.
// Only pages the Astro build renders count (BUILT), so a link never points at a page this build lacks. A menu
// page without content yet (PLANNED) has a stub in every language, so a link to it stays in the page's language.
import { visit } from 'unist-util-visit';
import { contentFile } from './site.mjs';
import { PLANNED } from './shell.mjs';

const STUBS = new Set(PLANNED.map((p) => p.path));

export function localizeHref(href, lang, built) {
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  const u = new URL(href, 'https://x.invalid');
  const path = u.pathname.replace(/^\/+|\/+$/g, '');
  const has = (l) => contentFile(l, path) && built(l, path);
  const target = has(lang) ? lang : has('en') ? 'en' : null;
  if (!target) return STUBS.has(path) ? { href: `/${lang}/${path}/${u.search}${u.hash}`, hreflang: null } : null;
  return { href: `/${target}/${path ? path + '/' : ''}${u.search}${u.hash}`, hreflang: target !== lang ? 'en' : null };
}

// The language of the Markdown file being rendered: content/<lang>/...
function langOf(file) {
  const m = /(?:^|[\\/])content[\\/]([a-z]{2})[\\/]/.exec(String(file.path || (file.history || [])[0] || ''));
  return m ? m[1] : null;
}

export function rehypeSiteLinks(options = {}) {
  const built = options.built || (() => true);
  return (tree, file) => {
    const lang = langOf(file);
    if (!lang) return;
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a' || typeof node.properties.href !== 'string') return;
      const res = localizeHref(node.properties.href, lang, built);
      if (!res) return;
      node.properties.href = res.href;
      if (res.hreflang) node.properties.hrefLang = res.hreflang;
    });
  };
}
