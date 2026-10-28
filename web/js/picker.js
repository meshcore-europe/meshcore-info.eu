// A path without a language (/ or /press-kit/): send the visitor to that page in the best matching language
// it exists in, and leave a note for web/js/lang-nudge.js to say so there. Runs in <head>; the language list in
// <body> is the no-JS fallback.
(function () {
  try { sessionStorage.setItem('lang-picked', '1'); } catch (e) { /* no notice then */ }
  var root = document.documentElement;
  var langs = (root.getAttribute('data-langs') || '').split(' ');
  var path = root.getAttribute('data-path') || '';
  var prefs = navigator.languages || [navigator.language || 'en'];
  for (var i = 0; i < prefs.length; i++) {
    var base = String(prefs[i] || '').toLowerCase().split('-')[0];
    if (base === 'no' || base === 'nn') base = 'nb';
    if (base && langs.indexOf(base) !== -1) { location.replace('/' + base + '/' + path + location.hash); return; }
  }
  var fallback = langs.indexOf('en') !== -1 ? 'en' : langs[0] || 'en';
  location.replace('/' + fallback + '/' + path + location.hash);
})();
