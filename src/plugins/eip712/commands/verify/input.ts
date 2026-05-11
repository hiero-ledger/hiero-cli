import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  Eip712SignatureSchema,
  JsonInputSchema,
} from '@/core/schemas';

export const Eip712VerifyInputSchema = z.object({
  domain: JsonInputSchema.describe(
    'EIP-712 domain as inline JSON or path to a JSON file',
  ),
  types: JsonInputSchema.describe(
    'EIP-712 types definition as inline JSON or path to a JSON file',
  ),
  message: JsonInputSchema.describe(
    'Signed message object as inline JSON or path to a JSON file',
  ),
  signature: Eip712SignatureSchema.describe(
    'EIP-712 signature to verify (0x-prefixed 65-byte hex)',
  ),
  expectedSigner: AccountReferenceObjectSchema.optional().describe(
    'Account to assert against the recovered signer. Accepts an EVM address (0x...), Hedera account ID (0.0.xxx), or account alias',
  ),
});

export type Eip712VerifyInput = z.infer<typeof Eip712VerifyInputSchema>;
