export function isRawUnits(userAmountInput: string | number): boolean {
  return String(userAmountInput).trim().endsWith('t');
}
