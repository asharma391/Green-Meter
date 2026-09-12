# Contributing

Use Node.js 22.12+ and run `npm ci`. Keep changes scoped and run `npm run format` and `npm run check` before opening a pull request.

Load the generated `dist/` folder as an unpacked Chrome extension to check browser behavior. `npm run dev` previews the popup with explicitly labeled demo data; it does not install the extension.

Changes to calculations or matching need regression tests. Document new permissions and external requests in `docs/privacy.md`. Keep source citations and methodological limitations visible. Do not add credentials, browsing records, or generated bundles to the repository.
