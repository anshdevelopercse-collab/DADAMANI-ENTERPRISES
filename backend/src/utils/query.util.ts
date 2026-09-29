/**
 * Escapes special PCRE characters so user-supplied search strings are treated
 * as literals in MongoDB $regex queries. Also caps length to prevent excessively
 * long patterns that could cause slow query plans.
 */
export function escapeRegex(raw: string, maxLength = 100): string {
  return raw
    .slice(0, maxLength)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
