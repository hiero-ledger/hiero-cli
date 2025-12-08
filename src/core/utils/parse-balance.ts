import BigNumber from 'bignumber.js';

/**
 * Parses a human-readable decimal balance to raw integer representation.
 *
 * @param balance - Human-readable balance (string, number, or BigInt)
 * @param decimals - Token decimal places (default: 8)
 * @returns Raw balance as BigNumber
 *
 * @example
 * parseBalance('1', 8)        // BigNumber(100000000)
 * parseBalance('1.5', 6)      // BigNumber(1500000)
 * parseBalance('0.999999', 6) // BigNumber(999999)
 */

export function parseBalance(
  balance: string | number | bigint,
  decimals: number = 8,
): bigint {
  // Validate decimals
  if (decimals < 0) {
    throw new Error(
      `Invalid decimals: ${decimals}. Must be a non-negative integer.`,
    );
  }

  // Convert to string for validation
  const balanceStr = String(balance).trim();

  // Check for NaN string
  if (balanceStr === 'NaN') {
    throw new Error(
      `Unable to parse balance: "${balance}", balance after parsing is Not a Number.`,
    );
  }

  // Check for negative
  if (balanceStr.startsWith('-')) {
    throw new Error(
      `Invalid balance: "${balance}". Balance cannot be negative.`,
    );
  }

  // Check format for valid decimal number
  if (!/^\d+(\.\d+)?$/.test(balanceStr)) {
    throw new Error(`Invalid balance: "${balance}".`);
  }

  // Parse into BigNumber
  const bn = new BigNumber(balanceStr);

  // Validate using BigNumber methods
  if (bn.isNaN()) {
    throw new Error(
      `Unable to parse balance: "${balance}", balance after parsing is Not a Number.`,
    );
  }

  if (bn.isNegative()) {
    throw new Error(
      `Invalid balance: "${balance}". Balance cannot be negative.`,
    );
  }

  // Check decimal places don't exceed allowed
  const actualDecimals = bn.decimalPlaces();
  if (actualDecimals !== null && actualDecimals > decimals) {
    throw new Error(`Invalid balance: "${balance}". Too many decimal places.`);
  }

  // Convert to raw units by multiplying by 10^decimals
  // This replaces string concatenation with pure BigNumber arithmetic
  const result = bn.shiftedBy(decimals);

  return BigInt(result.toString());
}
