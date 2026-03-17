/**
 * View Account Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  TimestampSchema,
  TinybarSchema,
} from '@/core/schemas/common-schemas';

/**
 * View Account Command Output Schema
 */
export const AccountViewOutputSchema = z.object({
  accountId: EntityIdSchema,
  balance: TinybarSchema,
  evmAddress: EvmAddressSchema.optional(),
  publicKey: PublicKeyDefinitionSchema.optional(),
  balanceTimestamp: TimestampSchema,
  network: NetworkSchema,
});

export type AccountViewOutput = z.infer<typeof AccountViewOutputSchema>;

/**
 * Human-readable template for view account output
 */
export const ACCOUNT_VIEW_TEMPLATE = `
📋 Account Details:
   Account ID: {{hashscanLink accountId "account" network}}
   Balance: {{balance}} tinybars
   EVM Address: {{#if evmAddress}}{{evmAddress}}{{else}}N/A{{/if}}
   Public Key: {{#if publicKey}}{{publicKey}}{{else}}N/A{{/if}}
   Balance Timestamp: {{balanceTimestamp}}
`.trim();
