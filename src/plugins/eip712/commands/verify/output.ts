import { z } from 'zod';

export const Eip712VerifyOutputSchema = z.object({
  recoveredSigner: z
    .string()
    .describe('EVM address recovered from the signature'),
  match: z
    .boolean()
    .optional()
    .describe('Whether the recovered signer matches --expected-signer'),
});

export type Eip712VerifyOutput = z.infer<typeof Eip712VerifyOutputSchema>;

export const EIP712_VERIFY_TEMPLATE = `
EIP-712 Verification
─────────────────────────────────────────────────
Recovered Signer:  {{recoveredSigner}}
{{#if match}}Match:             ✓ yes{{/if}}
{{#if (eq match false)}}Match:             ✗ no{{/if}}
`.trim();
