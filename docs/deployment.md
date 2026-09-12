# Local API deployment

The extension is installed from `dist/`. The optional API is a separate process; neither Docker nor an API key is required for the default extension experience.

## Node

```bash
npm ci
npm run build
cp .env.example .env
# Set ELECTRICITYMAPS_KEY in .env
node --env-file=.env dist-api/index.js
```

The default address is `127.0.0.1:3000`. `GET /health` returns process health and provider configuration status. The API does not automatically geolocate the user or infer server locations.

## Docker Compose

```bash
docker compose up --build
```

Compose reads the token from `.env`. The multi-stage build includes only production dependencies and the bundled API in the final image. The process runs as the `node` user with a read-only filesystem and no Linux capabilities; the host port binds to `127.0.0.1`.

The image health check verifies HTTP process health, not provider entitlement. Test a zone from the popup to verify your provider account. The repository includes the container recipe; an actual image build requires a working Docker installation.

## Browser packaging

`npm run build` emits a self-contained `dist/` folder. Zip its contents for distribution or, after enabling the workflow template, download the `browser-extension` artifact from a successful GitHub Actions run. No Chrome Web Store publication is implied. Reload the unpacked extension after rebuilding.
