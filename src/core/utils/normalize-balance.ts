import BigNumber from 'bignumber.js';

/**
 * Converts a raw integer balance to human-readable decimal format.
 *
 * @param balance - The raw balance value as BigNumber
 * @param decimals - The number of decimal places for the token (default: 8)
 * @returns A string representation of the balance in decimal format

 * @example
 * // HBAR balance (8 decimals) - 1 HBAR = 100000000 tinybar
 * normalizeBalance(new BigNumber(100000000), 8)   // "1"
 * normalizeBalance(new BigNumber(999999), 6)      // "0.999999"
 */
export function normalizeBalance(
  balance: BigNumber,
  decimals: number = 8,
): string {
  // Validate decimals parameter
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(
      `Decimals must be a non-negative integer, got: ${decimals}`,
    );
  }

  // Check for negative balance using BigNumber method
  if (balance.isNegative()) {
    throw new Error(`Balance cannot be negative: ${balance.toString()}`);
  }

  // Convert from raw units to decimal by dividing by 10^decimals
  // This replaces string padding/slicing with pure BigNumber arithmetic
  const decimal = balance.shiftedBy(-decimals);

  // Use toFixed() to prevent exponential notation (e.g., "4.2e-7")
  // and ensure fixed-point decimal format (e.g., "0.00000042")
  const fixed = decimal.toFixed(decimals);

  // Remove trailing zeros and unnecessary decimal point
  // "1.50000000" -> "1.5", "1.00000000" -> "1"
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}
