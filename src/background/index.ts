import {
  addObservation,
  contentLength,
  emptyState,
  hostname,
  validSettings,
  validState,
  type MeterState,
} from '../core/carbon';

// Register listeners synchronously. Serialize read-modify-write operations so reset,
// settings changes, and simultaneous responses cannot overwrite each other.
let pending: Promise<unknown> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = pending.then(work);
  pending = next.catch(() => undefined);
  return next;
}
async function read(): Promise<MeterState> {
  const data = await chrome.storage.local.get('meter');
  return validState(data.meter) ? data.meter : emptyState();
}
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (
      details.tabId < 0 ||
      details.fromCache ||
      details.statusCode < 200 ||
      details.statusCode >= 300
    )
      return;
    const origin = hostname(details.initiator ?? '') ?? hostname(details.url);
    if (!origin) return;
    void enqueue(async () => {
      const state = await read();
      if (state.settings.paused) return;
      await chrome.storage.local.set({
        meter: addObservation(
          state,
          origin,
          contentLength(details.responseHeaders),
        ),
      });
    }).catch((error) =>
      console.error('Could not persist Green Meter observation', error),
    );
  },
  { urls: ['http://*/*', 'https://*/*'] },
  ['responseHeaders'],
);

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  void enqueue(async () => {
    const current = await read();
    let meter = current;
    if (message?.type === 'reset')
      meter = { ...emptyState(), settings: current.settings };
    else if (message?.type === 'settings' && validSettings(message.settings))
      meter = { ...current, settings: message.settings };
    else if (message?.type !== 'read') throw new Error('Invalid request');
    if (meter !== current) await chrome.storage.local.set({ meter });
    return meter;
  })
    .then((meter) => respond({ ok: true, meter }))
    .catch(() => respond({ ok: false, error: 'Unable to update local data.' }));
  return true;
});
