// The serial line handling for the USB tools, without a browser, so tests can run it.
// MeshCore's repeater, room server and sensor read a command up to '\r' at 115200 baud, echo it, and answer
// in lines (examples/simple_repeater/main.cpp, MeshCore 1.18.0).

export const BAUD = 115200;

// A command as the node reads it: the text and a carriage return.
export const encodeCommand = (text) => `${text.trim()}\r`;

// Splits incoming text into lines. A reply may arrive in pieces; feed() returns only whole lines and keeps
// the rest for the next call. '\r\n', '\n' and a lone '\r' all end a line.
export class LineSplitter {
  constructor() { this.rest = ''; this.afterCr = false; }
  feed(text) {
    // A '\r\n' split over two chunks: the '\r' already ended the line, so the '\n' is not a new one.
    if (this.afterCr && text.startsWith('\n')) text = text.slice(1);
    this.afterCr = text.endsWith('\r');
    const parts = (this.rest + text).split(/\r\n|\n|\r(?!$)/);
    this.rest = parts.pop();
    if (this.rest.endsWith('\r')) { parts.push(this.rest.slice(0, -1)); this.rest = ''; }
    return parts;
  }
  flush() { const r = this.rest; this.rest = ''; return r ? [r] : []; }
}

// The command history behind the arrow keys: up goes back, down goes forward, past the newest is empty.
export class History {
  constructor(max = 100) { this.items = []; this.pos = 0; this.max = max; }
  add(cmd) {
    if (cmd && this.items[this.items.length - 1] !== cmd) this.items.push(cmd);
    if (this.items.length > this.max) this.items.shift();
    this.pos = this.items.length;
  }
  up() { if (this.pos > 0) this.pos -= 1; return this.items[this.pos] ?? ''; }
  down() { if (this.pos < this.items.length) this.pos += 1; return this.items[this.pos] ?? ''; }
}

// Whether this browser can open a serial port from a web page.
export const supported = (nav) => Boolean(nav && 'serial' in nav);

// A reply line as the node prints it ('  -> ' and the reply), or null for any other line (the echo, logs).
export const replyOf = (line) => (line.startsWith('  -> ') ? line.slice(5).replace(/^> /, '') : null);

// The get that reads what a set command changes: 'set radio a,b,c,d' -> 'get radio'. Null when there is none.
export const getFor = (cmd) => {
  const m = /^set\s+(\S+)\s+/.exec(cmd.trim());
  return m ? `get ${m[1]}` : null;
};

// The value a set command writes: 'set dutycycle 10' -> '10'.
export const valueOf = (cmd) => cmd.trim().replace(/^set\s+\S+\s+/, '');

// Whether a reply asks for a restart before the change takes effect.
export const needsReboot = (reply) => /reboot to apply/i.test(reply || '');

// A value as the reader compares it: 'get radio' prints the frequency as a float (869.6179809), 'get dutycycle'
// a percentage (10.0%). Rounds the first and drops the second, so Now and New match when nothing changes.
export const shownValue = (v) => {
  if (/^\d+\.\d{4,},/.test(v)) { const [f, ...rest] = v.split(','); return [String(Math.round(parseFloat(f) * 1000) / 1000), ...rest].join(','); }
  return v.replace(/^(\d+)(?:\.0+)?%$/, '$1');
};

// Whether a reply means the node took the command: it starts with OK, or names the new default region.
// 'unknown config', 'Unknown command' and every Err reply do not.
export const accepted = (reply) => reply !== null && /^(ok|\s*default scope)/i.test(reply);

// Values to fill in that a repeater does without: a city only where the area uses one (the Regions block says
// so), so a command still holding it is left out instead of holding up the rest.
const OPTIONAL = ['YOUR_CITY'];

// The commands with the reader's values (fills, by placeholder) put in, and the placeholders still missing,
// such as YOUR_PROVINCE, in the order they come.
export const fillIn = (cmds, fills) => {
  const commands = [], missing = [];
  for (const cmd of cmds) {
    const line = cmd.replace(/YOUR_[A-Z]+/g, (ph) => fills[ph] || ph);
    const left = line.match(/YOUR_[A-Z]+/g) || [];
    if (left.some((ph) => OPTIONAL.includes(ph))) continue;
    for (const ph of left) if (!missing.includes(ph)) missing.push(ph);
    commands.push(line);
  }
  return { commands, missing };
};

// The roles a node on USB answers to 'get role' (FIRMWARE_ROLE in each example, MeshCore 1.18.0); a companion
// speaks the app's protocol on USB and never gets here.
export const ROLES = ['repeater', 'room_server', 'sensor'];

// The role in the reply to 'get role', or null for any other reply.
export const roleOf = (reply) => (ROLES.includes((reply || '').trim()) ? reply.trim() : null);

// The version in the reply to 'ver': 'v1.18.0-81dbae5 (Build: 15-Oct-2026)' -> 'v1.18.0'. Null when there is none.
export const versionOf = (reply) => {
  const m = /^(v\d+(?:\.\d+)+)/.exec((reply || '').trim());
  return m ? m[1] : null;
};

// Whether 'ver' names DutchMeshCore firmware, whose builds put '-dutchmeshcore.nl' in the version.
export const isDmc = (reply) => /-dutchmeshcore\.nl\b/.test(reply || '');

// The commands to suggest for what the reader typed. commands: [{ id, forms, desc, nodes }] from
// data/commands.yaml. The forms that start with the text; when none does, the forms that hold every typed word,
// then those whose description holds them, so 'name' finds 'set owner.info' too. A value (<name>) is no word. Only commands the role takes; without a role, those of every role in ROLES.
export const suggest = (commands, typed, role, max = 6) => {
  const q = typed.replace(/\s+/g, ' ').trimStart().toLowerCase();
  const words = q.split(' ').filter(Boolean);
  if (!words.length) return [];
  const roles = role ? [role] : ROLES;
  const starts = [], inForm = [], inDesc = [];
  for (const c of commands) {
    if (!c.nodes.some((n) => roles.includes(n))) continue;
    for (const form of c.forms) {
      const f = form.toLowerCase();
      const hit = { id: c.id, form, desc: c.desc };
      const bare = f.replace(/<[^>]*>/g, '');
      if (f.startsWith(q)) starts.push({ ...hit, typed: q.length });
      else if (words.every((w) => bare.includes(w))) inForm.push({ ...hit, typed: 0 });
      else if (words.every((w) => `${bare} ${c.desc.toLowerCase()}`.includes(w))) inDesc.push({ ...hit, typed: 0 });
    }
  }
  return (starts.length ? starts : [...inForm, ...inDesc]).slice(0, max);
};

// What Tab puts in the command line: the form up to its first value, 'set name <name>' -> 'set name '.
export const fillOf = (form) => form.split('<')[0];
