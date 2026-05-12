/**
 * Clear Accounts Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Clear Accounts Command Output Schema
 */
export const AccountClearOutputSchema = z.object({
  clearedCount: z.number(),
});

export type AccountClearOutput = z.infer<typeof AccountClearOutputSchema>;

/**
 * Human-readable template for clear accounts output
 */
export const ACCOUNT_CLEAR_TEMPLATE = `
✅ Cleared {{clearedCount}} account(s) from the address book
`.trim();
