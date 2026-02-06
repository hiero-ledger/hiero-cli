/**
 * Accounts Command Input Schema
 */
import { z } from 'zod';

export const AccountsInputSchema = z.object({
  count: z.number().optional().default(3),
  balance: z.string().optional().default('10'),
  prefix: z.string().optional().default('test'),
});

export type AccountsInput = z.infer<typeof AccountsInputSchema>;
