/**
 * View Account Command Output Schema and Template
 */
import { z } from 'zod';
import {
  EntityIdSchema,
  TinybarSchema,
  EvmAddressSchema,
  PublicKeySchema,
  TimestampSchema,
} from '../../../../core/schemas/common-schemas';

/**
 * View Account Command Output Schema
 */
export const ViewAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  balance: TinybarSchema,
  evmAddress: EvmAddressSchema.optional(),
  publicKey: PublicKeySchema.optional(),
  balanceTimestamp: TimestampSchema,
});

export type ViewAccountOutput = z.infer<typeof ViewAccountOutputSchema>;

/**
 * Human-readable template for view account output
 */
export const VIEW_ACCOUNT_TEMPLATE = `
📋 Account Details:
   Account ID: {{accountId}}
   Balance: {{balance}} tinybars
   EVM Address: {{#if evmAddress}}{{evmAddress}}{{else}}N/A{{/if}}
   Public Key: {{#if publicKey}}{{publicKey}}{{else}}N/A{{/if}}
   Balance Timestamp: {{balanceTimestamp}}
`.trim();
