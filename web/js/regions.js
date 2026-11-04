// The Regions block on /guides/settings/ (src/components/RegionTree.astro). Picking a province fills
// YOUR_PROVINCE in that area's commands (the tree's own, or those of the area's group) and points the province's
// and the town's map links at it. Typing a town fills YOUR_CITY and shows the town's line in the tree's commands.
// Only within the area, so another area keeps its own value. Picking a radio preset fills YOUR_BAND. The two
// ways of writing the commands stay out of sight without this script, which then shows the first only. A block
// without a province picker (a country whose provinces are not in the catalog, or a group's own tree without one)
// still has its town field and its two ways of writing.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-regions]'), function (block) {
    var area = block.closest('.area') || block;
    var fill = function (name, value) {
      Array.prototype.forEach.call(area.querySelectorAll('.ph[data-ph="' + name + '"]'), function (span) {
        span.textContent = value || name;
      });
    };
    var pick = block.querySelector('[data-region-pick]');
    if (pick) {
      var links = block.querySelectorAll('[data-region-link]');
      var fallback = links.length ? links[0].getAttribute('href') : '';
      pick.addEventListener('change', function () {
        var code = pick.value;
        fill('YOUR_PROVINCE', code);
        Array.prototype.forEach.call(links, function (a) {
          a.setAttribute('href', code ? block.getAttribute('data-map') + '?region=' + encodeURIComponent(code) : fallback);
        });
      });
    }
    var band = block.querySelector('[data-band-pick]');
    if (band) band.addEventListener('change', function () { fill('YOUR_BAND', band.value); });
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
    if (town) town.addEventListener('input', function () {
      var name = town.value.trim();
      fill('YOUR_CITY', name);
      Array.prototype.forEach.call(block.querySelectorAll('[data-town-line]'), function (line) {
        line.hidden = !name;
      });
    });
  });
})();
