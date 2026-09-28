import { describe, it, expect } from '@jest/globals';
import { isCrossEntityViolation } from '../services/workforce.service.js';

describe('Workforce cross-entity guard — isCrossEntityViolation()', () => {
  it('is a no-op when neither side has an entity set (today\'s state — no backfill has run)', () => {
    expect(isCrossEntityViolation(undefined, undefined)).toBe(false);
  });

  it('is a no-op when only one side has an entity set', () => {
    expect(isCrossEntityViolation('64f000000000000000000001', undefined)).toBe(false);
    expect(isCrossEntityViolation(undefined, '64f000000000000000000001')).toBe(false);
  });

  it('allows assignment when both sides belong to the same entity', () => {
    expect(isCrossEntityViolation('64f000000000000000000001', '64f000000000000000000001')).toBe(false);
  });

  it('rejects assignment when both sides have different entities set', () => {
    expect(isCrossEntityViolation('64f000000000000000000001', '64f000000000000000000002')).toBe(true);
  });
});
