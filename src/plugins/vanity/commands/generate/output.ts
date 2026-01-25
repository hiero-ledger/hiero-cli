/**
 * Vanity Generate Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EvmAddressSchema,
  PublicKeySchema,
} from '@/core/schemas/common-schemas';

/**
 * Vanity Generate Command Output Schema
 */
export const VanityGenerateOutputSchema = z.object({
  publicKey: PublicKeySchema,
  evmAddress: EvmAddressSchema,
  attempts: z.number().describe('Number of attempts taken'),
  timeElapsed: z.number().describe('Time elapsed in seconds'),
  prefix: z.string().describe('Matched prefix'),
  privateKeyRef: z.string().optional().describe('Private key reference ID'),
});

export type VanityGenerateOutput = z.infer<typeof VanityGenerateOutputSchema>;

/**
 * Human-readable template for vanity generate output
 */
export const VANITY_GENERATE_TEMPLATE = `
✅ Vanity address found!
   EVM Address: {{evmAddress}}
   Public Key: {{publicKey}}
   Matched Prefix: 0x{{prefix}}
   Attempts: {{attempts}}
   Time: {{timeElapsed}}s
{{#if privateKeyRef}}
   Key Reference: {{privateKeyRef}}
{{/if}}
`.trim();
