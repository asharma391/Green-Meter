import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type ApiOptions } from '../server/app';
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});
async function start(options: ApiOptions = {}) {
  const server = createApp(options).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  return `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
}
const now = Date.parse('2026-09-12T12:00:00Z');
const good = () =>
  Response.json({ carbonIntensity: 0, datetime: '2026-09-12T11:45:00Z' });
describe('grid-intensity API', () => {
  it('reports missing configuration without pretending to have live data', async () => {
    const base = await start();
    expect(await (await fetch(`${base}/health`)).json()).toEqual({
      status: 'ok',
      providerConfigured: false,
    });
    expect((await fetch(`${base}/api/intensity/CA-ON`)).status).toBe(503);
  });
  it('validates zones before making a provider request', async () => {
    const fetcher = vi.fn();
    const base = await start({ token: 'test', fetcher });
    expect((await fetch(`${base}/api/intensity/invalid_zone`)).status).toBe(
      400,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('caches fresh validated data, including zero intensity', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => good());
    const base = await start({ token: 'test', fetcher, now: () => now });
    const first = await (await fetch(`${base}/api/intensity/ca-on`)).json();
    expect(first).toMatchObject({ carbonIntensity: 0, zone: 'CA-ON' });
    await fetch(`${base}/api/intensity/CA-ON`);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://api.electricitymaps.com/v4/carbon-intensity/latest?zone=CA-ON&disableCallerLookup=true',
    );
  });
  it('coalesces concurrent provider calls for the same zone', async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return good();
    });
    const base = await start({ token: 'test', fetcher, now: () => now });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => fetch(`${base}/api/intensity/CA-ON`)),
    );
    expect(responses.every((response) => response.ok)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects stale, malformed, and failed responses without leaking the token', async () => {
    for (const payload of [
      { carbonIntensity: '123', datetime: '2026-09-12T11:00:00Z' },
      { carbonIntensity: 123, datetime: '2023-01-01' },
    ]) {
      const base = await start({
        token: 'private-test-token',
        fetcher: async () => Response.json(payload),
        now: () => now,
      });
      const response = await fetch(`${base}/api/intensity/CA-ON`);
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain('private-test-token');
    }
  });
  it('rejects unrelated web origins', async () => {
    const base = await start();
    expect(
      (
        await fetch(`${base}/health`, {
          headers: { Origin: 'https://example.com' },
        })
      ).status,
    ).toBe(403);
  });
});
