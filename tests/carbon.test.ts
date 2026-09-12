import { describe, expect, it } from 'vitest';
import {
  addObservation,
  contentLength,
  emptyState,
  estimateGrams,
  hostname,
  summarize,
  validSettings,
} from '../src/core/carbon';
describe('carbon estimation', () => {
  it('uses decimal GB and preserves zero grid intensity', () => {
    expect(estimateGrams(1e9, 400, 0.81)).toBe(324);
    expect(estimateGrams(1e9, 0, 0.81)).toBe(0);
    expect(() => estimateGrams(-1, 400, 0.81)).toThrow();
    expect(() => estimateGrams(Infinity, 400, 0.81)).toThrow();
  });
  it('distinguishes missing or invalid lengths from a real zero-byte response', () => {
    expect(contentLength()).toBeNull();
    expect(contentLength([{ name: 'Content-Length', value: '0' }])).toBe(0);
    for (const value of ['-1', '23oops', '1.5', '9007199254740992'])
      expect(contentLength([{ name: 'content-length', value }])).toBeNull();
  });
  it('parses origins without storing paths, queries, or credentials', () => {
    expect(
      hostname('https://user:pass@example.com:443/private?token=sample'),
    ).toBe('example.com');
    expect(hostname('chrome-extension://abc/page')).toBeNull();
    expect(hostname('broken')).toBeNull();
  });
  it('aggregates observations immutably and respects pause', () => {
    const initial = emptyState();
    let next = addObservation(initial, 'example.com', 1e9);
    next = addObservation(next, 'example.com', 1e9);
    next = addObservation(next, 'missing.example', null);
    expect(summarize(next)).toMatchObject({
      bytes: 2e9,
      grams: 648,
      requests: 2,
    });
    expect(next.unmeasured).toBe(1);
    expect(initial.origins).toEqual({});
    next.settings.paused = true;
    expect(addObservation(next, 'example.com', 10)).toBe(next);
  });
  it('bounds retained origins without losing aggregate bytes', () => {
    let state = emptyState();
    for (let i = 0; i < 250; i++)
      state = addObservation(state, `${i}.example`, 100);
    expect(Object.keys(state.origins)).toHaveLength(201);
    expect(summarize(state).bytes).toBe(25000);
    expect(state.origins['Other domains'].requests).toBe(50);
  });
  it('handles prototype-like hostnames safely', () => {
    const state = addObservation(emptyState(), '__proto__', 100);
    expect(summarize(state).bytes).toBe(100);
  });
  it('validates settings before storage', () => {
    const settings = emptyState().settings;
    expect(validSettings(settings)).toBe(true);
    expect(validSettings({ ...settings, intensity: 0 })).toBe(true);
    expect(validSettings({ ...settings, intensity: NaN })).toBe(false);
    expect(validSettings({ ...settings, energyPerGB: 0 })).toBe(false);
    expect(
      validSettings({ ...settings, intensitySource: 'x'.repeat(161) }),
    ).toBe(false);
  });
});
