import { z } from 'zod';

export const Ed25519SignOutputSchema = z.object({
  signerPublicKey: z
    .string()
    .describe('ED25519 public key of the signer (raw hex)'),
  hash: z
    .string()
    .describe('EIP-712 hash that was signed (0x-prefixed keccak256)'),
  signature: z
    .string()
    .describe('64-byte ED25519 signature over the digest (0x-prefixed hex)'),
});

export type Ed25519SignOutput = z.infer<typeof Ed25519SignOutputSchema>;

export const ED25519_SIGN_TEMPLATE = `
EIP-712 / ED25519 Signature
─────────────────────────────────────────────────
Signer key:  {{signerPublicKey}}
Hash:        {{hash}}
Signature:   {{signature}}
`.trim();
