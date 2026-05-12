import { z } from 'zod';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';

export const SwapCreateOutputSchema = z.object({
  name: z.string(),
  transferCount: z.number(),
  maxTransfers: z.number(),
  memo: z.string().optional(),
});

export type SwapCreateOutput = z.infer<typeof SwapCreateOutputSchema>;

export const SWAP_CREATE_TEMPLATE = `
Swap "{{name}}" created ({{transferCount}}/{{maxTransfers}} transfers).${''}
{{#if memo}}Memo: {{memo}}
{{/if}}Add transfers with:
  hcli swap add-hbar -n {{name}} --from <account> --to <account> --amount <amount>
  hcli swap add-ft  -n {{name}} --from <account> --to <account> --token <token> --amount <amount>
  hcli swap add-nft -n {{name}} --from <account> --to <account> --token <token> --serials <1,2,3>
`.trim();

export { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION };
