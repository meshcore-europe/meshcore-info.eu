// Pages are checked on every visit, so a deploy shows at once. Fonts, styles, scripts and media may be reused:
// without that, every page loaded the fonts again and its text jumped from a system font to IBM Plex.
// Their names carry no hash, so the cache stays short: an hour for styles and scripts, a week for fonts,
// which change only with the shell.
export function cacheFor(path, type) {
  if (type.startsWith('text/html')) return 'private, no-cache';
  if (path.startsWith('/fonts/')) return 'public, max-age=604800';
  // A social card switches between its day and night picture (og.js), so it is not kept past the hour.
  if (path.startsWith('/media/og/')) return 'public, max-age=900';
  return 'public, max-age=3600';
}
