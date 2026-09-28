/**
 * Pure finance-validation helpers — no I/O, no Mongo — so the money-handling
 * rules that matter most (over-adjustment, negative/zero amounts) can be unit
 * tested directly, the same way rangesOverlap() and isCrossEntityViolation()
 * are tested elsewhere in this codebase.
 */

export function getRemainingAmount(total: number, alreadyAdjusted: number): number {
  return Math.round((total - alreadyAdjusted) * 100) / 100;
}

/**
 * Returns a human-readable rejection reason, or null if the adjustment is valid.
 */
export function validateAdjustmentAmount(
  amountAdjusted: number,
  remainingAdvance: number,
  remainingInvoice: number
): string | null {
  if (!(amountAdjusted > 0)) {
    return 'Adjustment amount must be greater than zero';
  }
  if (amountAdjusted > remainingAdvance) {
    return `Adjustment of ${amountAdjusted} exceeds the remaining advance balance of ${remainingAdvance}`;
  }
  if (amountAdjusted > remainingInvoice) {
    return `Adjustment of ${amountAdjusted} exceeds the remaining payable amount of ${remainingInvoice} on this invoice`;
  }
  return null;
}

export function assertPositiveAmount(amount: number, fieldLabel: string = 'Amount'): string | null {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return `${fieldLabel} must be a positive number`;
  }
  return null;
}
