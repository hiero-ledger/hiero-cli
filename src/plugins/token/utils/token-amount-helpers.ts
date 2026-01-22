/**
 * Token Amount Helpers
 * Utility functions for handling token amount input with raw units support
 */

/**
 * Check if user input represents raw units (has 't' suffix)
 *
 * @param userAmountInput - User input amount (string or number)
 * @returns true if input has 't' suffix (raw units), false otherwise
 *
 * @example
 * isRawUnits('100t') // true
 * isRawUnits('100') // false
 * isRawUnits('100.5t') // true
 */
export function isRawUnits(userAmountInput: string | number): boolean {
  return String(userAmountInput).trim().endsWith('t');
}
