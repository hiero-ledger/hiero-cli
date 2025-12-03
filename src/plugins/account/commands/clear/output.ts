/**
 * Clear Accounts Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Clear Accounts Command Output Schema
 */
export const ClearAccountsOutputSchema = z.object({
  clearedCount: z.number(),
});

export type ClearAccountsOutput = z.infer<typeof ClearAccountsOutputSchema>;

/**
 * Human-readable template for clear accounts output
 */
export const CLEAR_ACCOUNTS_TEMPLATE = `
✅ Cleared {{clearedCount}} account(s) from the address book
`.trim();
