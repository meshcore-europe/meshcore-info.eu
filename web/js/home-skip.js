// The home opens on its film once per visit. Opening the home again in the same session (in practice from another
// page of the site; the site sends no referrer to check), it opens at its content instead, under the film; the back button, a reload and a link with an #anchor
// keep their own position. Without storage it always shows the film. Loaded right after the content starts, so the
// jump happens before the first paint.
(function () {
  var KEY = 'mci-home-seen', seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1'); } catch (e) { return; }
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!seen || location.hash || (nav && nav.type !== 'navigate')) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var content = document.getElementById('content-start');
  if (!content) return;
  var moved = false;
  var go = function () { if (!moved) content.scrollIntoView({ block: 'start' }); };
  go();
  // The layout still moves after this (the deferred shell scripts, fonts, the film's poster), so place the page
  // again when the document and when everything has loaded, unless the reader has scrolled, touched or typed.
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) {
    window.addEventListener(e, function () { moved = true; }, { once: true, passive: true });
  });
  document.addEventListener('DOMContentLoaded', go);
  window.addEventListener('load', go);
})();
