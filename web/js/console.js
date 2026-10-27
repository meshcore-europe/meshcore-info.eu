// The serial console on /firmware/console/: opens the node's USB port with Web Serial, shows what
// the node says and sends the commands typed, with web/js/serial-core.js. Nothing leaves the browser. On connect it
// asks the node for its role and version, and suggests the commands that role takes while you type.
import { BAUD, encodeCommand, LineSplitter, History, supported, replyOf, roleOf, versionOf, isDmc, suggest, fillOf } from './serial-core.js';

const root = document.querySelector('[data-console]');
if (root) {
  const $ = (sel) => root.querySelector(sel);
  const msg = (key) => root.getAttribute(`data-${key}`);
  const ui = $('[data-ui]'), log = $('[data-log]'), form = $('form'), input = $('input[name="command"]');
  const connect = $('[data-connect]'), disconnect = $('[data-disconnect]'), copy = $('[data-copy]'), status = $('[data-status]');
  const history = new History();
  const commands = JSON.parse(root.dataset.commands);
  const node = $('[data-node]'), dmc = $('[data-dmc]'), box = $('[data-suggest]'), list = box.querySelector('ul'), more = $('[data-more]');
  let port = null, reader = null, writer = null, closing = false;
  let role = null, waiters = [], shown = [], active = 0;

  const say = (key) => { status.textContent = msg(key); };
  const append = (line, cls) => {
    const row = document.createElement('div');
    if (cls) row.className = cls;
    row.textContent = line;
    log.append(row);
    log.scrollTop = log.scrollHeight;
  };
  const setConnected = (on) => {
    connect.hidden = on; disconnect.hidden = !on; input.disabled = !on; form.querySelector('button').disabled = !on;
    if (on) input.focus();
    else { node.hidden = true; dmc.hidden = true; role = null; hide(); }
  };

  // Sends a command and resolves with its reply line, or null when the node does not answer in time.
  const ask = (text, timeout = 3000) => new Promise((resolve) => {
    const done = (reply) => { clearTimeout(timer); resolve(reply); };
    const timer = setTimeout(() => { waiters = waiters.filter((w) => w !== done); resolve(null); }, timeout);
    waiters.push(done);
    send(text).catch(() => done(null));
  });
  const send = (text) => writer.write(new TextEncoder().encode(encodeCommand(text)));

  // What the node is: its role and version above the log, and a link to the DutchMeshCore commands on its firmware.
  async function probe() {
    const answer = await ask('get role');
    role = roleOf(answer);
    // A reply that comes after the timeout must not be read as the answer to ver.
    if (answer === null) await new Promise((r) => setTimeout(r, 500));
    const ver = await ask('ver');
    $('[data-role]').hidden = !role;
    $('[data-role]').textContent = role ? msg(`role-${role}`) : '';
    $('[data-version]').textContent = versionOf(ver) || '';
    $('[data-node-known]').hidden = !role;
    $('[data-node-unknown]').hidden = Boolean(role);
    node.hidden = false;
    dmc.hidden = !isDmc(ver);
  }

  // The suggestion list, a combobox listbox: arrows choose, Tab fills in, Esc closes, Enter sends what is typed.
  function hide() { box.hidden = true; shown = []; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function pick(i) {
    active = i;
    [...list.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
    input.setAttribute('aria-activedescendant', `console-s${i}`);
    more.href = `${root.dataset.guide}#cmd-${shown[i].id}`;
    more.textContent = msg('more_link').replace('{command}', shown[i].form.split(' <')[0]);
  }
  function render() {
    shown = input.disabled ? [] : suggest(commands, input.value, role);
    if (!shown.length) { hide(); return; }
    list.replaceChildren(...shown.map((hit, i) => {
      const li = document.createElement('li'), f = document.createElement('span'), d = document.createElement('span');
      li.id = `console-s${i}`; li.setAttribute('role', 'option');
      f.className = 'form'; d.className = 'desc'; d.textContent = hit.desc;
      if (hit.typed) { const b = document.createElement('b'); b.textContent = hit.form.slice(0, hit.typed); f.append(b); }
      f.append(hit.form.slice(hit.typed));
      li.append(f, d);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); fill(i); });
      return li;
    }));
    box.hidden = false; input.setAttribute('aria-expanded', 'true');
    pick(0);
  }
  function fill(i) { input.value = fillOf(shown[i].form); input.focus(); render(); }

  $('[data-needs-js]').hidden = true;
  if (!supported(navigator)) { say('unsupported'); }
  else { ui.hidden = false; say('idle'); }

  async function readLoop() {
    const splitter = new LineSplitter();
    const decoder = new TextDecoderStream();
    const done = port.readable.pipeTo(decoder.writable).catch(() => {});
    reader = decoder.readable.getReader();
    try {
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        splitter.feed(value).forEach((line) => {
          append(line);
          if (replyOf(line) !== null && waiters.length) waiters.shift()(replyOf(line));
        });
      }
    } catch { /* the port went away; handled below */ }
    splitter.flush().forEach((line) => append(line));
    reader.releaseLock();
    await done;
  }

  async function close(key) {
    if (closing) return;
    closing = true;
    try { await reader?.cancel(); } catch {}
    try { writer?.releaseLock(); } catch {}
    try { await port?.close(); } catch {}
    waiters.splice(0).forEach((w) => w(null));
    port = reader = writer = null; closing = false;
    setConnected(false); say(key);
  }

  connect.addEventListener('click', async () => {
    try { port = await navigator.serial.requestPort(); } catch { say('idle'); return; }
    try { await port.open({ baudRate: BAUD }); }
    catch { port = null; say('busy'); return; }
    writer = port.writable.getWriter();
    readLoop().then(() => { if (port) close('lost'); });
    say('asking');
    await probe();
    if (port) { setConnected(true); say('connected'); }
  });

  disconnect.addEventListener('click', () => close('idle'));
  navigator.serial?.addEventListener('disconnect', (e) => { if (e.target === port) close('lost'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cmd = input.value.trim();
    if (!cmd || !writer) return;
    history.add(cmd);
    input.value = '';
    hide();
    try { await send(cmd); }
    catch { close('lost'); }
  });

  input.addEventListener('input', render);
  input.addEventListener('blur', hide);
  // A press in the list keeps the focus in the command line, so the link to the CLI guide can be clicked.
  box.addEventListener('mousedown', (e) => e.preventDefault());
  input.addEventListener('keydown', (e) => {
    if (shown.length) {
      if (e.key === 'ArrowUp') { e.preventDefault(); pick((active + shown.length - 1) % shown.length); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); pick((active + 1) % shown.length); return; }
      // Tab leaves the field once the command line already holds the choice, so it never traps the keyboard.
      if (e.key === 'Tab' && !e.shiftKey && input.value !== fillOf(shown[active].form)) { e.preventDefault(); fill(active); return; }
      if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); window.open(more.href, '_blank', 'noopener'); return; }
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); input.value = history.up(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); input.value = history.down(); }
  });

  copy.addEventListener('click', async () => {
    const text = [...log.children].map((r) => r.textContent).join('\n');
    try { await navigator.clipboard.writeText(text); say('copied'); } catch { say('copy_failed'); }
  });
}
