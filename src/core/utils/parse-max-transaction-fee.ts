import { Hbar } from '@hiero-ledger/sdk';

import { processBalanceInput } from '@/core/utils/process-balance-input';

/**
 * Parses a stored/flag max-transaction-fee value into an Hbar ceiling.
 *
 * Accepts the same unit convention as the rest of the CLI:
 * - HBAR by default (e.g. '20' → 20 ℏ)
 * - tinybars with a 't' suffix (e.g. '200000000t')
 *
 * Returns `undefined` (meaning "no override, use SDK default") when the value
 * is empty or resolves to zero ('0' / '0t'). Negative or malformed values throw
 * via {@link processBalanceInput}.
 *
 * @param raw - Raw config/flag value (empty string means unset)
 * @returns An Hbar ceiling, or undefined when no ceiling should be applied
 */
export function parseMaxTransactionFee(raw: string): Hbar | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }

  const tinybars = processBalanceInput(trimmed);
  if (tinybars === 0n) {
    return undefined;
  }

  return Hbar.fromTinybars(tinybars.toString());
}
