// The Astro build, on next.meshcore-info.eu and, from the launch, on meshcore-info.eu. Only
// meshcore-info.eu itself is indexed. On any other host (next, a workers.dev or preview URL) every response
// says noindex and robots.txt disallows everything, so a test copy never shows up in search.

import { cacheFor } from './cache.js';
import { fwProxy } from './fw-proxy.js';
import { cardPath, onOrigin } from './og.js';

const NOINDEX = 'noindex, nofollow, noarchive';
const INDEXED_HOST = 'meshcore-info.eu';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const indexed = url.hostname === INDEXED_HOST;
    if (url.pathname === '/robots.txt' && !indexed) {
      return new Response('User-agent: *\nDisallow: /\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': NOINDEX, 'cache-control': 'no-store' },
      });
    }
    if (url.pathname === '/fw-proxy') return fwProxy(request);
    const card = cardPath(url.pathname, new Date());
    const asset = await env.ASSETS.fetch(card === url.pathname ? request : new Request(new URL(card, url), request));
    let response = new Response(asset.body, asset);
    if (!indexed) response.headers.set('x-robots-tag', NOINDEX);
    response.headers.set('cache-control', cacheFor(url.pathname, response.headers.get('content-type') || ''));
    if (typeof HTMLRewriter !== 'undefined' && (response.headers.get('content-type') || '').startsWith('text/html')) {
      response = new HTMLRewriter()
        .on('meta[property="og:image"], meta[name="twitter:image"]', {
          element(el) { el.setAttribute('content', onOrigin(el.getAttribute('content') || '', url.origin)); },
        })
        .transform(response);
    }
    return response;
  },
};
