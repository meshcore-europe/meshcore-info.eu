/* DMC preferences: the mode (dark or light) and the language, shared via cookies across the subdomains of each
   brand domain (*.dutchmeshcore.nl, *.meshcore-info.eu).
   One style since 2026-10-08 (slate and win95 removed): industrial. Mode (dmc-mode): system | dark | light,
   where system follows the operating system. The applied <html data-theme> is industrial | industrial-light.
   Older cookies and keys still count for the mode: dmc-theme (a style cookie until 2026-10-08) and the
   single-cookie values dark, light, system and minimalistic (light).
   A site with the language in its URLs marks <html lang="el" data-lang="fixed">: boot then leaves lang alone.
   Cookies are written only when the visitor picks a mode or a language, or to carry over a choice from an
   older key; a visitor who never picks gets the defaults and no cookie (2026-10-12).
   Classic script with no module syntax: load it synchronously in <head> so the theme
   and <html lang> are applied before first paint. Node tests import it too.
   Exposes globalThis.DMCPrefs. */
(function (g) {
  const MODES = ['system', 'dark', 'light'];
  const LANGS = ['nl', 'en', 'de'];
  const MODE_COOKIE = 'dmc-mode';
  const LANG_COOKIE = 'dmc-lang';
  const LEGACY_THEME_COOKIE = 'dmc-theme';
  const LEGACY_THEME_KEYS = ['meshcore-theme', 'theme'];
  const LEGACY_LANG_KEYS = ['meshcore-lang', 'dmc-lang', 'locale'];
  const DEFAULT_MODE = 'system';
  // Old single theme values that imply a mode. Styles (industrial, slate, win95) imply none.
  const LEGACY_MODE = { dark: 'dark', light: 'light', system: 'system', minimalistic: 'light' };
  const DEFAULT_LANG = 'nl';
  // One cookie domain per brand; on any other host (localhost, previews) the cookies stay on that host.
  const COOKIE_DOMAINS = ['dutchmeshcore.nl', 'meshcore-info.eu'];

  function readCookie(cookieString, name) {
    for (const part of (cookieString || '').split(';')) {
      const p = part.trim();
      if (p.startsWith(name + '=')) {
        try { return decodeURIComponent(p.slice(name.length + 1)); } catch (e) { return null; } // malformed value: ignore it
      }
    }
    return null;
  }

  function normMode(v) { return MODES.includes(v) ? v : null; }
  function legacyMode(v) { return LEGACY_MODE[v] || null; }

  function normLang(v) {
    if (!v) return null;
    const m = /^([a-z]{2})(?:[-_].*)?$/i.exec(String(v));
    const short = m ? m[1].toLowerCase() : null;
    return short && LANGS.includes(short) ? short : null;
  }

  function firstValid(values, norm) {
    for (const v of values) { const n = norm(v); if (n) return n; }
    return null;
  }

  // Mode: its own cookie, else what an old theme value implied, else system.
  function resolveMode({ cookie, themeCookie = null, legacy = [] }) {
    return normMode(cookie) || legacyMode(themeCookie) || firstValid(legacy, legacyMode) || DEFAULT_MODE;
  }

  function resolveLang({ cookie, legacy = [], navigatorLanguages = [] }) {
    return normLang(cookie) || firstValid(legacy, normLang) || firstValid(navigatorLanguages, normLang) || DEFAULT_LANG;
  }

  function appliedTheme(mode, prefersLight) {
    const m = normMode(mode) || DEFAULT_MODE;
    const light = m === 'light' || (m === 'system' && prefersLight);
    return light ? 'industrial-light' : 'industrial';
  }

  function cookieString(name, value, loc) {
    const host = (loc && loc.hostname) || '';
    let s = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const domain = COOKIE_DOMAINS.find((d) => host === d || host.endsWith('.' + d));
    if (domain) s += `; Domain=.${domain}`;
    if (loc && loc.protocol === 'https:') s += '; Secure';
    return s;
  }

  function readLegacy(storage, keys) {
    const out = [];
    for (const k of keys) {
      try { const v = storage && storage.getItem(k); if (v) out.push(v); } catch (e) { /* storage blocked */ }
    }
    return out;
  }

  function prefersLight(win) {
    return !!(win.matchMedia && win.matchMedia('(prefers-color-scheme: light)').matches);
  }

  function applyMode(doc, mode, light) {
    const applied = appliedTheme(mode, light);
    doc.documentElement.setAttribute('data-theme', applied);
    doc.documentElement.setAttribute('data-mode-choice', mode);
    return applied;
  }

  function boot(win) {
    const doc = win.document;
    let storage = null;
    try { storage = win.localStorage; } catch (e) { /* storage blocked */ }
    const cookieMode = readCookie(doc.cookie, MODE_COOKIE);
    const cookieLang = readCookie(doc.cookie, LANG_COOKIE);
    const fixedLang = doc.documentElement.getAttribute('data-lang') === 'fixed' ? doc.documentElement.getAttribute('lang') : null;
    const legacyTheme = readCookie(doc.cookie, LEGACY_THEME_COOKIE);
    const legacyThemes = readLegacy(storage, LEGACY_THEME_KEYS);
    const legacyLangs = readLegacy(storage, LEGACY_LANG_KEYS);
    const mode = resolveMode({ cookie: cookieMode, themeCookie: legacyTheme, legacy: legacyThemes });
    const lang = fixedLang || resolveLang({ cookie: cookieLang, legacy: legacyLangs, navigatorLanguages: (win.navigator && win.navigator.languages) || [] });
    // Carry a choice made under an older key over to the cookie; a default never becomes a cookie.
    const chosenMode = !normMode(cookieMode) && (legacyMode(legacyTheme) || firstValid(legacyThemes, legacyMode));
    if (chosenMode) doc.cookie = cookieString(MODE_COOKIE, chosenMode, win.location);
    const chosenLang = !fixedLang && !normLang(cookieLang) && firstValid(legacyLangs, normLang);
    if (chosenLang) doc.cookie = cookieString(LANG_COOKIE, chosenLang, win.location);
    applyMode(doc, mode, prefersLight(win));
    if (!fixedLang) doc.documentElement.setAttribute('lang', lang);
    // Marks that scripts run; shell.css styles a build-time page without JavaScript from its absence.
    doc.documentElement.setAttribute('data-js', '');
    return { mode, lang };
  }

  function setMode(win, mode) {
    const m = normMode(mode) || DEFAULT_MODE;
    win.document.cookie = cookieString(MODE_COOKIE, m, win.location);
    const applied = applyMode(win.document, m, prefersLight(win));
    win.dispatchEvent(new win.CustomEvent('dmc:prefs', { detail: { mode: m, applied } }));
    return applied;
  }

  function setLang(win, lang) {
    const l = normLang(lang) || DEFAULT_LANG;
    win.document.cookie = cookieString(LANG_COOKIE, l, win.location);
    win.document.documentElement.setAttribute('lang', l);
    win.dispatchEvent(new win.CustomEvent('dmc:prefs', { detail: { lang: l } }));
    return l;
  }

  g.DMCPrefs = {
    MODES, LANGS, readCookie, normMode, normLang, resolveMode, resolveLang, appliedTheme, cookieString, boot, setMode, setLang,
  };
  if (typeof window !== 'undefined' && window.document) g.DMCPrefs.state = boot(window);
})(globalThis);
