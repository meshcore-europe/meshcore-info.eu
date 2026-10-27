// Root page: send the visitor to the best matching language. Runs in
// <head>; the language list in <body> is the no-JS fallback.
(function () {
  var langs = (document.documentElement.getAttribute('data-langs') || '').split(' ');
  var prefs = navigator.languages || [navigator.language || 'en'];
  for (var i = 0; i < prefs.length; i++) {
    var base = String(prefs[i] || '').toLowerCase().split('-')[0];
    if (base === 'no' || base === 'nn') base = 'nb';
    if (base && langs.indexOf(base) !== -1) { location.replace('/' + base + '/'); return; }
  }
  location.replace('/en/');
})();
