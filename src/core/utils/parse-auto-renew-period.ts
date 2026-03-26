const DURATION_SUFFIX_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * Parses auto-renew period CLI/file input into seconds for Hedera `TokenCreateTransaction.setAutoRenewPeriod`.
 *
 * - Plain integer (no suffix) → seconds (e.g. `500` → 500)
 * - `500s` → 500 seconds
 * - `50m` → minutes → seconds
 * - `2h` → hours → seconds
 * - `1d` → days → seconds
 */
export function parseAutoRenewPeriodToSeconds(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Auto-renew period cannot be empty');
  }

  const withSuffix = trimmed.match(/^(\d+)([smhd])$/i);
  if (withSuffix) {
    const n = parseInt(withSuffix[1], 10);
    const mult = DURATION_SUFFIX_SECONDS[withSuffix[2].toLowerCase()];
    if (!mult) {
      throw new Error(`Unsupported suffix in "${raw}"`);
    }
    return n * mult;
  }

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  throw new Error(
    `Invalid auto-renew period "${raw}". Use a non-negative integer (seconds), or add suffix s, m, h, or d (e.g. 500, 500s, 50m, 2h, 1d).`,
  );
}
