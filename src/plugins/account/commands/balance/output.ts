/**
 * Account Balance Command Output Schema and Template
 */
import { z } from 'zod';
import {
  EntityIdSchema,
  TinybarSchema,
  HtsBaseUnitSchema,
} from '../../../../core/schemas';

/**
 * Account Balance Command Output Schema
 */
export const AccountBalanceOutputSchema = z.object({
  accountId: EntityIdSchema,
  hbarBalance: TinybarSchema.optional(),
  hbarOnly: z.boolean().optional(),
  tokenOnly: z.boolean().optional(),
  tokenBalances: z
    .array(
      z.object({
        tokenId: EntityIdSchema,
        balance: HtsBaseUnitSchema,
      }),
    )
    .optional(),
});

export type AccountBalanceOutput = z.infer<typeof AccountBalanceOutputSchema>;

/**
 * Human-readable template for account balance output
 */
export const ACCOUNT_BALANCE_TEMPLATE = `
{{#unless tokenOnly}}
💰 Account Balance: {{hbarBalance}} tinybars
{{/unless}}
{{#unless hbarOnly}}
{{#if tokenBalances}}
{{#if tokenOnly}}
🪙 Token Balance:
{{else}}
🪙 Token Balances:
{{/if}}
{{#each tokenBalances}}
   {{tokenId}}: {{balance}}
{{/each}}
{{else}}
{{#unless tokenOnly}}
   No token balances found
{{/unless}}
{{#if tokenOnly}}
   Token not found or no balance
{{/if}}
{{/if}}
{{/unless}}
`.trim();
