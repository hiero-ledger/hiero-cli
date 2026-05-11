import { z } from 'zod';

import {
  JsonInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const Eip712SignInputSchema = z.object({
  key: KeySchema.optional().describe(
    'Signing key. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, private key in {ed25519|ecdsa}:private:{private-key} format, key reference, or account alias.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  domain: JsonInputSchema.describe(
    'EIP-712 domain as inline JSON or path to a JSON file',
  ),
  types: JsonInputSchema.describe(
    'EIP-712 types definition as inline JSON or path to a JSON file',
  ),
  message: JsonInputSchema.describe(
    'Message object to sign as inline JSON or path to a JSON file',
  ),
});

export type Eip712SignInput = z.infer<typeof Eip712SignInputSchema>;
