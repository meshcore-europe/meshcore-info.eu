// Makes the checklists in page content (Markdown task lists) checkable, such as the deployment checklist of the
// repeater guide. Clicking an item or its text ticks it; the ticks stay in this browser (localStorage, one key per
// page and list) until you untick them. Without JavaScript the boxes stay as printed, unticked.
(function () {
  var store = null;
  try { store = window.localStorage; } catch (e) { /* storage blocked: ticks last until the page closes */ }
  Array.prototype.forEach.call(document.querySelectorAll('.prose ul.contains-task-list'), function (list, n) {
    var key = 'checklist:' + location.pathname.replace(/^\/[a-z]{2}\//, '/') + ':' + n;
    var saved = [];
    try { saved = JSON.parse((store && store.getItem(key)) || '[]'); } catch (e) { saved = []; }
    var boxes = list.querySelectorAll(':scope > li > input[type="checkbox"]');
    var save = function () {
      var ticked = [];
      Array.prototype.forEach.call(boxes, function (b, i) { if (b.checked) ticked.push(i); });
      try { if (store) ticked.length ? store.setItem(key, JSON.stringify(ticked)) : store.removeItem(key); } catch (e) { /* full or blocked */ }
    };
    Array.prototype.forEach.call(boxes, function (box, i) {
      var li = box.parentNode;
      var label = document.createElement('label');
      box.disabled = false;
      box.checked = saved.indexOf(i) !== -1;
      li.insertBefore(label, box);
      while (box.nextSibling) label.appendChild(box.nextSibling);
      label.insertBefore(box, label.firstChild);
      box.addEventListener('change', save);
    });
  });
})();
