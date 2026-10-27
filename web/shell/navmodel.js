/* Pure HTML builders for the DMC shell. No DOM access, so node tests and a site's build can run them.
   Without ctx.lang every label is rendered in NL, EN and DE at once and CSS shows the one matching <html lang>.
   With ctx.lang (a site with the language in its URLs) each label is one plain string: ctx.t(label.key),
   then label[lang], then label.en.
   Exposes globalThis.DMCNav. */
(function (g) {
  const LANGS = [['nl', '\u{1F1F3}\u{1F1F1}', 'Nederlands'], ['en', '\u{1F1EC}\u{1F1E7}', 'English'], ['de', '\u{1F1E9}\u{1F1EA}', 'Deutsch']];
  const MODES = [
    ['system', { key: 'shell_system', nl: 'Systeem volgen', en: 'Follow system', de: 'System folgen' }],
    ['dark', { key: 'shell_dark', nl: 'Donker', en: 'Dark', de: 'Dunkel' }],
    ['light', { key: 'shell_light', nl: 'Licht', en: 'Light', de: 'Hell' }],
  ];
  const UI = {
    theme: { key: 'shell_theme', nl: 'Thema', en: 'Theme', de: 'Design' },
    language: { key: 'shell_language', nl: 'Taal', en: 'Language', de: 'Sprache' },
    colourVision: { key: 'shell_colour_vision', nl: 'Kleurenzicht', en: 'Colour vision', de: 'Farbsehen' },
    account: { key: 'shell_account', nl: 'Account', en: 'Account', de: 'Konto' },
    menu: { key: 'shell_menu', nl: 'Menu', en: 'Menu', de: 'Men\u00fc' },
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function tri(label) {
    const l = label || {};
    return ['nl', 'en', 'de'].map((k) => `<span class="${k}">${esc(l[k] || l.nl || '')}</span>`).join('');
  }

  function say(label, ctx) {
    if (!ctx || !ctx.lang) return tri(label);
    const l = label || {};
    const own = l.key && ctx.t ? ctx.t(l.key) : null;
    return esc(own ?? l[ctx.lang] ?? l.en ?? l.nl ?? '');
  }

  function linkFor(item, mode) {
    if (mode === 'mockup' && item.page) return item.page + '.html' + (item.hash || '');
    return item.href;
  }

  function allItems(nav) {
    const out = [];
    for (const p of nav.primary) { out.push(p); for (const c of p.children || []) out.push(c); }
    for (const app of Object.values(nav.apps || {})) {
      for (const r of app.routes || []) out.push(r);
      for (const a of app.account || []) out.push(a);
      if (app.signIn) out.push(app.signIn);
    }
    // Pages that are in the footer but not in the menu (meshcore-info.eu's Wallpapers, named in the Press kit line).
    for (const e of nav.extra || []) out.push(e);
    return out;
  }

  function findItem(nav, id) {
    const hit = allItems(nav).find((i) => i.id === id);
    if (!hit) throw new Error(`nav: unknown item id "${id}"`);
    return hit;
  }

  // aria-current: "page" on the link to the current page itself, "true" on an ancestor of it
  // (the section link on a sub-page, the Network child for an app page).
  function currentState(item, ctx, ancestor) {
    if (item.page && item.page === ctx.page && !item.hash) return 'page';
    return ancestor ? 'true' : '';
  }

  function anchor(item, ctx, cls, current) {
    const ext = item.external ? ' target="_blank" rel="noopener"' : '';
    const cur = current ? ` aria-current="${current}"` : '';
    return `<a class="${cls}${item.external ? ' ext' : ''}" href="${esc(linkFor(item, ctx.mode))}"${ext}${cur}>${say(item.label, ctx)}</a>`;
  }

  function childState(nav, child, ctx) {
    return currentState(child, ctx, !!ctx.app && child.id === nav.apps[ctx.app].networkItem);
  }

  // Disclosure pattern (nav sections, account): a button that shows a panel of plain links.
  function disclosure(id, trigCls, trigInner, panelInner) {
    return `<button class="${trigCls}" type="button" aria-expanded="false" aria-controls="${id}">${trigInner}</button>` +
      `<div class="dd-menu" id="${id}">${panelInner}</div>`;
  }

  // Menu button pattern (theme, language): shell.js adds the arrow-key focus handling.
  function menuButton(id, trigInner, items) {
    return `<button class="dd-trig chip-trig" type="button" id="${id}-trig" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}">${trigInner}</button>` +
      `<div class="dd-menu" id="${id}" role="menu" aria-labelledby="${id}-trig">${items}</div>`;
  }

  function subLabel(nav, ctx) {
    if (ctx.app) return nav.apps[ctx.app].label;
    const sec = nav.primary.find((p) => p.id === ctx.section);
    return sec ? sec.label : null;
  }

  // Inline SVG strokes for the mega-menu rows (20px grid, stroke 1.8, design-system rule).
  const ICONS = {
    chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    antenna: '<path d="M4 20l16-16M8 20v-4H4"/><circle cx="17" cy="7" r="3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
    filter: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
    file: '<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    device: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01M9 6h6"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/>',
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 4a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
  };
  const icon = (name) => `<span class="mega-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg></span>`;

  function megaRow(nav, c, ctx) {
    const ext = c.external ? ' target="_blank" rel="noopener"' : '';
    const st = childState(nav, c, ctx);
    return `<li><a class="mega-item${c.external ? ' ext' : ''}" href="${esc(linkFor(c, ctx.mode))}"${ext}${st ? ` aria-current="${st}"` : ''}>` +
      `${icon(c.icon)}<span><b>${say(c.label, ctx)}</b>${c.sub ? `<small>${say(c.sub, ctx)}</small>` : ''}</span></a></li>`;
  }

  function megaCard(nav, card, ctx) {
    let actions = '';
    if (card.primary) {
      // primary is a nav item id, or an inline item ({ page, href, label }) for a page outside the menu.
      const p = typeof card.primary === 'object' ? card.primary : findItem(nav, card.primary);
      const ext = p.external ? ' target="_blank" rel="noopener"' : '';
      actions += `<a class="btn btn-primary btn-sm" href="${esc(linkFor(p, ctx.mode))}"${ext}>${say(card.primaryLabel || p.label, ctx)}</a>`;
    }
    if (card.secondary) {
      const s2 = nav.primary.find((x) => x.id === card.secondary) || findItem(nav, card.secondary);
      actions += `<a class="btn btn-quiet btn-sm" href="${esc(linkFor(s2, ctx.mode))}">${say(s2.label, ctx)}</a>`;
    }
    if (card.link) actions += `<a class="btn btn-sm" href="${esc(card.link.href)}" target="_blank" rel="noopener">${say(card.link.label, ctx)} \u2197</a>`;
    // A live card (Network menu, 2026-10-02): the "network right now" panel of the home, compact. Values come from
    // nav.json as sample data; a live site fills them from the observers API.
    const live = card.live ? `<div class="mega-kpis">${card.live.kpis.map((k) => `<div><span>${say(k.label, ctx)}</span><b>${esc(k.value)}</b></div>`).join('')}</div>` +
      `<ul class="mega-rows">${card.live.rows.map((r) => `<li><span class="dot ${esc(r.status)}" aria-hidden="true"></span><span class="mono">${esc(r.name)}</span><b>${esc(r.count)}</b></li>`).join('')}</ul>` : '';
    // A feed card (Firmware menu, 2026-10-02): the latest changelog entries with date, title and a channel tag.
    // The list is filled by shell.js from the one combined changelog (nav.changelog), filtered on card.feed.products.
    const feed = card.feed ? `<ul class="mega-feed" data-products="${esc(card.feed.products.join(','))}" data-limit="${card.feed.limit || 3}"></ul>` : '';
    return `<div class="mega-card${card.live ? ' is-live' : ''}"><div class="mega-eyebrow">${card.live ? '<span class="dot online" aria-hidden="true"></span>' : ''}${say(card.eyebrow, ctx)}</div><div class="mega-title">${say(card.title, ctx)}</div>` +
      (card.body ? `<p>${say(card.body, ctx)}</p>` : '') + live + feed + `${actions ? `<div class="mega-actions">${actions}</div>` : ''}</div>`;
  }

  // A primary item with `groups` opens a full-width panel: columns of icon rows, one card on the right.
  // The column count is a data attribute, not style="": a strict CSP (style-src 'self') drops inline styles.
  function megaPanel(nav, item, ctx) {
    const byId = Object.fromEntries(item.children.map((c) => [c.id, c]));
    const cols = item.groups.map((g2) => `<div class="mega-col"><div class="mega-head">${say(g2.title, ctx)}</div><ul>` +
      g2.items.map((id) => megaRow(nav, byId[id], ctx)).join('') + '</ul></div>').join('');
    // One overview link per menu, always in its own row under the columns, left-aligned (consistent in every menu).
    const allLabel = (item.groups.find((g2) => g2.all) || {}).all;
    const all = allLabel && item.page ? `<a class="mega-all" href="${esc(linkFor(item, ctx.mode))}">${say(allLabel, ctx)} \u2192</a>` : '';
    return `<div class="mega-inner" data-cols="${item.groups.length}">${cols}${item.card ? megaCard(nav, item.card, ctx) : ''}${all}</div>`;
  }

  function primaryHTML(nav, ctx) {
    const items = nav.primary.map((item) => {
      if (!item.children) return `<li>${anchor(item, ctx, 'nav-link', currentState(item, ctx, item.id === ctx.section))}</li>`;
      const trig = `${say(item.label, ctx)}<span class="caret" aria-hidden="true">\u25BE</span>`;
      if (item.groups) {
        return `<li class="dd mega-dd${item.id === ctx.section ? ' is-active' : ''}">` +
          `<button class="nav-link dd-trig" type="button" aria-expanded="false" aria-controls="dmc-dd-${item.id}"${item.id === ctx.section ? ' aria-current="true"' : ''}>${trig}</button>` +
          `<div class="dd-menu mega" id="dmc-dd-${item.id}">${megaPanel(nav, item, ctx)}</div></li>`;
      }
      const links = item.children.map((c) => anchor(c, ctx, '', childState(nav, c, ctx))).join('');
      return `<li class="dd left${item.id === ctx.section ? ' is-active' : ''}">` +
        disclosure(`dmc-dd-${item.id}`, 'nav-link dd-trig', trig, links) + '</li>';
    });
    return `<ul class="primary">${items.join('')}</ul>`;
  }

  function radio(attr, value, label) {
    return `<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" ${attr}="${esc(value)}">${label}<span class="chk" aria-hidden="true">\u2713</span></button>`;
  }

  // The theme control (2026-10-08), the Tailwind docs pattern: an icon button that shows the mode in use, a moon in
  // dark and a sun in light (shell.css picks one from <html data-theme>), opening follow system, dark or light.
  const MODE_ICONS = {
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    dark: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  };
  const modeIcon = (id, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MODE_ICONS[id]}</svg>`;

  function themeMenu(nav, ctx) {
    // One radio group, the GitHub appearance pattern: follow the system, dark or light (one style since 2026-10-08).
    let items = MODES.map(([id, label]) => radio('data-set-mode', id, modeIcon(id, 'mode-ico') + say(label, ctx))).join('');
    const extras = ctx.app && nav.apps[ctx.app].themeExtras;
    if (extras && extras.length) {
      items += `<div class="dd-sep" role="separator"></div><div class="dd-label" role="presentation">${say(UI.colourVision, ctx)}</div>` +
        extras.map((x) => radio('data-set-cvd', x.id, say(x.label, ctx))).join('');
    }
    const trig = modeIcon('dark', 'theme-ico theme-dark') + modeIcon('light', 'theme-ico theme-light') + `<span class="vh">${say(UI.theme, ctx)}</span>`;
    return `<div class="dd">${menuButton('dmc-dd-theme', trig, items).replace('class="dd-trig chip-trig"', 'class="dd-trig chip-trig icon-trig"')}</div>`;
  }

  // On a site with the language in its URLs (ctx.alternates: [{ lang, name, href }]) the menu is a list of links
  // to the same page in each language, so it works without JavaScript and sets no cookie.
  function langLinks(ctx) {
    return ctx.alternates.map((a) => `<a href="${esc(a.href)}" hreflang="${esc(a.lang)}" lang="${esc(a.lang)}"` +
      `${a.lang === ctx.lang ? ' aria-current="true"' : ''}>${esc(a.name)}</a>`).join('');
  }

  function langMenu(ctx) {
    if (ctx.alternates) {
      const trig = `<span class="lang-code" aria-hidden="true">${esc(String(ctx.lang).toUpperCase())}</span><span class="dd-text">${say(UI.language, ctx)}</span>`;
      return `<div class="dd">${disclosure('dmc-dd-lang', 'dd-trig chip-trig', trig, langLinks(ctx)).replace('class="dd-menu"', 'class="dd-menu lang-menu"')}</div>`;
    }
    const flags = LANGS.map(([code, flag]) => `<span class="${code} flag" aria-hidden="true">${flag}</span>`).join('');
    const items = LANGS.map(([code, flag, name]) => radio('data-set-lang', code, `<span class="flag" aria-hidden="true">${flag}</span> ${esc(name)}`)).join('');
    return `<div class="dd">${menuButton('dmc-dd-lang', `${flags}<span class="dd-text">${say(UI.language, ctx)}</span>`, items)}</div>`;
  }

  function accountHTML(nav, ctx) {
    if (ctx.app !== 'observers') return '';
    const app = nav.apps.observers;
    // Phones show only the key icon (shell.css); the text stays for screen readers.
    if (!ctx.signedIn) {
      return `<a class="chip-trig" href="${esc(linkFor(app.signIn, ctx.mode))}"><span class="signin-ico" aria-hidden="true">\u{1F511}</span>` +
        `<span class="signin-text">${say(app.signIn.label, ctx)}</span></a>`;
    }
    const links = app.account.map((a) => anchor(a, ctx, '', currentState(a, ctx, false))).join('');
    const trig = `<span class="dot online" aria-hidden="true"></span><span class="vh">${say(UI.account, ctx)}</span><span class="dd-text mono">operator</span>`;
    return `<div class="dd">${disclosure('dmc-dd-account', 'dd-trig chip-trig', trig, links)}</div>`;
  }

  // The wordmark is brand data (nav.brand.mark): an optional faint prefix, the text, an optional accented suffix.
  // Without it the mark is #dmc, the DMC wordmark (decided 2026-10-02).
  // The brand name next to the footer mark, unless the mark already spells it (meshcore-info.eu).
  function markSpellsName(nav) {
    const m = (nav.brand && nav.brand.mark) || {};
    return (m.prefix || '') + (m.text || '') + (m.suffix || '') === nav.brand.name;
  }

  function mark(nav) {
    const m = (nav && nav.brand && nav.brand.mark) || { prefix: '#', text: 'dmc' };
    return '<span class="brand-mark" aria-hidden="true">' + (m.prefix ? `<span class="bk">${esc(m.prefix)}</span>` : '') +
      esc(m.text) + (m.suffix ? `<span class="tld">${esc(m.suffix)}</span>` : '') + '</span>';
  }

  function headerHTML(nav, ctx) {
    const sub = subLabel(nav, ctx);
    return `<header class="navbar"><div class="navbar-inner">` +
      // Brand (decided 2026-10-02): the #dmc wordmark, a MeshCore channel name, then the section as a breadcrumb. The full name is the link's label.
      `<a class="brand" href="${esc(linkFor(nav.brand, ctx.mode))}" aria-label="${esc(nav.brand.name)}">${mark(nav)}` +
      (sub ? `<span class="brand-sub"><span class="brand-sep" aria-hidden="true">/</span>${say(sub, ctx)}</span>` : '') + `</a>` +
      `<nav class="primary-nav" aria-label="${esc(nav.brand.name)}">${primaryHTML(nav, ctx)}</nav>` +
      `<div class="controls">${accountHTML(nav, ctx)}${themeMenu(nav, ctx)}${langMenu(ctx)}` +
      `<button class="burger chip-trig" type="button" aria-expanded="false" aria-controls="dmc-drawer"><svg class="burger-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span class="vh">${say(UI.menu, ctx)}</span></button></div>` +
      `</div></header>`;
  }

  function appRowHTML(nav, ctx) {
    // No third navigation level (decided 2026-10-02): an app without routes gets no row; its pages live in the mega menu.
    if (!ctx.app || !(nav.apps[ctx.app].routes || []).length) return '';
    // The app name stays for screen readers only: the header breadcrumb already shows it (2026-10-02).
    const app = nav.apps[ctx.app];
    const links = app.routes.map((r) => anchor(r, ctx, '', currentState(r, ctx, false))).join('');
    return `<nav class="approw" aria-labelledby="dmc-approw-name"><div class="approw-inner"><span class="approw-name vh" id="dmc-approw-name">${say(app.label, ctx)}</span>${links}</div></nav>`;
  }

  function drawerHTML(nav, ctx) {
    const parts = [];
    if (ctx.app && (nav.apps[ctx.app].routes || []).length) {
      const app = nav.apps[ctx.app];
      parts.push(`<div class="drawer-group"><div class="dd-label">${say(app.label, ctx)}</div>` +
        app.routes.map((r) => anchor(r, ctx, 'drawer-link', currentState(r, ctx, false))).join('') + '</div>');
    }
    for (const item of nav.primary) {
      if (!item.children) { parts.push(anchor(item, ctx, 'drawer-link drawer-top', currentState(item, ctx, item.id === ctx.section))); continue; }
      // The section's name only opens and closes its group, and every page is listed under it by its own name, as in
      // the header menu (Kasper, 2026-10-21; it replaces the section name as a link of 2026-10-19).
      // A section whose main page has no item of its own (the DMC menu) lists that page first, under the section's name.
      const name = say(item.label, ctx);
      const own = !item.page || item.children.some((c) => c.href === item.href);
      const rest = own ? item.children : [item, ...item.children];
      parts.push(`<details class="drawer-group"${item.id === ctx.section ? ' open' : ''}><summary class="drawer-link drawer-top">${name}</summary>` +
        rest.map((c) => anchor(c, ctx, 'drawer-link', childState(nav, c, ctx))).join('') + '</details>');
    }
    if (ctx.alternates) {
      parts.push(`<details class="drawer-group drawer-lang"><summary class="drawer-link drawer-top">${say(UI.language, ctx)}</summary>` +
        langLinks(ctx).replace(/<a /g, '<a class="drawer-link" ') + '</details>');
    }
    return `<div class="drawer" id="dmc-drawer">${parts.join('')}</div>`;
  }

  function footerHTML(nav, ctx) {
    const cols = nav.footer.map((col) => `<div class="footer-col"><h2 class="footer-title">${say(col.title, ctx)}</h2><ul>` +
      col.items.map((id) => `<li>${anchor(findItem(nav, id), ctx, '', '')}</li>`).join('') + '</ul></div>').join('');
    return `<footer class="site-footer"><div class="footer-inner">` +
      `<div class="footer-brand"><div class="footer-mark">${mark(nav)}${markSpellsName(nav) ? '' : `<span class="brand-name">${esc(nav.brand.name)}</span>`}</div>` +
      `<p><a href="${esc(linkFor(nav.disclaimer, ctx.mode))}">${say(nav.disclaimer.label, ctx)}</a></p>` +
      (nav.footerNote || []).map((line, i) => `<p class="footer-note${i ? ' footer-fine' : ''}">${say(line, ctx)}</p>`).join('') +
      (nav.umbrella ? `<p class="footer-umbrella">${say(nav.umbrella.label, ctx)}: <a class="ext" href="${esc(nav.umbrella.href)}" target="_blank" rel="noopener">${esc(nav.umbrella.name)}</a></p>` : '') +
      `</div>${cols}</div></footer>`;
  }

  g.DMCNav = { esc, tri, say, linkFor, findItem, headerHTML, appRowHTML, drawerHTML, footerHTML };
})(globalThis);
