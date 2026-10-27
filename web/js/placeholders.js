// Values to fill in, inside a command block: <span class="ph" data-ph="NAME" contenteditable>. The reader
// types over a value in place, and every other copy of the same value on the page follows, so the copy
// button (web/js/copy.js) copies the filled-in commands. Enter does not add a line. Clicking a value that is
// still the placeholder selects it whole, so typing replaces it instead of landing inside <minutes>.
(function () {
  var spans = document.querySelectorAll('.ph[data-ph]');
  Array.prototype.forEach.call(spans, function (span) {
    var initial = span.textContent;                      // the placeholder as written, e.g. <minutes>
    function selectAll() {
      if (span.textContent !== initial) return;
      var range = document.createRange(); range.selectNodeContents(span);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    // After the click has placed the caret, so the selection is not undone by it.
    span.addEventListener('focus', function () { setTimeout(selectAll, 0); });
    span.addEventListener('mouseup', selectAll);
    span.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
    });
    span.addEventListener('input', function () {
      var value = span.textContent.replace(/\s+/g, '');
      Array.prototype.forEach.call(document.querySelectorAll('.ph[data-ph="' + span.getAttribute('data-ph') + '"]'), function (other) {
        if (other !== span) other.textContent = value;
      });
    });
    span.addEventListener('blur', function () {
      if (!span.textContent.trim()) span.textContent = initial;
      span.dispatchEvent(new Event('input'));
    });
  });
})();
