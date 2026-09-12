export interface Settings {
  intensity: number;
  energyPerGB: number;
  paused: boolean;
  intensitySource: string;
}
export interface OriginUsage {
  origin: string;
  bytes: number;
  requests: number;
}
export interface MeterState {
  version: 2;
  startedAt: string;
  origins: Record<string, OriginUsage>;
  unmeasured: number;
  settings: Settings;
}
export const defaults: Settings = {
  intensity: 400,
  energyPerGB: 0.81,
  paused: false,
  intensitySource: 'Illustrative assumption',
};
export function emptyState(): MeterState {
  return {
    version: 2,
    startedAt: new Date().toISOString(),
    origins: {},
    unmeasured: 0,
    settings: { ...defaults },
  };
}
export function estimateGrams(
  bytes: number,
  intensity: number,
  energyPerGB: number,
): number {
  if (
    ![bytes, intensity, energyPerGB].every((v) => Number.isFinite(v) && v >= 0)
  )
    throw new Error('Model inputs must be finite and non-negative.');
  return (bytes / 1e9) * energyPerGB * intensity;
}
export function contentLength(
  headers: { name: string; value?: string }[] = [],
): number | null {
  const value = headers.find(
    (h) => h.name.toLowerCase() === 'content-length',
  )?.value;
  if (value === undefined || !/^\d+$/.test(value)) return null;
  const bytes = Number(value);
  return Number.isSafeInteger(bytes) ? bytes : null;
}
export function hostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.hostname
      : null;
  } catch {
    return null;
  }
}
export function validSettings(value: unknown): value is Settings {
  const s = value as Settings | null;
  return (
    !!s &&
    typeof s.paused === 'boolean' &&
    Number.isFinite(s.intensity) &&
    s.intensity >= 0 &&
    s.intensity <= 3000 &&
    Number.isFinite(s.energyPerGB) &&
    s.energyPerGB > 0 &&
    s.energyPerGB <= 10 &&
    typeof s.intensitySource === 'string' &&
    s.intensitySource.length <= 160
  );
}
export function addObservation(
  state: MeterState,
  origin: string,
  bytes: number | null,
): MeterState {
  if (state.settings.paused) return state;
  if (bytes === null) return { ...state, unmeasured: state.unmeasured + 1 };
  if (!Number.isSafeInteger(bytes) || bytes < 0) return state;
  const key =
    Object.hasOwn(state.origins, origin) ||
    Object.keys(state.origins).length < 200
      ? origin
      : 'Other domains';
  const previous = Object.hasOwn(state.origins, key)
    ? state.origins[key]
    : { origin: key, bytes: 0, requests: 0 };
  return {
    ...state,
    origins: {
      ...state.origins,
      [key]: {
        origin: key,
        bytes: previous.bytes + bytes,
        requests: previous.requests + 1,
      },
    },
  };
}
export function summarize(state: MeterState) {
  const rows = Object.values(state.origins).sort((a, b) => b.bytes - a.bytes);
  const bytes = rows.reduce((total, row) => total + row.bytes, 0);
  const requests = rows.reduce((total, row) => total + row.requests, 0);
  return {
    rows,
    bytes,
    requests,
    grams: estimateGrams(
      bytes,
      state.settings.intensity,
      state.settings.energyPerGB,
    ),
  };
}

export function validState(value: unknown): value is MeterState {
  if (!value || typeof value !== 'object') return false;
  const state = value as MeterState;
  return (
    state.version === 2 &&
    validSettings(state.settings) &&
    typeof state.startedAt === 'string' &&
    Number.isFinite(Date.parse(state.startedAt)) &&
    Number.isSafeInteger(state.unmeasured) &&
    state.unmeasured >= 0 &&
    !!state.origins &&
    typeof state.origins === 'object' &&
    !Array.isArray(state.origins) &&
    Object.keys(state.origins).length <= 201 &&
    Object.entries(state.origins).every(
      ([key, row]) =>
        !!row &&
        row.origin === key &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes >= 0 &&
        Number.isSafeInteger(row.requests) &&
        row.requests >= 0,
    )
  );
}
