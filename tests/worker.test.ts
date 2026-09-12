import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyState } from '../src/core/carbon';
type MessageListener = (
  message: unknown,
  sender: unknown,
  reply: (value: unknown) => void,
) => boolean;
type EventListener = (details: Record<string, unknown>) => void;
let stored: Record<string, unknown>;
let onCompleted: EventListener;
let onMessage: MessageListener;
async function boot() {
  vi.resetModules();
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-extension',
      onMessage: {
        addListener: (listener: MessageListener) => {
          onMessage = listener;
        },
      },
    },
    webRequest: {
      onCompleted: {
        addListener: (listener: EventListener) => {
          onCompleted = listener;
        },
      },
    },
    storage: {
      local: {
        get: async () => structuredClone(stored),
        set: async (value: Record<string, unknown>) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          Object.assign(stored, structuredClone(value));
        },
      },
    },
  });
  await import('../src/background/index');
}
async function message(value: unknown) {
  return new Promise<{ ok: boolean; meter: ReturnType<typeof emptyState> }>(
    (resolve) => {
      onMessage(
        value,
        { id: 'test-extension' },
        resolve as (value: unknown) => void,
      );
    },
  );
}
const response = {
  tabId: 1,
  fromCache: false,
  statusCode: 200,
  initiator: 'https://example.com',
  url: 'https://cdn.example/a',
  responseHeaders: [{ name: 'content-length', value: '100' }],
};
beforeEach(async () => {
  stored = {};
  await boot();
});
describe('worker persistence and message ordering', () => {
  it('serializes concurrent responses without lost updates', async () => {
    for (let i = 0; i < 25; i++) onCompleted(response);
    const result = await message({ type: 'read' });
    expect(result.meter.origins['example.com']).toMatchObject({
      bytes: 2500,
      requests: 25,
    });
  });
  it('survives worker restart and resets before subsequent observations', async () => {
    onCompleted(response);
    await message({ type: 'read' });
    await boot();
    onCompleted(response);
    expect(
      (await message({ type: 'read' })).meter.origins['example.com'].bytes,
    ).toBe(200);
    const resetting = message({ type: 'reset' });
    onCompleted(response);
    await resetting;
    expect(
      (await message({ type: 'read' })).meter.origins['example.com'].bytes,
    ).toBe(100);
  });
  it('ignores cached, failed, and background requests', async () => {
    onCompleted({ ...response, fromCache: true });
    onCompleted({ ...response, statusCode: 404 });
    onCompleted({ ...response, tabId: -1 });
    expect((await message({ type: 'read' })).meter.origins).toEqual({});
  });
  it('recovers from invalid storage and rejects malformed settings', async () => {
    stored = {
      meter: { version: 2, settings: emptyState().settings, origins: 'bad' },
    };
    expect((await message({ type: 'read' })).ok).toBe(true);
    expect((await message({ type: 'settings', settings: {} })).ok).toBe(false);
  });
});
