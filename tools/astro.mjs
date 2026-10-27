#!/usr/bin/env node
// Runs the Astro CLI with telemetry off: `node tools/astro.mjs build` is `astro build`.
// The npm scripts go through here because an inline `VAR=1 astro ...` needs a POSIX shell, and npm
// runs scripts in cmd.exe on Windows.
process.env.ASTRO_TELEMETRY_DISABLED = '1';
await import(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
