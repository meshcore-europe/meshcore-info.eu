// The country picker on /guides/settings/ (src/components/AreaSettings.astro). Picking a country, in the
// list or on the map, shows that country only: its own areas, or the EU/UK (Narrow) block under its own name. An
// anchor in the address (#area-netherlands-limburg, #area-de) picks its country, so links to an area keep working.
// Without JavaScript the form stays hidden and every country shows.
(function () {
  var form = document.querySelector('[data-area-pick]');
  if (!form) return;
  var page = form.closest('.area-settings');
  var select = form.querySelector('select');
  var eu = page.querySelector('#eu-uk');
  var title = eu.querySelector('h2');
  var anchor = title.querySelector('a.anchor');
  var anchorLabel = anchor.getAttribute('aria-label').split(':')[0];
  var body = eu.querySelector('h2 + p');
  var own = {};
  Array.prototype.forEach.call(page.querySelectorAll('section.country[id^="country-"]'), function (s) {
    own[s.id.slice(8).toUpperCase()] = s;
  });
  var links = page.querySelectorAll('.area-map a[href^="#"]');

  // The country an anchor belongs to: a country section, an area inside one, or a line of the EU/UK list.
  function countryOf(hash) {
    var el = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return '';
    var li = el.closest('.area-others li');
    if (li) return li.id.slice(5).toUpperCase();
    var s = el.closest('section.country[id^="country-"]');
    return s ? s.id.slice(8).toUpperCase() : '';
  }

  function show(cc) {
    select.value = cc;
    Object.keys(own).forEach(function (k) { own[k].hidden = k !== cc; });
    eu.hidden = !cc || !!own[cc];
    if (!eu.hidden) {
      var name = select.selectedOptions[0].textContent;
      var code = document.createElement('span');
      code.className = 'cc mono'; code.setAttribute('aria-hidden', 'true'); code.textContent = cc;
      anchor.setAttribute('href', '#area-' + cc.toLowerCase());
      anchor.setAttribute('aria-label', anchorLabel + ': ' + name);
      title.replaceChildren(code, ' ' + name + ' ', anchor);
      body.textContent = eu.getAttribute('data-one').replace('{country}', name);
    }
    Array.prototype.forEach.call(links, function (a) {
      var picked = !!cc && countryOf(a.getAttribute('href')) === cc;
      a.classList.toggle('picked', picked);
      if (picked) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  // Picking puts the country in the address, so a reload or a shared link opens on it.
  function pick(cc) {
    show(cc);
    var anchor = !cc ? '' : own[cc] ? '#' + own[cc].id : '#area-' + cc.toLowerCase();
    history.replaceState(null, '', location.pathname + location.search + anchor);
  }

  eu.querySelector('.area-others').hidden = true;
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  select.addEventListener('change', function () { pick(select.value); });
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); pick(countryOf(a.getAttribute('href'))); });
  });
  window.addEventListener('hashchange', function () { var cc = countryOf(location.hash); if (cc) show(cc); });
  form.hidden = false;

  var first = countryOf(location.hash);
  show(first);
  // An anchor without a country (#eu-uk) opens the page as without one, at the picker.
  if (!first && location.hash) { history.replaceState(null, '', location.pathname + location.search); form.scrollIntoView(); }
  // The anchor itself when it shows (an area), else its country's block (a line of the hidden EU/UK list).
  var target = first && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (first) (target && target.offsetParent ? target : own[first] || eu).scrollIntoView();
})();
