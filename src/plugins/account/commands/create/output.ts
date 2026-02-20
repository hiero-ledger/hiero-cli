/**
 * Create Account Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  KeyTypeSchema,
  NetworkSchema,
  PublicKeySchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Create Account Command Output Schema
 */
export const CreateAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name or alias'),
  alias: z.string().describe('Account alias').optional(),
  type: KeyTypeSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  evmAddress: EvmAddressSchema,
  publicKey: PublicKeySchema,
});

export type CreateAccountOutput = z.infer<typeof CreateAccountOutputSchema>;

/**
 * Human-readable template for create account output
 */
export const CREATE_ACCOUNT_TEMPLATE = `
✅ Account created successfully: {{hashscanLink accountId "account" network}}
   Name: {{name}}
   Type: {{type}}
   Network: {{network}}
   EVM Address: {{evmAddress}}
   Public Key: {{publicKey}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
