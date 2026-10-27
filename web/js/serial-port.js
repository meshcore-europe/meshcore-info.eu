// One USB serial connection to a MeshCore node for the tools that send commands and wait for the reply
//: open a port, send a command, get its reply line, close. Uses web/js/serial-core.js.
import { BAUD, encodeCommand, LineSplitter, replyOf } from './serial-core.js';

export class SerialLink {
  constructor(port) { this.port = port; this.waiters = []; this.onLine = () => {}; }

  async open() {
    await this.port.open({ baudRate: BAUD });
    this.writer = this.port.writable.getWriter();
    const decoder = new TextDecoderStream();
    this.piped = this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();
    this.loop();
  }

  async loop() {
    const splitter = new LineSplitter();
    try {
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) break;
        for (const line of splitter.feed(value)) {
          this.onLine(line);
          const reply = replyOf(line);
          if (reply !== null && this.waiters.length) this.waiters.shift()(reply);
        }
      }
    } catch { /* closed */ }
    this.waiters.splice(0).forEach((w) => w(null));
  }

  // Sends a command and resolves with its reply, or null when the node does not answer in time.
  command(text, timeout = 3000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { const i = this.waiters.indexOf(done); if (i >= 0) this.waiters.splice(i, 1); resolve(null); }, timeout);
      const done = (reply) => { clearTimeout(timer); resolve(reply); };
      this.waiters.push(done);
      this.writer.write(new TextEncoder().encode(encodeCommand(text))).catch(() => done(null));
    });
  }

  async close() {
    try { await this.reader?.cancel(); } catch {}
    try { this.writer?.releaseLock(); } catch {}
    try { await this.port.close(); } catch {}
  }
}
