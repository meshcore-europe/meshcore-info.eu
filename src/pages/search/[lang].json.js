// The search index per language: /search/en.json, /search/nl.json (src/lib/search-index.mjs).
import { LANG_KEYS } from '../../lib/site.mjs';
import { allPages, isPorted } from '../../lib/pages.mjs';
import { sectionLabel } from '../../lib/shell.mjs';
import { searchIndex } from '../../lib/search-index.mjs';

export function getStaticPaths() {
  return LANG_KEYS.map((lang) => ({ params: { lang } }));
}

export async function GET({ params }) {
  const index = searchIndex(params.lang, await allPages(), { built: isPorted, section: sectionLabel });
  return new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
