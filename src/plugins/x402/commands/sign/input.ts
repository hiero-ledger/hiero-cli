import { z } from 'zod';

import {
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const X402SignInputSchema = z.object({
  challenge: z
    .string()
    .min(1)
    .describe('Value of the PAYMENT-REQUIRED header from the 402 response'),
  from: KeySchema.optional().describe(
    'Payer account/key. Accepts any key format, key reference, or account name. Defaults to operator.',
  ),
  asset: EntityIdSchema.optional().describe(
    'Asset to pay with when the challenge offers several (0.0.0 = HBAR, or an HTS token id)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type X402SignInput = z.infer<typeof X402SignInputSchema>;
