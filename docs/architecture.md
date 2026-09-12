# Architecture

## Boundaries

| Module                    | Responsibility                                                | External effects                        |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| `src/core/carbon.ts`      | Types, validation, aggregation, unit conversion               | None                                    |
| `src/background/index.ts` | Observe completed requests; serialize state changes           | Chrome request events and local storage |
| `src/popup/client.ts`     | Typed message adapter and synthetic preview state             | Extension messages                      |
| `src/popup/App.tsx`       | Dashboard, assumptions, export, and explicit zone lookup      | Local API only when requested           |
| `server/app.ts`           | Validated provider proxy, cache, timeouts, request coalescing | Electricity Maps                        |

## State and lifecycle

The service worker registers its listeners at module evaluation. Each observation, reset, and settings change enters one promise queue. The operation reads persisted state, computes the next snapshot, and writes it before the next operation begins. The queue absorbs errors so one failed write does not poison later updates.

Chrome may terminate an idle worker. State lives in `chrome.storage.local`, not just global variables, and no polling interval is required. The dashboard refreshes from `storage.onChanged`. Up to 200 domains are stored individually; additional domains merge into an “Other domains” bucket. Reset clears the observations and retains model settings.

The modernized state uses a versioned `meter` key. Unversioned data from the old prototype is not imported because it uses a different model and schema. Remove/reinstall the extension to delete any old local keys.

## API boundary

`GET /health` reports process health and whether a provider token is configured. `GET /api/intensity/:zone` accepts a bounded zone identifier and returns `{ zone, carbonIntensity, datetime, source }`.

Successful provider data is cached for 15 minutes, bounded to 200 zones. Concurrent lookups of one zone share a request. Upstream requests have an eight-second timeout. Values must be finite, within the supported model range, and dated within the previous 24 hours (with one hour of future tolerance). Errors are explicit HTTP responses: 400 invalid zone, 503 missing configuration, 429 local rate limit, 502 provider failure. Provider bodies and credentials are not reflected in errors.

The provider adapter uses the [Electricity Maps v4 API](https://app.electricitymaps.com/docs/quickstart/authorization) with an explicit zone and caller-location fallback disabled.

The local API has a process-wide limit of 60 lookup requests per minute. It binds to loopback by default. CORS permits Chromium extension origins and localhost development origins. This is a local development service; a shared internet deployment would need authentication, exact extension-origin configuration, TLS, and a deployment-specific rate limiter.

## Build and tradeoffs

Vite packages the React popup. esbuild generates a standalone module worker and the Node API entrypoint. Content security policy allows packaged scripts only. The extension has no remote code dependency.

A database and cluster scheduler would not improve this single-user extension’s current data flow. The optional API has a real multi-stage Docker image, while browser state stays in Chrome’s storage.

References: [Chrome request observation](https://developer.chrome.com/docs/extensions/reference/api/webRequest), [worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [Vite production build](https://vite.dev/guide/build).
