# meshcore-info.eu

The source of [meshcore-info.eu](https://meshcore-info.eu), the non-commercial
community guide to MeshCore in Europe, written and translated by volunteers.

## Help

- Add your community, a device or a project with the
  [issue forms](https://github.com/meshcore-europe/meshcore-info.eu/issues/new/choose).
- Improve a translation in
  [meshcore-europe/meshcore-info.eu_i18n](https://github.com/meshcore-europe/meshcore-info.eu_i18n).
- No GitHub account? Tell us on [Discord](https://discord.meshcore-info.eu/).

[CONTRIBUTING.md](CONTRIBUTING.md) has the details.

## Pull requests

We never merge pull requests in this repository. It is a published copy of
the site, and each publish replaces its files. A maintainer copies your change
to the repository where we work on the site, with you as co-author. When the
change is live, they close your pull request with a link to it.

Translations work differently. Fix them in
[meshcore-europe/meshcore-info.eu_i18n](https://github.com/meshcore-europe/meshcore-info.eu_i18n):
pull requests there are merged.

## Run it on your computer

You need Node, the version in `.node-version`.

```sh
npm ci
npm run build                # writes the site to dist/
npx wrangler dev             # serves dist/ at http://localhost:8787/en/
```

## Licence

Code under the MIT licence ([LICENSE](LICENSE)). Text, translations and data
under CC BY 4.0 ([LICENSE-content](LICENSE-content)).
