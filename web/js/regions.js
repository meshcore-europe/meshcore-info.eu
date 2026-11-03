// The Regions block on /guides/settings/ (src/components/RegionTree.astro). Picking a province fills
// YOUR_PROVINCE in that area's commands (the tree's own, or those of the area's group) and points the province's
// and the town's map links at it. Typing a town fills YOUR_CITY and shows the town's line in the tree's commands.
// Only within the area, so another area keeps its own value. Picking a radio preset fills YOUR_BAND. The two
// ways of writing the commands stay out of sight without this script, which then shows the first only.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-region-pick]'), function (pick) {
    var block = pick.closest('[data-regions]');
    var area = pick.closest('.area') || block;
    var links = block.querySelectorAll('[data-region-link]');
    var fallback = links.length ? links[0].getAttribute('href') : '';
    pick.addEventListener('change', function () {
      var code = pick.value;
      Array.prototype.forEach.call(area.querySelectorAll('.ph[data-ph="YOUR_PROVINCE"]'), function (span) {
        span.textContent = code || 'YOUR_PROVINCE';
      });
      Array.prototype.forEach.call(links, function (a) {
        a.setAttribute('href', code ? block.getAttribute('data-map') + '?region=' + encodeURIComponent(code) : fallback);
      });
    });
    var band = block.querySelector('[data-band-pick]');
    if (band) band.addEventListener('change', function () {
      Array.prototype.forEach.call(area.querySelectorAll('.ph[data-ph="YOUR_BAND"]'), function (span) {
        span.textContent = band.value || 'YOUR_BAND';
      });
    });
    var style = block.querySelector('[data-cmd-style]');
    if (style) {
      style.hidden = false;
      style.addEventListener('change', function (e) {
        Array.prototype.forEach.call(block.querySelectorAll('[data-cmd]'), function (box) {
          box.hidden = box.getAttribute('data-cmd') !== e.target.value;
        });
      });
    }
    var town = block.querySelector('[data-region-town]');
    if (!town) return;
    town.addEventListener('input', function () {
      var name = town.value.trim();
      Array.prototype.forEach.call(area.querySelectorAll('.ph[data-ph="YOUR_CITY"]'), function (span) {
        span.textContent = name || 'YOUR_CITY';
      });
      Array.prototype.forEach.call(block.querySelectorAll('[data-town-line]'), function (line) {
        line.hidden = !name;
      });
    });
  });
})();
