/**
 * Account Create Command Output Schema and Template
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
 * Account Create Command Output Schema
 */
export const AccountCreateOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name').optional(),
  type: KeyTypeSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  evmAddress: EvmAddressSchema,
  publicKey: PublicKeyDefinitionSchema,
});

export type AccountCreateOutput = z.infer<typeof AccountCreateOutputSchema>;

/**
 * Human-readable template for account create output
 */
export const ACCOUNT_CREATE_TEMPLATE = `
✅ Account created successfully: {{hashscanLink accountId "account" network}}
{{#if name}}
   Name: {{name}}
{{/if}}
   Type: {{type}}
   Network: {{network}}
   EVM Address: {{evmAddress}}
   Public Key: {{publicKey}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
