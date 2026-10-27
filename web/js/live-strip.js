// The live numbers on the home and in the strip under a page's hero (src/lib/strips.mjs): what the mesh in Europe heard, from meshcore-analyzer.eu (first party, spec
// section 6). It reads /api/stats/pulse, which the analyzer caches for an hour: packets and countries in the
// last complete hour, and repeaters with an advert in the last 7 days (a repeater adverts about every 12 hours,
// so a shorter window would count only part of them). A [data-live-strip] block fills every [data-live] field it
// holds. It stays hidden without JavaScript, when the analyzer does not answer within 5 seconds, and when one of
// its numbers is missing.
(function () {
  var strips = document.querySelectorAll('[data-live-strip]');
  if (!strips.length || !window.fetch) return;
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
  var fmt = new Intl.NumberFormat(document.documentElement.lang || 'en');
  var fields = { packets: 'packets_1h', countries: 'countries_1h', repeaters: 'repeaters_7d', observers: 'observers_1h' };
  fetch('https://meshcore-analyzer.eu/api/stats/pulse', ctrl ? { signal: ctrl.signal } : {})
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (s) {
      clearTimeout(timer);
      Array.prototype.forEach.call(strips, function (strip) {
        var cells = strip.querySelectorAll('[data-live]');
        var ok = Array.prototype.every.call(cells, function (c) { return typeof s[fields[c.getAttribute('data-live')]] === 'number'; });
        if (!ok) return;
        Array.prototype.forEach.call(cells, function (c) { c.textContent = fmt.format(s[fields[c.getAttribute('data-live')]]); });
        strip.hidden = false;
      });
    })
    .catch(function () { /* no strip: the home works without it */ });
})();
