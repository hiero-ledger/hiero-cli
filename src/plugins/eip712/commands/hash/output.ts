import { z } from 'zod';

export const Eip712HashOutputSchema = z.object({
  hash: z.string().describe('EIP-712 hash (0x-prefixed keccak256)'),
});

export type Eip712HashOutput = z.infer<typeof Eip712HashOutputSchema>;

export const EIP712_HASH_TEMPLATE = `
EIP-712 Hash
─────────────────────────────────────────────────
Hash:  {{hash}}
`.trim();
