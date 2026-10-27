// After the build: static/_headers (the CSP, shared with the Hugo build and the teaser) into dist/, with one
// addition: the home's live strip may read meshcore-analyzer.eu, a domain of the organisation and so first
// party. And each language's 404 page from <lang>/404/index.html to
// <lang>/404.html, where Cloudflare looks for it. And a content hash on every stylesheet and script URL
// (/css/site.css?v=1a2b3c4d), in the pages and in the module imports, so a deploy never pairs new HTML with a
// stylesheet or script the browser still holds from before (they are cached for an hour, preview/cache.js).
// And sitemap.xml: every page with a canonical address and no noindex.
import { readFileSync, writeFileSync, renameSync, rmdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const FIRST_PARTY_CONNECT = 'https://meshcore-analyzer.eu';
export function siteHeaders(text) {
  if (!/connect-src 'self';/.test(text)) throw new Error("static/_headers: expected connect-src 'self'");
  return text.replace("connect-src 'self';", `connect-src 'self' ${FIRST_PARTY_CONNECT};`);
}
import { fileURLToPath } from 'node:url';
import { ROOT, LANG_KEYS } from './site.mjs';

const ASSET = /((?:href|src)=")(\/(?:css|js|shell)\/[^"?#]+\.(?:css|js))(")/g;
const IMPORT = /(from\s+['"])(\.\/[^'"?#]+\.js)(['"])/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Writes ?v=<8 hex of the file's SHA-256> after every local stylesheet and script URL in the pages, and after the
// relative imports of the scripts in /js/. A URL whose file is missing is left as it is (check_site reports it).
export function versionAssets(out) {
  const hashes = new Map();
  const version = (path) => {
    if (!hashes.has(path)) {
      const file = `${out}${path.replace(/^\//, '')}`;
      hashes.set(path, existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8) : null);
    }
    return hashes.get(path);
  };
  const jsDir = `${out}js`;
  if (existsSync(jsDir)) {
    for (const file of files(jsDir).filter((f) => f.endsWith('.js'))) {
      const text = readFileSync(file, 'utf8');
      const next = text.replace(IMPORT, (m, a, rel, b) => {
        const v = version(`/js/${rel.slice(2)}`);
        return v ? `${a}${rel}?v=${v}${b}` : m;
      });
      if (next !== text) writeFileSync(file, next);
    }
  }
  for (const file of files(out).filter((f) => f.endsWith('.html'))) {
    const text = readFileSync(file, 'utf8');
    const next = text.replace(ASSET, (m, a, path, b) => {
      const v = version(path);
      return v ? `${a}${path}?v=${v}${b}` : m;
    });
    if (next !== text) writeFileSync(file, next);
  }
}

const CANONICAL = /<link rel="canonical" href="([^"]+)"/;
const NOINDEX = /<meta name="robots" content="[^"]*noindex/;

// The addresses for sitemap.xml: the canonical of every page that has one and is not noindex, sorted.
export function sitemapUrls(out) {
  return files(out).filter((f) => f.endsWith('.html')).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    const m = text.match(CANONICAL);
    return m && !NOINDEX.test(text) ? [m[1]] : [];
  }).sort();
}

export function sitemap(urls) {
  const items = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function finishBuild() {
  return {
    name: 'meshcore-info:finish-build',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        writeFileSync(`${out}_headers`, siteHeaders(readFileSync(`${ROOT}static/_headers`, 'utf8')));
        for (const lang of LANG_KEYS) {
          const from = `${out}${lang}/404/index.html`;
          if (!existsSync(from)) continue;
          renameSync(from, `${out}${lang}/404.html`);
          rmdirSync(`${out}${lang}/404`);
        }
        versionAssets(out);
        writeFileSync(`${out}sitemap.xml`, sitemap(sitemapUrls(out)));
      },
    },
  };
}
