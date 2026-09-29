// Surfaces the backend's own message (including 401/403 authorization failures)
// and any per-field validation details, instead of a generic UI error.
export function apiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  const details = data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details
      .map((d: { field?: string; message?: string }) => (d.field ? `${d.field}: ${d.message}` : d.message))
      .join('; ');
  }
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (err?.response?.status === 403) return 'You do not have permission to perform this action.';
  return fallback;
}
