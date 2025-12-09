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
  hbarBalanceDisplay: z.string().optional(),
  hbarOnly: z.boolean().optional(),
  tokenOnly: z.boolean().optional(),
  raw: z.boolean().optional(),
  tokenBalances: z
    .array(
      z.object({
        tokenId: EntityIdSchema,
        name: z.string().optional(),
        symbol: z.string().optional(),
        alias: z.string().optional(),
        balance: HtsBaseUnitSchema,
        balanceDisplay: z.string().optional(),
        decimals: z.number().optional(),
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
💰 Account Balance: {{#if raw}}{{hbarBalance}} tinybars{{else}}{{hbarBalanceDisplay}} HBAR{{/if}}
{{/unless}}
{{#unless hbarOnly}}
{{#if tokenBalances}}
{{#if tokenOnly}}
🪙 Token Balance:
{{else}}
🪙 Token Balances:
{{/if}}
{{#each tokenBalances}}
   {{tokenId}}{{#if alias}} ({{alias}}){{/if}}: {{#if ../raw}}{{balance}}{{else}}{{#if balanceDisplay}}{{balanceDisplay}}{{else}}{{balance}}{{/if}}{{/if}}{{#if symbol}} {{symbol}}{{/if}}{{#if name}} ({{name}}){{/if}}
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
