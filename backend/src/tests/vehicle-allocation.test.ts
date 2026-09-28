import { describe, it, expect } from '@jest/globals';
import { rangesOverlap } from '../services/vehicle-allocation.service.js';

describe('Vehicle double-booking guard — rangesOverlap()', () => {
  const d = (s: string) => new Date(s);

  it('rejects two allocations covering the exact same window', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: d('2026-03-01') }, { start: d('2026-01-01'), end: d('2026-03-01') })).toBe(true);
  });

  it('rejects a partially overlapping window', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: d('2026-03-01') }, { start: d('2026-02-15'), end: d('2026-04-01') })).toBe(true);
  });

  it('rejects one range fully nested inside another', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: d('2026-06-01') }, { start: d('2026-02-01'), end: d('2026-03-01') })).toBe(true);
  });

  it('allows two back-to-back, non-overlapping windows', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: d('2026-02-01') }, { start: d('2026-03-01'), end: d('2026-04-01') })).toBe(false);
  });

  it('treats a missing end date as open-ended (ongoing), so a later window still conflicts', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: null }, { start: d('2026-06-01'), end: d('2026-07-01') })).toBe(true);
  });

  it('allows a new allocation that starts only after an existing open-ended one is understood to have ended (both open-ended still conflicts by design — must be closed first)', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: null }, { start: d('2027-01-01'), end: null })).toBe(true);
  });

  it('treats touching at a single boundary instant as overlapping (inclusive boundaries — safer default for a physical asset)', () => {
    expect(rangesOverlap({ start: d('2026-01-01'), end: d('2026-02-01') }, { start: d('2026-02-01'), end: d('2026-03-01') })).toBe(true);
  });
});
