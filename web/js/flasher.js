// The flasher on /firmware/flasher/. Lists the boards of the latest MeshCore release from
// /data/firmware.json (tools/update_firmware.py). An ESP32 board is flashed over USB with esptool-js, the file
// coming through /fw-proxy; an nRF52 board gets its UF2 file to drag onto its USB drive.
import { supported } from './serial-core.js';

const root = document.querySelector('[data-flasher]');
if (root) {
  const $ = (sel) => root.querySelector(sel);
  const msg = (key) => root.getAttribute(`data-${key}`);
  const board = $('select[name="board"]'), role = $('select[name="role"]'), filter = $('input[name="filter"]');
  const esp = $('[data-esp]'), uf2 = $('[data-uf2]'), status = $('[data-status]'), progress = $('progress');
  const flash = $('[data-flash]'), wipeOk = $('input[name="wipe-ok"]'), uf2Link = $('[data-uf2-link]');
  const say = (text) => { status.textContent = text; };
  let boards = [];

  const ROLES = ['companion_radio_ble', 'companion_radio_usb', 'repeater', 'room_server'];
  const mode = () => root.querySelector('input[name="mode"]:checked').value;
  const current = () => boards.find((b) => b.id === board.value)?.roles[role.value];

  function fillBoards() {
    const q = filter.value.trim().toLowerCase();
    const keep = board.value;
    const found = boards.filter((b) => !q || b.name.toLowerCase().includes(q));
    board.replaceChildren(...found.map((b) => new Option(b.name, b.id)));
    $('[data-no-match]').hidden = found.length > 0;
    if ([...board.options].some((o) => o.value === keep)) board.value = keep;
    fillRoles();
  }
  function fillRoles() {
    const b = boards.find((x) => x.id === board.value);
    const keep = role.value;
    role.replaceChildren(...(b ? ROLES.filter((r) => b.roles[r]).map((r) => new Option(msg(`role_${r}`), r)) : []));
    if ([...role.options].some((o) => o.value === keep)) role.value = keep;
    show();
  }
  function show() {
    const f = current();
    say('');
    esp.hidden = !f || f.kind !== 'esp32';
    uf2.hidden = !f || f.kind !== 'uf2';
    if (f?.kind === 'uf2') { uf2Link.href = f.uf2; uf2Link.textContent = f.uf2.split('/').pop(); }
    flash.disabled = !f || (mode() === 'fresh' && !wipeOk.checked);
    $('[data-wipe-confirm]').hidden = mode() !== 'fresh';
    if (f?.kind === 'esp32' && !supported(navigator)) { flash.disabled = true; say(msg('unsupported')); }
  }

  fetch('/data/firmware.json').then((r) => r.json()).then((data) => {
    boards = data.boards;
    $('[data-version]').textContent = data.version;
    $('[data-needs-js]').hidden = true;
    $('[data-ui]').hidden = false;
    fillBoards();
  }).catch(() => say(msg('no_list')));

  filter.addEventListener('input', fillBoards);
  board.addEventListener('change', fillRoles);
  role.addEventListener('change', show);
  root.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', show));
  wipeOk.addEventListener('change', show);

  flash.addEventListener('click', async () => {
    const f = current();
    if (!f || f.kind !== 'esp32') return;
    const fresh = mode() === 'fresh';
    let port, transport;
    try { port = await navigator.serial.requestPort(); } catch { return; }
    flash.disabled = true; progress.hidden = false; progress.value = 0; say('');
    try {
      const { ESPLoader, Transport } = await import('/vendor/esptool-js/esptool-0.7.0.js');
      say(msg('downloading'));
      const res = await fetch(`/fw-proxy?url=${encodeURIComponent(fresh ? f.merged : f.bin)}`);
      if (!res.ok) throw new Error('download');
      const data = new Uint8Array(await res.arrayBuffer());
      say(msg('connecting'));
      transport = new Transport(port);
      // 921600 as esptool-js's own example; the chip falls back to its ROM speed when it cannot.
      const loader = new ESPLoader({ transport, baudrate: 921600, terminal: { clean() {}, writeLine() {}, write() {} } });
      await loader.main();
      say(msg('flashing'));
      await loader.writeFlash({
        fileArray: [{ data, address: fresh ? 0x0 : 0x10000 }],
        flashMode: 'keep', flashFreq: 'keep', flashSize: 'keep', eraseAll: fresh, compress: true,
        reportProgress: (_i, written, total) => { progress.value = Math.round((written / total) * 100); },
      });
      await loader.after('hard_reset');
      progress.value = 100;
      say(msg('done'));
    } catch (e) {
      say(e && e.message === 'download' ? msg('no_file') : msg('failed'));
    } finally {
      try { await transport?.disconnect(); } catch {}
      flash.disabled = false;
    }
  });
}
