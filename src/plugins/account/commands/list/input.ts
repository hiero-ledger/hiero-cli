import { z } from 'zod';

/**
 * Input schema for account list command
 * Validates arguments for listing all accounts
 */
export const AccountListInputSchema = z.object({
  private: z
    .boolean()
    .default(false)
    .describe('Include private key reference IDs in listing'),
});

export type AccountListInput = z.infer<typeof AccountListInputSchema>;
