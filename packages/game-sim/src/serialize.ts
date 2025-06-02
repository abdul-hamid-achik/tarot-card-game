export function deepSortKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepSortKeys(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, deepSortKeys(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  const sorted = deepSortKeys(value);
  return JSON.stringify(sorted, null, 2);
}
