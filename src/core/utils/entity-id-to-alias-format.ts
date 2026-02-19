/**
 * Converts Hedera entity ID (e.g. 0.0.123456) to alias-safe format (0-0-123456).
 * Used when generating default names for imported entities.
 */
export function entityIdToAliasSafeFormat(entityId: string): string {
  return entityId.replace(/\./g, '-');
}
