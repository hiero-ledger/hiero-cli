/**
 * HBAR Plugin Schema
 * Single source of truth for HBAR plugin data structure and validation
 */
import { z } from 'zod';
import { AccountIdKeyPairSchema } from '../../core/schemas';

// Input schema for HBAR transfer command
export const TransferInputSchema = z.object({
  amount: z.string().describe('Amount to transfer'),
  to: z.string().min(1).describe('Account ID or name to transfer to'),
  from: z
    .union([AccountIdKeyPairSchema, z.string().min(1)])
    .optional()
    .describe('AccountID:privateKey pair or account name to transfer from'),
  memo: z.string().optional().describe('Memo for the transfer'),
});

// TypeScript type inferred from Zod schema
export type TransferInput = z.infer<typeof TransferInputSchema>;
