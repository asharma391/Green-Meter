import { emptyState, type MeterState, type Settings } from '../core/carbon';
export const isExtension =
  typeof chrome !== 'undefined' && !!chrome.runtime?.id;
let demo: MeterState = {
  ...emptyState(),
  unmeasured: 14,
  origins: {
    'video.example': {
      origin: 'video.example',
      bytes: 184000000,
      requests: 32,
    },
    'design.example': {
      origin: 'design.example',
      bytes: 48000000,
      requests: 81,
    },
    'docs.example': { origin: 'docs.example', bytes: 18000000, requests: 54 },
  },
};
export async function request(
  type: 'read' | 'reset' | 'settings',
  settings?: Settings,
): Promise<MeterState> {
  if (!isExtension) {
    if (type === 'reset') demo = { ...emptyState(), settings: demo.settings };
    if (type === 'settings' && settings) demo = { ...demo, settings };
    return { ...demo };
  }
  const response = await chrome.runtime.sendMessage({ type, settings });
  if (!response?.ok)
    throw new Error(
      response?.error ??
        'Extension is unavailable. Reload it in chrome://extensions.',
    );
  return response.meter;
}
