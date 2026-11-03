// The map on /community/: the projection of src/data/europe-map.json and the zoom maths, as pure functions
// (tests/js/map-view.test.mjs). The build places the dots with it; web/js/community-map.js does the page.

const EARTH_KM = 6371.0088;
const LAT0 = (52 * Math.PI) / 180, LON0 = (10 * Math.PI) / 180;
export const MAX_ZOOM = 12;

// Lambert azimuthal equal-area on a unit sphere, centred on Europe: the projection of src/data/europe-map.json.
function laea(lat, lon) {
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180 - LON0;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(phi) + Math.cos(LAT0) * Math.cos(phi) * Math.cos(lam)));
  return [k * Math.cos(phi) * Math.sin(lam), -k * (Math.cos(LAT0) * Math.sin(phi) - Math.sin(LAT0) * Math.cos(phi) * Math.cos(lam))];
}
const X0 = laea(60, -24)[0], X1 = laea(58, 42)[0], Y0 = laea(71.5, 10)[1];
const SCALE = 1000 / (X1 - X0);

export function project(lat, lon) {
  const [x, y] = laea(lat, lon);
  return { x: (x - X0) * SCALE, y: (y - Y0) * SCALE };
}
export const kmToUnits = (km) => (km / EARTH_KM) * SCALE;

// The box of the larger parts of an SVG path of the map, so that a far island does not decide how a country zooms.
export function mainBox(d, minShare = 0.1) {
  const boxes = d.split('M').filter(Boolean).map((sub) => {
    const n = sub.replace('Z', '').split('L').map((p) => p.trim().split(' ').map(Number));
    const xs = n.map((p) => p[0]), ys = n.map((p) => p[1]);
    const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    return { b, size: (b[2] - b[0]) * (b[3] - b[1]) };
  });
  const largest = Math.max(...boxes.map((x) => x.size));
  const big = boxes.filter((x) => x.size >= largest * minShare).map((x) => x.b);
  return [Math.min(...big.map((b) => b[0])), Math.min(...big.map((b) => b[1])), Math.max(...big.map((b) => b[2])), Math.max(...big.map((b) => b[3]))];
}

const rings = (d) => d.split('M').filter(Boolean).map((sub) => sub.replace('Z', '').split('L').map((p) => p.trim().split(' ').map(Number)));
const ringArea = (r) => Math.abs(r.reduce((sum, p, i) => { const q = r[(i + 1) % r.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
export function inRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function edgeDistance(ring, x, y) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

// The point inside the largest part of a country that lies furthest from its border. A group for the whole country
// has no place of its own; this one is always on land, also in a country whose middle is not (Croatia, Norway).
export function countryAnchor(d, steps = 32) {
  const ring = rings(d).sort((a, b) => ringArea(b) - ringArea(a))[0];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  let best = { x: ring[0][0], y: ring[0][1], dist: -1 };
  for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
    const x = x0 + ((i + 0.5) / steps) * w, y = y0 + ((j + 0.5) / steps) * h;
    if (!inRing(ring, x, y)) continue;
    const dist = edgeDistance(ring, x, y);
    if (dist > best.dist) best = { x, y, dist };
  }
  return { x: best.x, y: best.y };
}

// A view is { x, y, z }: the map point in the centre and the zoom. It never shows anything outside the map.
export function clampView(view, width, height) {
  const z = Math.min(MAX_ZOOM, Math.max(1, view.z));
  const halfW = width / z / 2, halfH = height / z / 2;
  return { z, x: Math.min(width - halfW, Math.max(halfW, view.x)), y: Math.min(height - halfH, Math.max(halfH, view.y)) };
}

export function viewBox(view, width, height) {
  const w = width / view.z, h = height / view.z;
  return [view.x - w / 2, view.y - h / 2, w, h];
}

// Zoom by a factor while the map point under (px, py), a map point too, stays where it is.
export function zoomAt(view, px, py, factor, width, height) {
  const z = Math.min(MAX_ZOOM, Math.max(1, view.z * factor)), k = view.z / z;
  return clampView({ z, x: px + (view.x - px) * k, y: py + (view.y - py) * k }, width, height);
}

// The view that shows a box with some room around it.
export function fitBox(box, width, height, room = 1.15) {
  const w = (box[2] - box[0]) * room, h = (box[3] - box[1]) * room;
  const z = Math.min(width / Math.max(w, 1), height / Math.max(h, 1));
  return clampView({ x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2, z }, width, height);
}

// The groups whose dot lies within `reach` map units of a point, nearest first.
export function dotsNear(point, dots, reach) {
  return dots.map((d) => ({ d, dist: Math.hypot(d.x - point.x, d.y - point.y) })).filter((h) => h.dist <= reach)
    .sort((a, b) => a.dist - b.dist).map((h) => h.d);
}
