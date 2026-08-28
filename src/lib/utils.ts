export function slugify(input: string) {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateOrderNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SC-${stamp}-${rand}`;
}

export function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Round-trips a value through JSON to strip Date instances etc. so it is safe
 * to pass from a Server Component into a Client Component prop typed as JSON-safe. */
export function serializeRows<T>(rows: unknown): T {
  return JSON.parse(JSON.stringify(rows)) as T;
}
