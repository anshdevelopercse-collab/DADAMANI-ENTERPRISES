// Indian Rupee formatting with lakh/crore grouping; paise are always shown as two digits.
export function formatINR(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const hasPaise = Math.abs(n * 100 - Math.round(n) * 100) > 1e-6;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
}
