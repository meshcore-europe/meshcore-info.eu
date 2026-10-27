/* MapLibre helper for mockups. Markup:
   <div class="map" data-dmc-map data-center="lon,lat" data-zoom="7" data-points="json-script-id"></div>
   Points are a GeoJSON FeatureCollection; properties.status in online|stale|offline colours the dot.
   Marks the element data-map-ready="1" once idle. A theme change restyles the map: data-map-ready is removed
   and set again once the new style is loaded and idle. The map instance is el.dmcMap. Exposes window.DMCMap. */
(function () {
  const STYLES = { dark: 'https://tiles.openfreemap.org/styles/dark', light: 'https://tiles.openfreemap.org/styles/positron' };

  function styleFor() {
    const t = document.documentElement.getAttribute('data-theme');
    return !t || t === 'industrial' ? STYLES.dark : STYLES.light;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function points(el) {
    const id = el.getAttribute('data-points');
    const node = id && document.getElementById(id);
    return node ? JSON.parse(node.textContent) : { type: 'FeatureCollection', features: [] };
  }

  function addData(map, el) {
    if (map.getSource('dmc-points')) return;
    map.addSource('dmc-points', { type: 'geojson', data: points(el) });
    map.addLayer({
      id: 'dmc-points', type: 'circle', source: 'dmc-points',
      paint: {
        'circle-radius': 6,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': cssVar('--accent-ink'),
        'circle-color': ['match', ['get', 'status'],
          'online', cssVar('--success'), 'stale', cssVar('--warning'), 'offline', cssVar('--danger'),
          cssVar('--accent')],
      },
    });
  }

  function init(el) {
    const center = (el.getAttribute('data-center') || '5.3,52.2').split(',').map(Number);
    const map = new maplibregl.Map({
      container: el, style: styleFor(), center, zoom: Number(el.getAttribute('data-zoom') || 7),
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    el.dmcMap = map;
    map.on('style.load', () => addData(map, el));
    let gen = 0; // only the latest restyle may mark the map ready
    const readyOnIdle = (g) => map.once('idle', () => { if (g === gen) el.setAttribute('data-map-ready', '1'); });
    readyOnIdle(gen);
    // A mode change (dmc:prefs with detail.applied) restyles the map; a language change does not.
    window.addEventListener('dmc:prefs', (e) => {
      if (!e.detail || !e.detail.applied) return;
      const g = ++gen;
      el.removeAttribute('data-map-ready');
      map.setStyle(styleFor(), { diff: false });
      map.once('style.load', () => readyOnIdle(g));
    });
    return map;
  }

  function start() { document.querySelectorAll('[data-dmc-map]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.DMCMap = { init };
})();
