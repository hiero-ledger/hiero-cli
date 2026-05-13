import { z } from 'zod';

export const Ed25519VerifyOutputSchema = z.object({
  signerPublicKey: z
    .string()
    .describe('ED25519 public key used for verification (raw hex)'),
  hash: z
    .string()
    .describe('EIP-712 hash that was verified (0x-prefixed keccak256)'),
  verified: z
    .boolean()
    .describe(
      'Whether the signature is valid for the given public key and message',
    ),
});

export type Ed25519VerifyOutput = z.infer<typeof Ed25519VerifyOutputSchema>;

export const ED25519_VERIFY_TEMPLATE = `
EIP-712 / ED25519 Verification
─────────────────────────────────────────────────
Signer key:  {{signerPublicKey}}
Hash:        {{hash}}
Verified:    {{verified}}
`.trim();
