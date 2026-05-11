import { z } from 'zod';

import { EvmAddressSchema } from '@/core/schemas';

export const Eip712SignOutputSchema = z.object({
  signerEvm: EvmAddressSchema.describe('EVM address of the signer'),
  signature: z
    .string()
    .describe('Combined 65-byte signature (0x-prefixed hex)'),
  r: z.string().describe('Signature r component'),
  s: z.string().describe('Signature s component'),
  v: z.number().describe('Signature v component (27 or 28)'),
});

export type Eip712SignOutput = z.infer<typeof Eip712SignOutputSchema>;

export const EIP712_SIGN_TEMPLATE = `
EIP-712 Signature
─────────────────────────────────────────────────
Signer (EVM):  {{signerEvm}}
Signature:     {{signature}}
  r:           {{r}}
  s:           {{s}}
  v:           {{v}}
`.trim();
