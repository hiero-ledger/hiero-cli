/**
 * Accounts Command Output Schema and Template
 */
import { z } from 'zod';

const CreatedAccountSchema = z.object({
  name: z.string(),
  accountId: z.string(),
  balance: z.string(),
  publicKey: z.string(),
});

export const AccountsOutputSchema = z.object({
  count: z.number(),
  totalCost: z.string(),
  network: z.string(),
  accounts: z.array(CreatedAccountSchema),
});

export type AccountsOutput = z.infer<typeof AccountsOutputSchema>;
export type CreatedAccount = z.infer<typeof CreatedAccountSchema>;

export const ACCOUNTS_TEMPLATE = `
✅ Created {{count}} test accounts on {{network}}

📋 Account Details:
{{#each accounts}}
   {{name}}
   ├─ ID:      {{accountId}}
   ├─ Balance: {{balance}} HBAR
   └─ Key:     {{publicKey}}
{{/each}}

💰 Total HBAR distributed: {{totalCost}}
`.trim();
