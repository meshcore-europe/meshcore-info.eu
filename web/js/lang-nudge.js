// After the language picker chose this page's language (web/js/picker.js), say so once, in a callout that points
// at the language menu in the header, with a button that opens it. The notice stays hidden without JavaScript or
// when the visitor came here any other way.
(function () {
  var note = document.querySelector('[data-lang-nudge]');
  var trig = document.querySelector('button[aria-controls="dmc-dd-lang"]');
  if (!note || !trig) return;
  var picked = false;
  try {
    picked = sessionStorage.getItem('lang-picked') === '1';
    sessionStorage.removeItem('lang-picked');
  } catch (e) { return; }
  if (!picked) return;

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

  note.hidden = false;
  trig.classList.add('lang-nudged');
  place();
  window.addEventListener('resize', place);
  note.querySelector('[data-lang-nudge-close]').addEventListener('click', close);
  note.querySelector('[data-lang-nudge-open]').addEventListener('click', function (e) {
    e.stopPropagation();   // the shell closes an open menu on any click outside it
    close();
    trig.click();
    trig.focus();
  });
  trig.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
