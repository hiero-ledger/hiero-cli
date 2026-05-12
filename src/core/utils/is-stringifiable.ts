/**
 * Type guard to check if a value can be safely stringified
 * Checks if the value is a primitive type that can be converted to string
 */
export function isStringifiable(
  value: unknown,
): value is string | number | boolean | bigint {
  const type = typeof value;
  return (
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'bigint'
  );
}
