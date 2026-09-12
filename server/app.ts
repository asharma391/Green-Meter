import express from 'express';
export interface ApiOptions {
  token?: string;
  fetcher?: typeof fetch;
  now?: () => number;
}
export function createApp({
  token,
  fetcher = fetch,
  now = Date.now,
}: ApiOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  const cache = new Map<string, { expires: number; value: unknown }>();
  const inFlight = new Map<string, Promise<unknown>>();
  let windowStart = now();
  let calls = 0;
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (
      origin &&
      (/^chrome-extension:\/\/[a-p]{32}$/.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
    )
      res.set('Access-Control-Allow-Origin', origin).vary('Origin');
    else if (origin) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    next();
  });
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', providerConfigured: !!token });
  });
  app.get('/api/intensity/:zone', async (req, res) => {
    const zone = String(req.params.zone).toUpperCase();
    if (!/^[A-Z0-9-]{2,20}$/.test(zone)) {
      res.status(400).json({ error: 'Invalid zone' });
      return;
    }
    if (!token) {
      res.status(503).json({ error: 'Set ELECTRICITYMAPS_KEY on the server.' });
      return;
    }
    if (now() - windowStart >= 60000) {
      windowStart = now();
      calls = 0;
    }
    if (++calls > 60) {
      res
        .status(429)
        .set('Retry-After', '60')
        .json({ error: 'Try again in a minute.' });
      return;
    }
    const saved = cache.get(zone);
    if (saved && saved.expires > now()) {
      res.json(saved.value);
      return;
    }
    try {
      let job = inFlight.get(zone);
      if (!job) {
        job = (async () => {
          const response = await fetcher(
            `https://api.electricitymaps.com/v4/carbon-intensity/latest?zone=${encodeURIComponent(zone)}&disableCallerLookup=true`,
            {
              headers: { 'auth-token': token },
              signal: AbortSignal.timeout(8000),
            },
          );
          if (!response.ok) throw new Error('Provider request failed');
          const data = await response.json();
          if (
            !Number.isFinite(data.carbonIntensity) ||
            data.carbonIntensity < 0 ||
            data.carbonIntensity > 3000 ||
            typeof data.datetime !== 'string' ||
            !Number.isFinite(Date.parse(data.datetime))
          )
            throw new Error('Invalid provider response');
          const age = now() - Date.parse(data.datetime);
          if (age > 24 * 3600000 || age < -3600000)
            throw new Error('Stale provider response');
          const value = {
            zone,
            carbonIntensity: data.carbonIntensity,
            datetime: data.datetime,
            source: 'Electricity Maps',
          };
          if (cache.size >= 200) cache.delete(cache.keys().next().value!);
          cache.set(zone, { expires: now() + 15 * 60000, value });
          return value;
        })();
        inFlight.set(zone, job);
      }
      res.json(await job);
    } catch {
      res.status(502).json({
        error: 'Grid data unavailable. Check your token and zone coverage.',
      });
    } finally {
      inFlight.delete(zone);
    }
  });
  return app;
}
