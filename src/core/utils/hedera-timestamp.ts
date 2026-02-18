/**
 * Converts Hedera Mirror Node timestamp to ISO 8601 format.
 * Mirror Node returns timestamps as "seconds.nanoseconds" (e.g. "1768898341.551352532").
 * @throws Error when format does not match (Mirror Node always returns valid format)
 */
export function hederaTimestampToIso(timestamp: string): string {
  const regex = /^(\d+)\.\d+$/;
  const match = timestamp.match(regex);

  if (!match) {
    throw new Error(
      `Invalid Hedera timestamp format: expected "seconds.nanoseconds", got "${timestamp}"`,
    );
  }

  return new Date(Number(match[1]) * 1000).toISOString();
}
