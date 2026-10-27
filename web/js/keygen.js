// The key generator on /guides/keygen/: reads the prefix, tries keys in this browser with
// web/js/keygen-core.js, and shows the command for the first key that matches. Nothing leaves the browser.
import { findKey, isPrefix, supported } from './keygen-core.js';

const root = document.querySelector('[data-keygen]');
if (root) {
  const $ = (sel) => root.querySelector(sel);
  const form = $('form'), input = $('input[name="prefix"]'), make = $('[data-make]'), stop = $('[data-stop]');
  const status = $('[data-status]'), result = $('[data-result]');
  const say = (key, n) => { status.textContent = root.getAttribute(`data-${key}`).replace('{n}', (n || 0).toLocaleString(document.documentElement.lang || 'en')); };
  let running = false;

  supported(crypto.subtle).then((ok) => {
    $('[data-needs-js]').hidden = true;
    if (!ok) { say('unsupported'); status.hidden = false; return; }
    form.hidden = false;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prefix = input.value.trim().toLowerCase();
    if (!isPrefix(prefix)) { input.setAttribute('aria-invalid', 'true'); say('bad'); return; }
    input.removeAttribute('aria-invalid');
    running = true; make.disabled = true; stop.hidden = false; result.hidden = true;
    say('working', 0);
    const key = await findKey(crypto.subtle, prefix, (n) => { say('working', n); return running; });
    running = false; make.disabled = false; stop.hidden = true;
    if (!key) { say('stopped'); return; }
    say('done', key.tries);
    $('[data-public]').textContent = key.publicKey;
    $('[data-command]').textContent = `set prv.key ${key.privateKey}`;
    result.hidden = false;
  });
  stop.addEventListener('click', () => { running = false; });
}
