// The local groups of data/communities.yaml per language, for other sites that show a group:
// /community/groups/en.json, /community/groups/de.json. The description is in that language, else English,
// as on the community page. Meetings are not in here: each group has its calendar feed, named in "feed".
import { LANG_KEYS, BASE_URL, t, loadData, contentFile } from '../../../lib/site.mjs';
import { feedGroups, groupUrl } from '../../../lib/meetings.mjs';

export function getStaticPaths() {
  return LANG_KEYS.map((lang) => ({ params: { lang } }));
}

const link = (l) => (l.url ? { type: l.type, url: l.url } : { type: l.type, ask_at: l.ask_at });

function groupsIndex(lang) {
  const page = new URL(`/${contentFile(lang, 'community') ? lang : 'en'}/community/`, BASE_URL).href;
  return {
    v: 1,
    lang,
    groups: feedGroups().map((g) => ({
      id: g.id,
      name: g.name,
      country: g.country.toUpperCase(),
      ...(g.region ? { region: g.region } : {}),
      scope: g.scope,
      languages: g.languages ?? [],
      description: g.desc_key ? t(lang, g.desc_key) : '',
      links: (g.links ?? []).map(link),
      page: `${page}#community-${g.id}`,
      feed: groupUrl(g.id),
    })),
  };
}

export function GET({ params }) {
  return new Response(JSON.stringify(groupsIndex(params.lang)), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
