import BigNumber from 'bignumber.js';

import { HBAR_DECIMALS } from '@/core/shared/constants';

/**
 * Processes user balance input with intelligent unit detection.
 *
 * Detects whether input is a display value (display units) or raw base units (with 't' suffix).
 * Converts both formats to raw units for internal API usage.
 *
 * Format rules:
 * - Default (no suffix): treat as display units, multiply by 10^decimals
 *  - Example: '1.5' with 8 decimals → BigNumber(150000000) raw units
 * - With 't' suffix: treat as raw base units, use as-is (no conversion)
 *  - Example: '100t' → BigNumber(100) raw units (exact, no decimals applied)
 *
 * @param input - Balance input from user (string or number)
 * @param decimals - Number of decimal places (default: 8 for HBAR)
 * @returns Raw amount as BigNumber (ready for API calls)
 *
 * @throws Error if format is invalid (fractional raw units, wrong case, etc.)
 *
 * @example
 * // Display units (default) - multiply by 10^decimals
 * processBalanceInput('1', 8)      // BigNumber(100000000) (1 HBAR → 100000000 tinybar)
 * processBalanceInput('1.5', 8)    // BigNumber(150000000) (1.5 HBAR → 150000000 tinybar)
 * processBalanceInput('1.5', 6)    // BigNumber(1500000)   (1.5 TOKEN → 1500000 units)
 *
 * @example
 * // Raw units with 't' suffix - no conversion, direct value
 * processBalanceInput('100t', 8)   // BigNumber(100) (100 tinybar, exact)
 * processBalanceInput('1000000t', 6) // BigNumber(1000000) (1000000 token units, exact)
 *
 * @example
 * // Errors
 * processBalanceInput('1.5t', 8)   // Error: "Invalid raw units: fractional value not allowed"
 * processBalanceInput('100T', 8)   // Error: "Invalid format: 't' suffix must be lowercase"
 * processBalanceInput('-100', 8)   // Error: "Invalid balance: cannot be negative"
 */
export function processBalanceInput(
  input: string | number,
  decimals: number = HBAR_DECIMALS,
): bigint {
  const inputStr = String(input).trim();

  // Check if input ends with lowercase 't' (raw units indicator)
  const hasRawUnitsSuffix = inputStr.endsWith('t');
  return hasRawUnitsSuffix
    ? parseWholeNumber(inputStr)
    : parseDecimalNumber(inputStr, decimals);
}

function parseWholeNumber(balance: string) {
  // Extract value without 't' suffix
  const rawValue = balance.slice(0, -1).trim();

  // Validate it's a valid integer (no decimals allowed for raw units)
  if (!/^[0-9]+$/.test(rawValue)) {
    throw new Error(
      `Invalid raw units: "${balance}". Must be an integer without decimals (fractional raw units not allowed).`,
    );
  }
  return BigInt(rawValue);
}

function parseDecimalNumber(balance: string, decimals: number): bigint {
  // Validate decimals
  if (decimals < 0) {
    throw new Error(
      `Invalid decimals: ${decimals}. Must be a non-negative integer.`,
    );
  }

  // Check for NaN string
  if (balance === 'NaN') {
    throw new Error(
      `Unable to parse balance: "${balance}", balance after parsing is Not a Number.`,
    );
  }

  // Check for negative
  if (balance.startsWith('-')) {
    throw new Error(
      `Invalid balance: "${balance}". Balance cannot be negative.`,
    );
  }

  // Check format for valid decimal number
  if (!/^\d+(\.\d+)?$/.test(balance)) {
    throw new Error(`Invalid balance: "${balance}".`);
  }

  // Parse into BigNumber
  const bn = new BigNumber(balance);

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
  return BigInt(result.toFixed(0));
}
