// /where: the country and first-level region Cloudflare places the request in, for the note that offers a
// regional language (web/js/lang-nudge.js). Same origin, so the CSP's connect-src 'self' allows it, and the
// pages stay cacheable. Nothing is stored or logged, and the answer is never cached.
export function where(request) {
  const cf = request.cf || {};
  const body = JSON.stringify({ country: cf.country || null, region: cf.regionCode || null });
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
