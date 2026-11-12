// The search index of the site: per language, every built page with its title, address, section, lead and
// plain text, at /search/<lang>.json. Other MeshCore sites read it to find these pages from their own
// search field (the Worker allows that from any origin), so the shape stays small and stable:
// { v: 1, lang, pages: [{ t, u, s, d, x }] }.

// TEXT_MAX: the characters of plain text kept per page. A search matches words in the text; the whole
// of a long guide would make the file large for every visitor of the reading site.
export const TEXT_MAX = 4000;

// plainText: Markdown as plain text, for matching words. Shortcodes, HTML, code, link targets, heading ids
// and emphasis go; the words a reader sees stay, one space between them.
export function plainText(md) {
  return String(md || '')
    .replace(/^---[ \t]*\r?\n[\s\S]*?^---[ \t]*(?:\r?\n|$)/m, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\{\{[<%][\s\S]*?[>%]\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{#[^}]*\}/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// cut: a text cut to max characters at a word boundary.
export function cut(s, max = TEXT_MAX) {
  if (s.length <= max) return s;
  const at = s.lastIndexOf(' ', max);
  return s.slice(0, at > max / 2 ? at : max);
}

// searchIndex: the index of one language. pages are allPages() entries ({ lang, slug, entry }); a page the
// language lacks comes in English, linked in English, as the site's own links do. built(slug) says whether
// a page is built in full (stubs carry no text worth finding); section(slug, lang) names its menu.
export function searchIndex(lang, pages, { built, section }) {
  const own = new Map(pages.filter((p) => p.lang === lang).map((p) => [p.slug, p]));
  const en = pages.filter((p) => p.lang === 'en' && p.slug && built(p.slug));
  const out = [];
  for (const base of en) {
    const page = own.get(base.slug) || base;
    const d = page.entry.data || {};
    out.push({
      t: String(d.title || base.slug),
      u: `/${page.lang}/${page.slug}/`,
      s: section(page.slug, lang),
      d: String(d.lead || d.description || ''),
      x: cut(plainText(page.entry.body)),
    });
  }
  return { v: 1, lang, pages: out };
}
