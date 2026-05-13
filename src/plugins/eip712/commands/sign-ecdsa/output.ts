import { z } from 'zod';

import { EvmAddressSchema } from '@/core/schemas';

export const Eip712SignEcdsaOutputSchema = z.object({
  signerEvm: EvmAddressSchema.describe('EVM address of the signer'),
  signature: z
    .string()
    .describe('Combined 65-byte signature (0x-prefixed hex)'),
  hash: z
    .string()
    .describe('EIP-712 hash that was signed (0x-prefixed keccak256)'),
  r: z.string().describe('Signature r component'),
  s: z.string().describe('Signature s component'),
  v: z.number().describe('Signature v component (27 or 28)'),
});

export type Eip712SignEcdsaOutput = z.infer<typeof Eip712SignEcdsaOutputSchema>;

export const EIP712_SIGN_ECDSA_TEMPLATE = `
EIP-712 Signature
─────────────────────────────────────────────────
Signer (EVM):  {{signerEvm}}
Hash:          {{hash}}
Signature:     {{signature}}
  r:           {{r}}
  s:           {{s}}
  v:           {{v}}
`.trim();
