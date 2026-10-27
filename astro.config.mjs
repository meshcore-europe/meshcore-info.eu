// The Astro build of meshcore-info.eu. It reads the same content, strings and data as the Hugo
// build next to it, and writes dist/. Static output only; no inline scripts or styles, so the strict CSP
// in static/_headers holds unchanged.
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { BASE_URL } from './src/lib/site.mjs';
import { remarkHeadingIds } from './src/lib/remark-heading-ids.mjs';
import { remarkShortcodes } from './src/lib/remark-shortcodes.mjs';
import { rehypeSiteLinks } from './src/lib/rehype-site-links.mjs';
import { finishBuild } from './src/lib/finish-build.mjs';

export default defineConfig({
  site: BASE_URL,
  output: 'static',
  trailingSlash: 'always',
  outDir: './dist',
  publicDir: './web',
  build: { format: 'directory', inlineStylesheets: 'never' },
  markdown: {
    // Plain <pre><code>: highlighters emit style="" attributes, which the CSP forbids.
    syntaxHighlight: false,
    processor: unified({ remarkPlugins: [remarkHeadingIds, remarkShortcodes], rehypePlugins: [rehypeSiteLinks] }),
  },
  integrations: [finishBuild()],
});
