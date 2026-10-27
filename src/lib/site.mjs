// Site settings for the Astro build, read from the files the Hugo build and the
// tools already use, so there is one source for each: the languages, the base URL
// and the repositories from hugo.toml, the strings from data/i18n/<lang>.json.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'smol-toml';
import { parse as parseYaml } from 'yaml';

// Astro runs from the repository root, also for the prerendered pages it bundles into dist/.
export const ROOT = process.cwd().replace(/\/?$/, '/');
const config = parse(readFileSync(ROOT + 'hugo.toml', 'utf8'));

export const BASE_URL = config.baseURL;
export const PARAMS = config.params;

// In weight order, English first. locale is the lang and hreflang value.
export const LANGUAGES = Object.entries(config.languages)
  .sort(([, a], [, b]) => (a.weight ?? 0) - (b.weight ?? 0))
  .map(([key, l]) => ({ key, label: l.label, locale: l.locale ?? key }));
export const LANG_KEYS = LANGUAGES.map((l) => l.key);
export const languageOf = (key) => LANGUAGES.find((l) => l.key === key);

const strings = Object.fromEntries(LANG_KEYS.map((k) => [k, JSON.parse(readFileSync(`${ROOT}data/i18n/${k}.json`, 'utf8'))]));

// A string in a language, else English. A key English lacks fails the build, as in Hugo.
// Translated values are { value, _ai, _seeded } or plain strings (human).
export function t(lang, key) {
  const own = strings[lang]?.[key];
  const value = typeof own === 'object' && own !== null ? own.value : own;
  if (value) return value;
  const en = strings.en[key];
  if (typeof en !== 'string') throw new Error(`i18n: "${key}" is missing from data/i18n/en.json`);
  return en;
}
export const hasString = (key) => typeof strings.en[key] === 'string';
// A string in a language's own file only, else null: for a caller with a fallback of its own.
export function ownString(lang, key) {
  if (lang === 'en') return t('en', key);
  const own = strings[lang]?.[key];
  return (typeof own === 'object' && own !== null ? own.value : own) || null;
}

// The page at a site path (/repeater-guide/) in a language: its content file, or null.
export function contentFile(lang, sitePath) {
  const p = sitePath.replace(/^\/+|\/+$/g, '');
  for (const file of p ? [`${p}.md`, `${p}/_index.md`] : ['_index.md']) {
    if (existsSync(`${ROOT}content/${lang}/${file}`)) return `content/${lang}/${file}`;
  }
  return null;
}

// Go's unicode.IsSpace set, as tools/source_hash.py uses it.
const GO_SPACE = '\t\n\v\f\r \x85\xa0                　';
function goTrim(s) {
  let a = 0, b = s.length;
  while (a < b && GO_SPACE.includes(s[a])) a++;
  while (b > a && GO_SPACE.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

// Translation staleness hash of a page body, the same value as tools/source_hash.py.
export function sourceHash(body) {
  return createHash('sha256').update(goTrim(body.replace(/^\uFEFF/, '')), 'utf8').digest('hex').slice(0, 8);
}

// The hash of a content file (path relative to the repository root): its body without the YAML front matter.
export function fileSourceHash(path) {
  const text = readFileSync(ROOT + path, 'utf8').replace(/^\uFEFF/, '');
  return sourceHash(text.replace(/^---[ \t]*\r?\n[\s\S]*?^---[ \t]*(?:\r?\n|$)/m, ''));
}

// A data file from data/<name>.yaml, or an empty list when it is missing.
export function loadData(name) {
  const path = `${ROOT}data/${name}.yaml`;
  return existsSync(path) ? parseYaml(readFileSync(path, 'utf8'), { schema: 'core' }) || [] : [];
}
