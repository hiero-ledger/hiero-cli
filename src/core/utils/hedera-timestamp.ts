/**
 * Converts Hedera Mirror Node timestamp to ISO 8601 format.
 * Mirror Node returns timestamps as "seconds.nanoseconds" (e.g. "1768898341.551352532").
 * Returns null when format does not match.
 */
export function hederaTimestampToIso(timestamp: string): string | null {
  const regex = /^(\d+)\.\d+$/;
  const match = timestamp.match(regex);
  if (!match) return null;

  return new Date(Number(match[1]) * 1000).toISOString();
}
