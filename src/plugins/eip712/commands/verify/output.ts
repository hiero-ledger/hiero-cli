import { z } from 'zod';

export const Eip712VerifyOutputSchema = z.object({
  recoveredSigner: z
    .string()
    .optional()
    .describe('EVM address recovered from the signature (ECDSA only)'),
  match: z
    .boolean()
    .optional()
    .describe(
      'Whether the recovered signer matches --expected-signer (ECDSA only)',
    ),
  signerPublicKey: z
    .string()
    .optional()
    .describe(
      'ED25519 public key used for verification (raw hex, ED25519 only)',
    ),
  hash: z
    .string()
    .optional()
    .describe(
      'EIP-712 hash that was verified (0x-prefixed keccak256, ED25519 only)',
    ),
  verified: z
    .boolean()
    .optional()
    .describe(
      'Whether the signature is valid for the given public key and message (ED25519 only)',
    ),
});

export type Eip712VerifyOutput = z.infer<typeof Eip712VerifyOutputSchema>;

export const EIP712_VERIFY_TEMPLATE = `
EIP-712 Verification
─────────────────────────────────────────────────
{{#if recoveredSigner}}Recovered Signer:  {{recoveredSigner}}
{{/if}}{{#if match}}Match:             ✓ yes{{/if}}
{{#if (eq match false)}}Match:             ✗ no{{/if}}
{{#if signerPublicKey}}Signer key:        {{signerPublicKey}}
{{/if}}{{#if hash}}Hash:              {{hash}}
{{/if}}{{#if verified}}Verified:          ✓ yes{{/if}}
{{#if (eq verified false)}}Verified:          ✗ no{{/if}}
`.trim();
