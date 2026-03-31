export function resolveFieldUpdate<T>(
  newVal: T | null | undefined,
  existing: T | undefined,
): T | undefined {
  if (newVal === null) return undefined;
  if (newVal !== undefined) return newVal;
  return existing;
}
