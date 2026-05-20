import { z } from 'zod';

import { EvmAddressSchema } from '@/core/schemas';

export const Eip712SignOutputSchema = z.object({
  hash: z
    .string()
    .describe('EIP-712 hash that was signed (0x-prefixed keccak256)'),
  signature: z
    .string()
    .describe('Signature over the EIP-712 digest (0x-prefixed hex)'),
  signerEvm: EvmAddressSchema.optional().describe(
    'EVM address of the signer (ECDSA only)',
  ),
  signerPublicKey: z
    .string()
    .optional()
    .describe(
      'ED25519 public key of the signer (0x-prefixed hex, ED25519 only)',
    ),
  r: z.string().optional().describe('Signature r component (ECDSA only)'),
  s: z.string().optional().describe('Signature s component (ECDSA only)'),
  v: z
    .number()
    .optional()
    .describe('Signature v component, 27 or 28 (ECDSA only)'),
});

export type Eip712SignOutput = z.infer<typeof Eip712SignOutputSchema>;

export const EIP712_SIGN_TEMPLATE = `
EIP-712 Signature
─────────────────────────────────────────────────
{{#if signerEvm}}Signer (EVM):  {{signerEvm}}
{{/if}}{{#if signerPublicKey}}Signer key:    {{signerPublicKey}}
{{/if}}Hash:          {{hash}}
Signature:     {{signature}}{{#if r}}
  r:           {{r}}
  s:           {{s}}
  v:           {{v}}{{/if}}
`.trim();
