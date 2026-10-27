# Contributing to meshcore-info.eu

This site is a non-commercial guide to MeshCore in Europe, written and
translated by volunteers. Most of what you change is Markdown, YAML or JSON.

## Ground rules

- **No shop links, affiliate links, referral codes or tracking parameters**,
  anywhere. Devices are listed with specs only.
- **Write in your own words.** Short quotes with their source only.
- **Cite primary sources**: the MeshCore repository and docs (note the
  firmware version), ERC Recommendation 70-03, ETSI EN 300 220 or a national
  regulator, and manufacturer documentation.
- **English is the source.** `content/en/` and `data/i18n/en.json` hold the
  source text. Every other language is translated from it.
- **No third-party requests** from the built site: no external scripts,
  styles, fonts, images or embeds.

## Suggest a change

Open an issue with the matching form: add a community, a device, a project or
an area, suggest new content, or report a wrong translation. A maintainer
does the rest.

## Pull requests

We never merge pull requests in this repository. It is a published copy of
the site, and each publish replaces its files. A maintainer copies your change
to the repository where we work on the site, with you as co-author. When the
change is live, they close your pull request with a link to it.

Translations work differently. Fix them in
[meshcore-europe/meshcore-info.eu_i18n](https://github.com/meshcore-europe/meshcore-info.eu_i18n):
pull requests there are merged. Its README explains how.

## Where things are

| What | Where |
|---|---|
| English pages | `content/en/<page>.md` |
| Communities, projects, devices, maps, area settings | `data/<name>.yaml`, with a JSON Schema in `data/schema/` |
| Interface text (English) | `data/i18n/en.json` |
| Page templates and components | `src/` |
| Styles, scripts, images, fonts | `web/` |
| The Worker that serves the site | `preview/worker.js` |

## Run it on your computer

You need Node, the version in `.node-version`.

```sh
npm ci
npm run build                # writes the site to dist/
npx wrangler dev             # serves dist/ at http://localhost:8787/en/
```
