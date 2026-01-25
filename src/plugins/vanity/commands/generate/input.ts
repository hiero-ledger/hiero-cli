import { z } from 'zod';

import { AccountNameSchema, KeyTypeSchema } from '@/core/schemas';
import { KeyAlgorithm } from '@/core/shared/constants';

/**
 * Input schema for vanity account generation
 */
export const VanityGenerateInputSchema = z.object({
  prefix: z
    .string()
    .regex(
      /^(0x)?[0-9a-fA-F]{1,8}$/,
      'Prefix must be 1-8 hex characters (optionally with 0x)',
    )
    .transform((val) => val.toLowerCase().replace(/^0x/, ''))
    .describe('Hex prefix to match (e.g., "dead", "0x1234")'),
  maxAttempts: z
    .number()
    .int()
    .min(100)
    .max(10000000)
    .default(1000000)
    .describe('Maximum key generation attempts (default: 1M)'),
  timeout: z
    .number()
    .int()
    .min(1)
    .max(3600)
    .default(60)
    .describe('Timeout in seconds (default: 60)'),
  name: AccountNameSchema.optional().describe('Optional account name/alias'),
  keyType: KeyTypeSchema.default(KeyAlgorithm.ECDSA).describe(
    'Key type (must be ECDSA for vanity addresses)',
  ),
});

export type VanityGenerateInput = z.infer<typeof VanityGenerateInputSchema>;
