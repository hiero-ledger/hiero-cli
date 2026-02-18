/**
 * Create Account Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  KeyTypeSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Create Account Command Output Schema
 */
export const CreateAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name'),
  type: KeyTypeSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  evmAddress: EvmAddressSchema,
  publicKey: PublicKeyDefinitionSchema,
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
