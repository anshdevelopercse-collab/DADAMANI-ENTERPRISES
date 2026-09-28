import { describe, it, expect } from '@jest/globals';
import { getRemainingAmount, validateAdjustmentAmount, assertPositiveAmount } from '../services/finance-validation.util.js';

describe('Finance validation — getRemainingAmount()', () => {
  it('computes remaining as amount minus already-adjusted', () => {
    expect(getRemainingAmount(100000, 60000)).toBe(40000);
  });

  it('matches the brief\'s worked example: 60,000 advance, 100,000 invoice, 60,000 adjustment -> 40,000 payable', () => {
    const advanceRemaining = getRemainingAmount(60000, 0);
    const invoiceRemaining = getRemainingAmount(100000, 0);
    expect(validateAdjustmentAmount(60000, advanceRemaining, invoiceRemaining)).toBeNull();
    expect(getRemainingAmount(100000, 60000)).toBe(40000);
    expect(getRemainingAmount(60000, 60000)).toBe(0);
  });
});

describe('Finance validation — validateAdjustmentAmount()', () => {
  it('rejects a zero-value adjustment', () => {
    expect(validateAdjustmentAmount(0, 60000, 100000)).toMatch(/greater than zero/);
  });

  it('rejects a negative adjustment', () => {
    expect(validateAdjustmentAmount(-500, 60000, 100000)).toMatch(/greater than zero/);
  });

  it('rejects an adjustment greater than the remaining advance balance', () => {
    expect(validateAdjustmentAmount(70000, 60000, 100000)).toMatch(/remaining advance balance/);
  });

  it('rejects an adjustment greater than the invoice\'s remaining payable amount', () => {
    expect(validateAdjustmentAmount(90000, 100000, 50000)).toMatch(/remaining payable amount/);
  });

  it('allows a valid partial adjustment', () => {
    expect(validateAdjustmentAmount(30000, 60000, 100000)).toBeNull();
  });

  it('allows a full adjustment that exactly exhausts the remaining advance', () => {
    expect(validateAdjustmentAmount(60000, 60000, 100000)).toBeNull();
  });
});

describe('Finance validation — assertPositiveAmount()', () => {
  it('rejects zero and negative amounts', () => {
    expect(assertPositiveAmount(0)).not.toBeNull();
    expect(assertPositiveAmount(-1)).not.toBeNull();
  });

  it('allows a positive amount', () => {
    expect(assertPositiveAmount(1)).toBeNull();
  });
});
