import { z } from 'zod';

/**
 * Input schema for account list command
 * Validates arguments for listing all accounts
 */
export const ListAccountsInputSchema = z.object({
  private: z
    .boolean()
    .default(false)
    .describe('Include private key reference IDs in listing'),
});

export type ListAccountsInput = z.infer<typeof ListAccountsInputSchema>;
