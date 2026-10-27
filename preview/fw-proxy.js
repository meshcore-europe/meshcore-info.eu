// /fw-proxy?url=...: passes a MeshCore release download to the flasher on this site. GitHub sends
// no CORS headers on release downloads, so the browser cannot fetch them itself. Only release assets of
// meshcore-dev/MeshCore pass; this is not an open proxy. GET only, no cookies, cached for a day.

export const ALLOWED = /^https:\/\/github\.com\/meshcore-dev\/MeshCore\/releases\/download\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.(bin|uf2|zip)$/;

export async function fwProxy(request, fetcher = fetch) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET' } });
  const target = new URL(request.url).searchParams.get('url') || '';
  if (!ALLOWED.test(target)) return new Response('Not an allowed firmware file', { status: 400 });
  const upstream = await fetcher(target, { redirect: 'follow', headers: { 'user-agent': 'meshcore-info.eu flasher' }, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!upstream.ok) return new Response('Firmware file not found', { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers({ 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex' });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('content-length', length);
  return new Response(upstream.body, { status: 200, headers });
}
