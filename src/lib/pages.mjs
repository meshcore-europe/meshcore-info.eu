// The content pages and their translations, from the "pages" collection (content/<lang>/<slug>.md).
import { getCollection } from 'astro:content';
import { LANG_KEYS, fileSourceHash } from './site.mjs';

// Pages this build renders in full; every other content page gets a stub until it is built.
export const PORTED = new Set(['about', 'get-started', 'contribute', 'privacy', 'repeater-guide', 'devices', 'community', 'map', 'projects', 'blog', 'guides', 'guides/settings', 'guides/cli', 'guides/keygen', 'guides/channels', 'guides/antenna', 'guides/mctomqtt', 'guides/mqtt', 'guides/filter', 'firmware', 'firmware/changelog', 'firmware/console', 'firmware/flasher', 'network', 'press-kit', 'wallpapers']);
export const isPorted = (slug) => PORTED.has(slug) || slug.startsWith('blog/');

// The news posts in a language, newest first; a language without its own posts gets the English ones,
// linked in English, as Hugo does.
export function newsFor(pages, lang) {
  const posts = (l) => pages.filter((p) => p.lang === l && p.slug.startsWith('blog/')).sort((a, b) => b.entry.data.date - a.entry.data.date);
  const own = posts(lang);
  return own.length ? own : posts('en');
}

export async function allPages() {
  const entries = await getCollection('pages');
  return entries.map((e) => {
    const [lang, ...rest] = e.id.split('/');
    const slug = rest.join('/');
    return { entry: e, lang, slug: slug.replace(/(^|\/)_?index$/, '') };
  });
}

// For a page: the languages it exists in, in site order, and its translation state.
export function translationsOf(pages, slug) {
  const here = new Set(pages.filter((p) => p.slug === slug).map((p) => p.lang));
  return LANG_KEYS.filter((l) => here.has(l));
}

export function translationState(pages, page) {
  if (page.lang === 'en') return null;
  const tr = page.entry.data.translation || {};
  const status = String(tr.status || '').toLowerCase() === 'human' ? 'human' : 'ai';
  const en = pages.find((p) => p.lang === 'en' && p.slug === page.slug);
  const stale = !!en && fileSourceHash(en.entry.filePath) !== String(tr.source_hash || '');
  return { status, stale, en: !!en };
}
