// Settings over USB on /guides/settings/: each area's block sends its radio preset and its repeater
// commands to a repeater on USB. It reads the current values first, shows them next to the new ones, then sends
// each command and shows the reply. Placeholders such as YOUR_PROVINCE come from the page's editable fields.
import { supported, getFor, valueOf, needsReboot, fillIn, shownValue, accepted } from './serial-core.js';
import { SerialLink } from './serial-port.js';

const blocks = [...document.querySelectorAll('[data-usb]')];
if (blocks.length && supported(navigator)) {
  let link = null, owner = null;
  const ends = new Map();

  // A cable pulled while connected ends the block that owns the link.
  navigator.serial.addEventListener('disconnect', () => { if (owner) ends.get(owner)('lost'); });

  for (const root of blocks) {
    const $ = (sel) => root.querySelector(sel);
    const msg = (key) => root.closest('[data-usb-text]').getAttribute(`data-${key}`);
    const status = $('[data-status]'), table = $('tbody'), connect = $('[data-connect]'), send = $('[data-send]');
    const reboot = $('[data-reboot]'), disconnect = $('[data-disconnect]'), check = $('[data-check]');
    const say = (key, extra = '') => { status.textContent = msg(key) + extra; };
    root.hidden = false;

    const area = root.closest('.area, .country');
    // The area's commands with the reader's own values filled in from the editable fields above.
    const commands = () => {
      // The same placeholder can stand in several commands; the first one the reader filled in counts.
      const fills = {};
      for (const el of area.querySelectorAll('[data-ph]')) { const v = el.textContent.trim(); if (v && v !== el.dataset.ph && !fills[el.dataset.ph]) fills[el.dataset.ph] = v; }
      return fillIn(JSON.parse(root.dataset.commands), fills);
    };
    // A value to fill in by its field's name (Your province), as it reads inside a sentence.
    const named = (ph) => {
      const label = area.querySelector(`[data-ph="${ph}"]`)?.getAttribute('aria-label') || ph;
      return label.charAt(0).toLocaleLowerCase(document.documentElement.lang || 'en') + label.slice(1);
    };

    const row = (cmd) => {
      const tr = document.createElement('tr');
      for (const text of [cmd, '', getFor(cmd) ? valueOf(cmd) : '', '']) { const td = document.createElement('td'); td.className = 'mono'; td.textContent = text; tr.append(td); }
      table.append(tr);
      return tr;
    };

    const end = async (key) => {
      if (owner === root) { await link?.close(); link = null; owner = null; }
      connect.hidden = false; check.hidden = true; send.hidden = true; disconnect.hidden = true; reboot.hidden = true;
      if (key) say(key);
    };

    ends.set(root, end);
    connect.addEventListener('click', async () => {
      if (link && owner && owner !== root) await ends.get(owner)('idle');
      else if (link) await link.close();
      let port;
      try { port = await navigator.serial.requestPort(); } catch { return; }
      link = new SerialLink(port); owner = root;
      try { await link.open(); } catch { link = null; owner = null; say('busy'); return; }
      connect.hidden = true; disconnect.hidden = false; check.hidden = false; say('connected');
    });

    check.addEventListener('click', async () => {
      const { commands: cmds, missing } = commands();
      if (missing.length) { status.textContent = msg('fill').replace('{value}', named(missing[0])); return; }
      table.replaceChildren(); say('reading');
      for (const cmd of cmds) {
        const tr = row(cmd);
        const get = getFor(cmd);
        if (get) { const now = await link.command(get); tr.children[1].textContent = now === null ? msg('no_answer') : shownValue(now); }
      }
      root.querySelector('table').hidden = false; send.hidden = false; say('review');
    });

    send.addEventListener('click', async () => {
      send.disabled = true; let restart = false; let failed = 0;
      const rows = [...table.children];
      for (const tr of rows) {
        const reply = await link.command(tr.children[0].textContent);
        tr.children[3].textContent = reply ?? msg('no_answer');
        if (!accepted(reply)) failed += 1;
        if (needsReboot(reply)) restart = true;
      }
      send.disabled = false;
      say(failed ? 'sent_errors' : 'sent');
      reboot.hidden = !restart;
    });

    reboot.addEventListener('click', async () => { await link.command('reboot', 1000); await end('rebooted'); });
    disconnect.addEventListener('click', () => end('idle'));
  }
}
