// The street on the home (src/components/HomeTown.astro). Draws the links of the town still from
// its .json, places the labels, and sends a message hop by hop: phone to companion over Bluetooth, up to the
// repeater by radio, then on to the roofs around it. Each label lights up as the message reaches it. With reduced
// motion the links and labels show and nothing moves.
(function () {
  var stage = document.querySelector('.town-stage');
  if (!stage || !window.fetch) return;
  fetch(stage.getAttribute('data-src')).then(function (r) { return r.json(); }).then(function (d) {
    var W = d.aspect[0], H = d.aspect[1], svg = stage.querySelector('svg'), NS = 'http://www.w3.org/2000/svg';
    Object.keys(d.points).forEach(function (k) {
      var tag = stage.querySelector('.tag[data-p="' + k + '"]');
      if (!tag) return;
      tag.style.left = d.points[k][0] + '%'; tag.style.top = d.points[k][1] + '%'; tag.hidden = false;
    });
    // On a phone the frame shows part of the still, and a long label (French, Finnish) can run past its edge:
    // shift such a label back inside, 8 pixels from the edge.
    function keepInside() {
      var box = stage.getBoundingClientRect();
      Array.prototype.forEach.call(stage.querySelectorAll('.tag'), function (t) {
        t.style.marginLeft = '0px';
        var r = t.getBoundingClientRect();
        if (!r.width) return;
        var shift = Math.max(0, box.left + 8 - r.left) - Math.max(0, r.right - (box.right - 8));
        if (shift) t.style.marginLeft = shift + 'px';
      });
    }
    keepInside();
    if (document.fonts) document.fonts.ready.then(keepInside);
    window.addEventListener('resize', keepInside);
    var paths = d.links.map(function (l) {
      var el = document.createElementNS(NS, 'path');
      el.setAttribute('d', 'M' + l.pts.map(function (p) { return (p[0] * W / 100) + ' ' + (p[1] * H / 100); }).join(' L'));
      el.setAttribute('class', 'ln' + (l.kind === 'ble' ? ' ble' : ''));
      svg.appendChild(el);
      return { el: el, len: el.getTotalLength() };
    });
    // The links in the .json: 0 companion to repeater, 1 repeater to mast2, 2 mast2 to mast1, 3 repeater to mast1,
    // 4 phone to companion (Bluetooth). The route the message takes, and the label it reaches at each hop.
    var route = [[4, 'companion'], [0, 'repeater'], [1, 'mast2'], [2, null]];
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', 10); dot.setAttribute('class', 'pk'); svg.appendChild(dot);
    var hop = 1300, pause = 1600, cycle = route.length * hop + pause, last = -1;
    var tag = function (k) { return k && stage.querySelector('.tag[data-p="' + k + '"]'); };
    var lit = function (k) { var t = tag(k); if (t) t.classList.add('hit'); };
    var visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(stage);
    function frame(now) {
      if (visible) {
        var t = now % cycle, i = Math.floor(t / hop);
        if (i < route.length) {
          var f = (t % hop) / hop, e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
          var p = paths[route[i][0]], q = p.el.getPointAtLength(e * p.len);
          dot.setAttribute('cx', q.x); dot.setAttribute('cy', q.y); dot.style.opacity = 1;
          if (i !== last) {
            Array.prototype.forEach.call(stage.querySelectorAll('.tag.hit'), function (x) { x.classList.remove('hit'); });
            if (i === 0) lit('phone');
            last = i;
          }
          if (f > .92) lit(route[i][1]);
        } else { dot.style.opacity = 0; last = -1; }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }).catch(function () { /* no links: the still and the columns stay */ });
})();
