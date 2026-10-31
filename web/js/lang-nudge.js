// Two notes under the language button, each shown once, both with the same three choices: a primary button
// with the language that fits the visitor, "Or {count} other languages" (opens the language menu) and Close.
// - After the language picker chose this page's language from the browser (web/js/picker.js), say so, in
//   English, as the picker speaks.
// - Otherwise, to a visitor in the area of a regional language (data/regional_languages.yaml) who has not
//   chosen a language yet, offer this page in that language, in that language. The area comes from /where on
//   our own Worker; nothing is stored, and the note never switches the language on its own.
// The notes stay hidden without JavaScript. The language the visitor kept, or picked, stays on this device
// (localStorage site-lang), so the picker uses it next time and no note comes back.
(function () {
  function keep(lang) { try { localStorage.setItem('site-lang', lang); } catch (e) { /* storage blocked */ } }
  Array.prototype.forEach.call(document.querySelectorAll('#dmc-dd-lang a[hreflang]'), function (a) {
    a.addEventListener('click', function () { keep(a.getAttribute('hreflang')); });
  });
  var trig = document.querySelector('button[aria-controls="dmc-dd-lang"]');
  if (!trig) return;
  var here = document.documentElement.getAttribute('lang').split('-')[0];

  function show(note) {
    // Under the language button, its arrow on the button's middle (CSSOM, which the CSP allows).
    function place() {
      var r = trig.getBoundingClientRect();
      var right = Math.max(16, window.innerWidth - r.right);
      note.style.top = Math.round(r.bottom + 12) + 'px';
      note.style.right = right + 'px';
      note.style.setProperty('--arrow-right', Math.round(window.innerWidth - right - (r.left + r.width / 2) - 7) + 'px');
    }
    function close() {
      note.hidden = true;
      trig.classList.remove('lang-nudged');
      window.removeEventListener('resize', place);
    }
    // Seen once is enough: this language stays until the visitor picks another.
    keep(here);
    note.hidden = false;
    trig.classList.add('lang-nudged');
    place();
    window.addEventListener('resize', place);
    note.querySelector('[data-lang-nudge-close]').addEventListener('click', close);
    var stay = note.querySelector('[data-lang-nudge-keep]');
    if (stay) stay.addEventListener('click', close);
    var go = note.querySelector('[data-lang-nudge-go]');
    if (go) go.addEventListener('click', function () { keep(go.getAttribute('data-lang-nudge-go')); });
    note.querySelector('[data-lang-nudge-open]').addEventListener('click', function (e) {
      e.stopPropagation();   // the shell closes an open menu on any click outside it
      close();
      trig.click();
      trig.focus();
    });
    trig.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.addEventListener('click', function (e) { if (!note.contains(e.target)) close(); });
  }

  var picked = false, chosen = null;
  try {
    picked = sessionStorage.getItem('lang-picked') === '1';
    sessionStorage.removeItem('lang-picked');
    chosen = localStorage.getItem('site-lang');
  } catch (e) { return; }
  var note = document.querySelector('[data-lang-nudge]');
  if (picked && note) { show(note); return; }

  var regional = document.querySelectorAll('[data-lang-region]');
  if (chosen || !regional.length || !window.fetch) return;
  fetch('/where', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (at) {
    if (!at || !at.country) return;
    var match = Array.prototype.filter.call(regional, function (n) {
      return JSON.parse(n.getAttribute('data-lang-region')).some(function (a) {
        return a.country === at.country && (!a.region || a.region === at.region);
      });
    })[0];
    if (match) show(match);
  }).catch(function () { /* offline or blocked: no note */ });
})();
