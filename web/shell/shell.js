/* Inserts the DMC shell into a page and wires it up. A page whose header, drawer and footer were rendered at build
   time by navmodel.js marks <body data-shell="static">: then nothing is inserted, only wired.
   Needs prefs.js (in <head>) and navmodel.js (deferred, before this file).
   Page contract: <body data-page="..." data-section="..." data-app="observers|ota" data-signed-in="1" data-brand="meshcore-info">.
   data-brand picks the nav file: nav.<brand>.json, or nav.json (DMC) without it.
   When done it dispatches "dmc:shell-ready" (detail: nav) and then sets body[data-shell-ready="1"],
   which the renderer waits for.
   Dropdowns: nav sections and the account slot are disclosures (button + panel of links); theme and
   language are ARIA menus with arrow-key focus. Every .dd closes on Escape, outside click or when focus leaves it. */
(function () {
  const P = window.DMCPrefs;
  const N = window.DMCNav;
  const me = document.currentScript;
  const BASE = me ? me.src.replace(/shell\.js(\?.*)?$/, '') : '../assets/';
  // Colour-vision mode is Observers-only, so it lives in this origin's localStorage, not in a shared
  // .dutchmeshcore.nl cookie like dmc-theme and dmc-lang.
  const CVD_KEY = 'dmc-cvd';

  const trigOf = (dd) => dd.querySelector(':scope > .dd-trig');
  const isMenu = (dd) => !!dd.querySelector(':scope > .dd-menu[role="menu"]');
  // Only items that render.
  const menuItems = (dd) => [...dd.querySelectorAll(':scope > .dd-menu [role^="menuitem"]')].filter((i) => i.getClientRects().length > 0);

  function setOpen(dd, open) {
    dd.classList.toggle('open', open);
    const t = trigOf(dd);
    if (t) t.setAttribute('aria-expanded', String(open));
  }

  function closeAll(except) {
    document.querySelectorAll('.dd.open').forEach((d) => { if (d !== except) setOpen(d, false); });
  }

  // Menus open with focus on the checked item (or the first one).
  function focusChecked(dd) {
    const items = menuItems(dd);
    const target = items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0];
    if (target) target.focus();
  }

  function openDropdown(dd) {
    closeAll(dd);
    setOpen(dd, true);
    if (isMenu(dd)) focusChecked(dd);
  }

  function readCvd() {
    try { return window.localStorage.getItem(CVD_KEY); } catch (e) { return null; }
  }

  function applyCvd(value) {
    const root = document.documentElement;
    if (value && value !== 'none') root.setAttribute('data-cvd', value); else root.removeAttribute('data-cvd');
  }

  function setCvd(value) {
    applyCvd(value);
    try { window.localStorage.setItem(CVD_KEY, value); } catch (e) { /* storage blocked: applies for this page only */ }
  }

  function syncChecks() {
    const root = document.documentElement;
    const mode = root.getAttribute('data-mode-choice');
    const lang = root.getAttribute('lang');
    const cvd = root.getAttribute('data-cvd') || 'none';
    document.querySelectorAll('[data-set-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setMode === mode)));
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setLang === lang)));
    document.querySelectorAll('[data-set-cvd]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setCvd === cvd)));
  }

  function drawerEls() {
    return { drawer: document.getElementById('dmc-drawer'), burger: document.querySelector('.burger') };
  }

  // The drawer is fixed; it starts right under the sticky navbar.
  function placeDrawer() {
    const { drawer } = drawerEls();
    const bar = document.querySelector('.navbar');
    if (drawer && bar) drawer.style.setProperty('--drawer-top', `${Math.max(0, bar.getBoundingClientRect().bottom)}px`);
  }

  function setDrawer(open) {
    const { burger } = drawerEls();
    document.body.classList.toggle('drawer-open', open);
    if (burger) burger.setAttribute('aria-expanded', String(open));
    if (open) placeDrawer();
  }

  // After a menu choice: update the checks, close, and put focus back on the trigger (the item is hidden now).
  function chosen(item) {
    const dd = item.closest('.dd');
    syncChecks();
    closeAll();
    if (dd && trigOf(dd)) trigOf(dd).focus();
  }

  // Changelog cards in mega menus read the one combined changelog and show the newest entries for their products.
  function fillFeeds(nav, ctx) {
    const lists = document.querySelectorAll('.mega-feed[data-products]');
    if (!lists.length || !nav.changelog) return;
    // In mockups the path is relative to the shell's assets folder, so it resolves the same from every page.
    const src = ctx.mode === 'mockup' ? (ctx.assets || '') + nav.changelog.page : nav.changelog.href;
    const LOC = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE' };
    // One language on a site with the language in its URLs (ctx.lang), else the three spans.
    const tri = ctx.lang ? (o) => N.esc(o[ctx.lang] ?? o.en ?? o.nl) : (o) => ['nl', 'en', 'de'].map((l) => `<span class="${l}">${o[l] ?? o.nl}</span>`).join('');
    fetch(src).then((r) => r.json()).then(({ entries }) => lists.forEach((ul) => {
      const want = ul.dataset.products.split(',');
      ul.innerHTML = entries.filter((e) => want.includes(e.product)).slice(0, +ul.dataset.limit || 3).map((e) => {
        const langs = ctx.lang ? [ctx.lang] : Object.keys(LOC);
        const day = Object.fromEntries(langs.map((l) => [l, new Date(e.date).toLocaleDateString(LOC[l] || l, { day: 'numeric', month: 'short' })]));
        const meta = e.version || (e.area ? null : e.product);
        const tag = e.channel || e.product;
        return `<li><span class="mega-date">${tri(day)}</span><span class="mega-ft"><b>${tri(e.title)}</b><small>${meta ? meta : tri(e.area)}</small></span>` +
          `<span class="badge${tag === 'stable' ? ' ok' : tag === 'dev' ? ' warn' : ''}">${tag}</span></li>`;
      }).join('');
    })).catch(() => {});
  }

  function wire() {
    document.addEventListener('click', (e) => {
      const trig = e.target.closest('.dd-trig');
      if (trig) {
        const dd = trig.parentElement;
        if (dd.classList.contains('open')) setOpen(dd, false); else openDropdown(dd);
        return;
      }
      const md = e.target.closest('[data-set-mode]');
      if (md) { P.setMode(window, md.dataset.setMode); chosen(md); return; }
      const l = e.target.closest('[data-set-lang]');
      if (l) { P.setLang(window, l.dataset.setLang); chosen(l); return; }
      const c = e.target.closest('[data-set-cvd]');
      if (c) { setCvd(c.dataset.setCvd); chosen(c); return; }
      const burger = e.target.closest('.burger');
      if (burger) { setDrawer(!document.body.classList.contains('drawer-open')); return; }
      if (e.target.closest('#dmc-drawer a')) { setDrawer(false); return; }
      if (!e.target.closest('.dd-menu')) closeAll();
    });

    document.addEventListener('keydown', (e) => {
      const dd = e.target.closest && e.target.closest('.dd');
      if (e.key === 'Escape') {
        const wasOpen = dd && dd.classList.contains('open');
        const inDrawer = e.target.closest && e.target.closest('#dmc-drawer');
        closeAll();
        if (document.body.classList.contains('drawer-open')) {
          setDrawer(false);
          const { burger } = drawerEls();
          if (inDrawer && burger) burger.focus();
        }
        if (wasOpen && trigOf(dd)) trigOf(dd).focus();
        return;
      }
      if (!dd || !isMenu(dd)) return;
      const onTrig = e.target === trigOf(dd);
      if (onTrig && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        openDropdown(dd);
        return;
      }
      const items = menuItems(dd);
      const i = items.indexOf(e.target);
      if (i < 0) return;
      const next = { ArrowDown: (i + 1) % items.length, ArrowUp: (i - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      items[next].focus();
    });

    // Close a dropdown when focus moves to something outside it. A null relatedTarget (focus went nowhere,
    // e.g. a click on the page background) is left to the click handler.
    document.addEventListener('focusout', (e) => {
      const dd = e.target.closest && e.target.closest('.dd.open');
      if (dd && e.relatedTarget && !dd.contains(e.relatedTarget)) setOpen(dd, false);
    });

    window.addEventListener('resize', () => { if (document.body.classList.contains('drawer-open')) placeDrawer(); });
    window.addEventListener('scroll', () => { if (document.body.classList.contains('drawer-open')) placeDrawer(); }, { passive: true });
    // Overlay header: transparent over the opening film, a frosted sheet once the page scrolls.
    if (document.body.dataset.header === 'overlay') {
      const solid = () => document.body.classList.toggle('header-solid', window.scrollY > 8);
      window.addEventListener('scroll', solid, { passive: true });
      solid();
    }

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', () => {
      if (document.documentElement.getAttribute('data-mode-choice') === 'system') P.setMode(window, 'system');
    });
  }

  function ctxFromBody() {
    const b = document.body;
    return {
      page: b.dataset.page || '', section: b.dataset.section || '', app: b.dataset.app || '',
      signedIn: b.dataset.signedIn === '1', mode: b.dataset.mode || 'mockup', assets: b.dataset.assets || BASE,
      lang: document.documentElement.dataset.lang === 'fixed' ? document.documentElement.lang : '',
    };
  }

  function render(nav) {
    const b = document.body;
    const ctx = ctxFromBody();
    if (ctx.app === 'observers') applyCvd(readCvd());
    const top = document.createElement('div');
    top.innerHTML = N.headerHTML(nav, ctx) + N.appRowHTML(nav, ctx) + N.drawerHTML(nav, ctx);
    b.prepend(...top.childNodes);
    const bottom = document.createElement('div');
    bottom.innerHTML = N.footerHTML(nav, ctx);
    b.append(...bottom.childNodes);
    wire();
    syncChecks();
    ready(nav, ctx);
  }

  // What needs nav.json once the markup is in place: the changelog feeds and the ready event.
  function ready(nav, ctx) {
    const b = document.body;
    fillFeeds(nav, ctx);
    window.dispatchEvent(new CustomEvent('dmc:shell-ready', { detail: nav }));
    b.dataset.shellReady = '1';
  }

  function start() {
    const brand = document.body.dataset.brand;
    const nav = fetch(BASE + (brand ? `nav.${brand}.json` : 'nav.json'))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    if (document.body.dataset.shell === 'static') {
      // The menus work as soon as they are wired; nav.json only feeds the changelog cards.
      const ctx = ctxFromBody();
      if (ctx.app === 'observers') applyCvd(readCvd());
      wire();
      syncChecks();
      nav.then((n) => ready(n, ctx)).catch((err) => console.error('shell: could not load nav.json', err));
      return;
    }
    nav.then(render).catch((err) => console.error('shell: could not load nav.json', err));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
