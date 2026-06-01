export function toFiniteNumberId(
  value: unknown,
  fallback?: number | null
): number | null {
  if (value == null) return fallback ?? null;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return fallback ?? null;
  return n;
}

