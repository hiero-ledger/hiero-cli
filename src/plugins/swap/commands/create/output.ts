import { z } from 'zod';

export const SwapCreateOutputSchema = z.object({
  name: z.string().describe('Swap name'),
  network: z.string().describe('Network'),
  createdAt: z.string().describe('Creation timestamp'),
});

export type SwapCreateOutput = z.infer<typeof SwapCreateOutputSchema>;

export const SWAP_CREATE_TEMPLATE = `
✅ Swap '{{name}}' created on {{network}} at {{createdAt}}
   Add transfers with: hiero swap add --swap {{name}} --from <account> --to <account> --type <hbar|ft> --amount <amount>
`.trim();
