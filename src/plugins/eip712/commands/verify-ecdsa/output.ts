import { z } from 'zod';

export const Eip712VerifyEcdsaOutputSchema = z.object({
  recoveredSigner: z
    .string()
    .describe('EVM address recovered from the signature'),
  match: z
    .boolean()
    .optional()
    .describe('Whether the recovered signer matches --expected-signer'),
});

export type Eip712VerifyEcdsaOutput = z.infer<
  typeof Eip712VerifyEcdsaOutputSchema
>;

export const EIP712_VERIFY_ECDSA_TEMPLATE = `
EIP-712 Verification
─────────────────────────────────────────────────
Recovered Signer:  {{recoveredSigner}}
{{#if match}}Match:             ✓ yes{{/if}}
{{#if (eq match false)}}Match:             ✗ no{{/if}}
`.trim();
