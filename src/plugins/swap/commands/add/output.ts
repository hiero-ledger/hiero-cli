import { z } from 'zod';

import { SwapTransferType } from '@/core/services/transfer/types';

export const SwapAddOutputSchema = z.object({
  swapName: z.string().describe('Swap name'),
  fromAccount: z.string().describe('Sender account ID'),
  toAccount: z.string().describe('Receiver account ID'),
  type: z.enum(SwapTransferType).describe('Transfer type'),
  amount: z.string().describe('Amount in base units'),
  tokenId: z.string().optional().describe('Token ID (FT transfers only)'),
  transferIndex: z
    .number()
    .int()
    .describe('Position of this transfer in the swap (1-based)'),
});

export type SwapAddOutput = z.infer<typeof SwapAddOutputSchema>;

export const SWAP_ADD_TEMPLATE = `
✅ Transfer added to swap '{{swapName}}' (transfer #{{transferIndex}})
   From:   {{fromAccount}}
   To:     {{toAccount}}
   Type:   {{type}}
   Amount: {{amount}}{{#if tokenId}} (token: {{tokenId}}){{/if}}
`.trim();
