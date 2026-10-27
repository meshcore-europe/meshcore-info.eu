// Generic card filter. <form data-filter-for="LIST_ID"> with <select
// name="X"> elements (values must not contain spaces): an item matches
// when its data-X (whitespace-separated) contains the selected value. Empty
// value means "any". An <input type="search"> matches when every word typed
// is in the item's data-text. The items are the list's children, or, when
// the list holds [data-filter-item] elements, those; a [data-filter-group]
// inside the list hides when none of its items match. The reset button shows
// once a filter is set; an empty result offers the same reset.
(function () {
  var forms = document.querySelectorAll('form[data-filter-for]');
  Array.prototype.forEach.call(forms, function (form) {
    var listId = form.getAttribute('data-filter-for');
    var list = document.getElementById(listId);
    if (!list) return;
    var marked = list.querySelectorAll('[data-filter-item]');
    var items = Array.prototype.slice.call(marked.length ? marked : list.children);
    var groups = list.querySelectorAll('[data-filter-group]');
    var count = form.querySelector('[data-count-template]');
    var empty = document.querySelector('[data-filter-empty="' + listId + '"]');
    var reset = form.querySelector('button[type="reset"]');
    function matches(item) {
      return Array.prototype.every.call(form.elements, function (el) {
        if (el.type === 'search') {
          var text = item.getAttribute('data-text') || '';
          return el.value.toLowerCase().split(/\s+/).every(function (w) { return text.indexOf(w) !== -1; });
        }
        if (el.tagName !== 'SELECT' || !el.name || !el.value) return true;
        var have = (item.getAttribute('data-' + el.name) || '').split(/\s+/);
        return have.indexOf(el.value) !== -1;
      });
    }
    function apply() {
      var shown = 0;
      items.forEach(function (item) {
        var ok = matches(item);
        item.hidden = !ok;
        if (ok) shown++;
      });
      Array.prototype.forEach.call(groups, function (g) {
        g.hidden = !g.querySelector('[data-filter-item]:not([hidden])');
      });
      if (count) {
        count.textContent = count.getAttribute('data-count-template')
          .replace('{shown}', shown).replace('{total}', items.length);
      }
      if (empty) empty.hidden = shown !== 0;
      if (reset) reset.hidden = !Array.prototype.some.call(form.elements, function (el) {
        return (el.tagName === 'SELECT' || el.type === 'search') && el.value;
      });
    }
    form.addEventListener('change', apply);
    form.addEventListener('input', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.addEventListener('reset', function () { setTimeout(apply, 0); });
    var clear = empty && empty.querySelector('[data-filter-clear]');
    if (clear) clear.addEventListener('click', function () { form.reset(); });
    form.hidden = false;
    apply();
  });
})();
