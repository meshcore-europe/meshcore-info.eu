// The home film. The hero shows the poster of the mode at once (a CSS
// background in web/css/site.css); this script adds the film once the page has loaded, so it never holds up
// the first paint. Light mode plays the morning film, dark the evening one, and it swaps when the mode
// changes. A portrait screen gets the portrait (9:16) film and poster, and it swaps on rotation, carrying the
// time over. AV1 first, H.264 as the fallback; AV1 at 720p when the long side of the window is below 1024 px
// (the H.264 files are 1080p only). The poster stays and nothing is fetched with reduced motion, Save-Data,
// or a 2G connection.
(function () {
  var video = document.querySelector('[data-hero-film]');
  if (!video || !video.canPlayType || !window.matchMedia) return;
  var root = document.documentElement;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var portrait = window.matchMedia('(orientation: portrait)');
  var conn = navigator.connection;
  // Decided once per page: the long side does not change on rotation, and a resized window keeps its file.
  var large = window.matchMedia('(min-width: 1024px), (min-height: 1024px)').matches;
  var started = false, current = null;

  function sparing() {
    return motion.matches || !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  }

  function source(src, type) {
    var s = document.createElement('source');
    s.src = src; s.type = type;
    return s;
  }

  function show() {
    if (sparing()) return;
    var mode = root.getAttribute('data-theme') === 'industrial-light' ? 'morning' : 'evening';
    var name = mode + (portrait.matches ? '-portrait' : '');
    if (name === current) return;
    // A rotation keeps the moment: both framings run on the same timeline.
    var at = current && current.split('-')[0] === mode ? video.currentTime : 0;
    current = name;
    var base = '/media/hero-' + name;
    video.poster = base + '-poster.jpg';
    while (video.firstChild) video.removeChild(video.firstChild);
    video.appendChild(large
      ? source(base + '-av1.mp4', 'video/mp4; codecs="av01.0.08M.10"')
      : source(base + '-720-av1.mp4', 'video/mp4; codecs="av01.0.05M.10"'));
    video.appendChild(source(base + '.mp4', 'video/mp4'));
    video.load();
    if (at) video.addEventListener('loadedmetadata', function () { video.currentTime = at; }, { once: true });
    if (visible) play();
  }

  // Off screen the film pauses, and it plays again when it comes back: no decoding nobody sees.
  var visible = true;
  function play() {
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!current) return;
      if (visible) play(); else video.pause();
    }).observe(video);
  }

  function start() { started = true; show(); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
  // The mode toggle and a system change both end in a new data-theme (web/shell/prefs.js).
  if (window.MutationObserver) {
    new MutationObserver(function () { if (started) show(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (portrait.addEventListener) portrait.addEventListener('change', function () { if (started) show(); });
})();
