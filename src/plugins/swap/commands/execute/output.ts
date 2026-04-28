import { z } from 'zod';

export const SwapExecuteOutputSchema = z.object({
  swapName: z.string().describe('Swap name'),
  transactionId: z.string().describe('Hedera transaction ID'),
  success: z.boolean().describe('Whether the transaction succeeded'),
  network: z.string().describe('Network'),
});

export type SwapExecuteOutput = z.infer<typeof SwapExecuteOutputSchema>;

export const SWAP_EXECUTE_TEMPLATE = `
{{#if success}}
✅ Swap '{{swapName}}' executed successfully on {{network}}
   Transaction ID: {{transactionId}}
{{else}}
❌ Swap '{{swapName}}' execution failed on {{network}}
   Transaction ID: {{transactionId}}
{{/if}}
`.trim();
