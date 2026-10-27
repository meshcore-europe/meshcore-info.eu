// Adds a copy button to code blocks in page content. Labels come from
// data-copy-label / data-copied-label on <body> so they are translated.
(function () {
  if (!navigator.clipboard) return;
  var label = document.body.getAttribute('data-copy-label');
  var done = document.body.getAttribute('data-copied-label');
  if (!label || !done) return;
  Array.prototype.forEach.call(document.querySelectorAll('.prose pre'), function (pre) {
    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.setAttribute('aria-live', 'polite');
    btn.textContent = label;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        btn.textContent = done;
        setTimeout(function () { btn.textContent = label; }, 2000);
      }, function () { /* permission denied: keep the label, the text stays selectable */ });
    });
    wrap.appendChild(btn);
  });
})();
