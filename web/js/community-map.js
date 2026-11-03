// The map on /community/: zoom and pan by changing the viewBox, with wheel, pinch, drag, buttons and keys. A click on
// a dot or a country fills the result list through web/js/radius.js. Everything stays in the browser.
import { project, kmToUnits, clampView, viewBox, zoomAt, fitBox, dotsNear } from './map-view.js';

const root = document.querySelector('[data-community-map]');

if (root) {
  const svg = root.querySelector('svg');
  const W = Number(root.dataset.width), H = Number(root.dataset.height);
  const NS = 'http://www.w3.org/2000/svg';
  const buttons = { in: root.querySelector('[data-zoom-in]'), out: root.querySelector('[data-zoom-out]'), reset: root.querySelector('[data-zoom-reset]') };
  const towns = root.querySelector('[data-detail-towns]');
  const reachEl = root.querySelector('[data-reach]'), pointEl = root.querySelector('[data-point]');
  const dots = [...root.querySelectorAll('[data-group]')].map((a) => ({
    a, id: a.dataset.group, x: Number(a.dataset.x), y: Number(a.dataset.y), circle: a.querySelector('circle'),
    atX: Number(a.dataset.x), atY: Number(a.dataset.y), ox: Number(a.dataset.ox || 0), oy: Number(a.dataset.oy || 0),
  }));
  const SEARCH_ZOOM = 7;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let view = { x: W / 2, y: H / 2, z: 1 };
  let tiers = [];
  let tween = 0;

  // Screen pixels per map unit at this zoom.
  const pxPerUnit = () => (svg.getBoundingClientRect().width / W) * view.z;

  const draw = () => {
    svg.setAttribute('viewBox', viewBox(view, W, H).map((n) => n.toFixed(2)).join(' '));
    const px = pxPerUnit();
    const size = Math.min(7, 4 + view.z / 2);
    for (const d of dots) {
      d.circle.setAttribute('r', (size / px).toFixed(2));
      // Open dots of one country stay apart on screen, whatever the zoom.
      if (!d.ox && !d.oy) continue;
      d.x = d.atX + (d.ox * size * 1.6) / px; d.y = d.atY + (d.oy * size * 1.6) / px;
      d.circle.setAttribute('cx', d.x.toFixed(2)); d.circle.setAttribute('cy', d.y.toFixed(2));
    }
    pointEl.setAttribute('r', (7 / px).toFixed(2));
    towns.setAttribute('font-size', (12 / px).toFixed(2));
    for (const g of towns.children) {
      const shown = view.z >= tiers[Number(g.dataset.tier)];
      if (shown) for (const c of g.querySelectorAll('circle')) c.setAttribute('r', (2.5 / px).toFixed(2));
      if (shown) for (const t of g.querySelectorAll('text')) t.setAttribute('dx', (6 / px).toFixed(2));
      g.toggleAttribute('hidden', !shown);
    }
    root.classList.toggle('is-zoomed', view.z > 1);
    buttons.in.disabled = view.z >= 12;
    buttons.out.disabled = view.z <= 1;
    buttons.reset.hidden = view.z <= 1;
    if (view.z >= 1.5) loadDetail();
  };
  const setView = (v) => { cancelAnimationFrame(tween); view = clampView(v, W, H); draw(); };
  // A jump glides, so the visitor sees where it goes; with reduced motion it just lands.
  const glideTo = (target) => {
    cancelAnimationFrame(tween);
    const to = clampView(target, W, H), from = view;
    if (reduced.matches) return setView(to);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 250), e = p * (2 - p);
      view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z * (to.z / from.z) ** e };
      draw();
      if (p < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  };

  // The finer outlines, region borders and towns arrive on the first zoom. If they do not, the map keeps working.
  let detail = null;
  const loadDetail = () => {
    if (detail) return;
    detail = fetch(root.dataset.detail).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((data) => {
      const fine = root.querySelector('[data-detail-countries]');
      for (const [cc, d] of Object.entries(data.countries)) {
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d);
        if (root.querySelector(`[data-country="${cc}"]`)) p.classList.add('has-groups');
        fine.append(p);
      }
      root.querySelector('[data-detail-regions]').setAttribute('d', data.regions);
      tiers = data.tiers;
      const groups = tiers.map((_, i) => { const g = document.createElementNS(NS, 'g'); g.dataset.tier = i; towns.append(g); return g; });
      for (const [x, y, name, tier] of data.towns) {
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y);
        const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('dy', '0.35em'); t.textContent = name;
        groups[tier].append(c, t);
      }
      svg.classList.add('has-detail');
      draw();
    }).catch(() => { detail = null; });
  };

  const toMap = (ev) => {
    const r = svg.getBoundingClientRect(), [x, y, w, h] = viewBox(view, W, H);
    // The SVG keeps its aspect ratio inside its box, so the two scales are the same.
    return { x: x + ((ev.clientX - r.left) / r.width) * w, y: y + ((ev.clientY - r.top) / r.height) * h };
  };
  const zoomBy = (factor, at = { x: view.x, y: view.y }) => { cancelAnimationFrame(tween); view = zoomAt(view, at.x, at.y, factor, W, H); draw(); };
  const tell = (name, detailData) => root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detailData }));
  const pick = (ids) => { for (const d of dots) d.a.classList.toggle('picked', ids.includes(d.id)); };

  const showDots = (hits) => { pick(hits.map((d) => d.id)); tell('community:groups', { ids: hits.map((d) => d.id), title: root.dataset.here }); };
  const showCountry = (a) => {
    pick([]);
    const box = a.dataset.box.split(' ').map(Number), target = fitBox(box, W, H);
    if (target.z > view.z) glideTo(target);
    tell('community:groups', { country: a.dataset.country, title: root.dataset.countryTitle });
  };

  // One click rule for mouse, touch and keyboard. A tap reaches every dot near it, since dots overlap on a small screen.
  svg.addEventListener('click', (ev) => {
    const link = ev.target.closest('a');
    if (link) ev.preventDefault();
    if (dragged) return;
    if (!link) {
      if (!ev.target.classList.contains('map-other')) return;
      pick([]);
      return tell('community:groups', { none: true, title: root.dataset.none });
    }
    if (ev.detail === 0) {
      if (link.dataset.group) showDots(dots.filter((d) => d.id === link.dataset.group));
      else showCountry(link);
      return;
    }
    const hits = dotsNear(toMap(ev), dots, 22 / pxPerUnit());
    if (hits.length) return showDots(hits);
    if (link.dataset.country) showCountry(link);
    else showDots(dots.filter((d) => d.id === link.dataset.group));
  });

  // Wheel zooms; at the far ends the page scrolls on.
  svg.addEventListener('wheel', (ev) => {
    if (ev.deltaY > 0 && view.z <= 1) return;
    ev.preventDefault();
    zoomBy(Math.exp(-Math.max(-100, Math.min(100, ev.deltaY)) * 0.004), toMap(ev));
  }, { passive: false });

  // Drag and pinch. One finger on the whole map scrolls the page (touch-action in site.css); zoomed in it pans.
  const pointers = new Map();
  let dragged = false, downAt = null, pinch = 0;
  svg.addEventListener('pointerdown', (ev) => {
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 1) { dragged = false; downAt = { x: ev.clientX, y: ev.clientY }; }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); dragged = true; }
  });
  svg.addEventListener('pointermove', (ev) => {
    const last = pointers.get(ev.pointerId);
    if (!last) return;
    if (pointers.size === 2) {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const [a, b] = [...pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomBy(dist / pinch, toMap({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
      pinch = dist;
      return;
    }
    if (Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5) {
      if (!dragged) { dragged = true; svg.setPointerCapture(ev.pointerId); }
      const px = pxPerUnit();
      setView({ ...view, x: view.x - (ev.clientX - last.x) / px, y: view.y - (ev.clientY - last.y) / px });
    }
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  });
  const release = (ev) => { pointers.delete(ev.pointerId); pinch = 0; };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // Keys, from any link on the map.
  const PAN = 60;
  svg.addEventListener('keydown', (ev) => {
    const step = PAN / view.z;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
    if (moves) setView({ ...view, x: view.x + moves[0], y: view.y + moves[1] });
    else if (ev.key === '+' || ev.key === '=') zoomBy(1.5);
    else if (ev.key === '-') zoomBy(1 / 1.5);
    else return;
    ev.preventDefault();
  });

  buttons.in.addEventListener('click', () => glideTo({ ...view, z: view.z * 1.8 }));
  buttons.out.addEventListener('click', () => glideTo({ ...view, z: view.z / 1.8 }));
  buttons.reset.addEventListener('click', () => { pick([]); glideTo({ x: W / 2, y: H / 2, z: 1 }); });

  // A search result: the point and how far the search reached, in view.
  document.addEventListener('community:point', (ev) => {
    const { lat, lon, km } = ev.detail, p = project(lat, lon);
    pointEl.setAttribute('cx', p.x.toFixed(1)); pointEl.setAttribute('cy', p.y.toFixed(1)); pointEl.removeAttribute('hidden');
    pick([]);
    if (!Number.isFinite(km)) {
      reachEl.setAttribute('hidden', '');
      const a = root.querySelector(`[data-country="${ev.detail.country}"]`);
      if (a) glideTo(fitBox(a.dataset.box.split(' ').map(Number), W, H));
      return;
    }
    const r = kmToUnits(km);
    reachEl.setAttribute('cx', p.x.toFixed(1)); reachEl.setAttribute('cy', p.y.toFixed(1)); reachEl.setAttribute('r', r.toFixed(1)); reachEl.removeAttribute('hidden');
    // Never so close that the towns around the point are out of view.
    glideTo({ ...fitBox([p.x - r, p.y - r, p.x + r, p.y + r], W, H, 1.3), z: Math.min(SEARCH_ZOOM, fitBox([p.x - r, p.y - r, p.x + r, p.y + r], W, H, 1.3).z) });
  });

  new ResizeObserver(draw).observe(svg);
  root.querySelector('[data-zoom]').hidden = false;
  draw();
}
