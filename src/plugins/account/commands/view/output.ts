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
export const ViewAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  balance: TinybarSchema,
  evmAddress: EvmAddressSchema.optional(),
  publicKey: PublicKeyDefinitionSchema.optional(),
  balanceTimestamp: TimestampSchema,
  network: NetworkSchema,
});

export type ViewAccountOutput = z.infer<typeof ViewAccountOutputSchema>;

/**
 * Human-readable template for view account output
 */
export const VIEW_ACCOUNT_TEMPLATE = `
📋 Account Details:
   Account ID: {{hashscanLink accountId "account" network}}
   Balance: {{balance}} tinybars
   EVM Address: {{#if evmAddress}}{{evmAddress}}{{else}}N/A{{/if}}
   Public Key: {{#if publicKey}}{{publicKey}}{{else}}N/A{{/if}}
   Balance Timestamp: {{balanceTimestamp}}
`.trim();
