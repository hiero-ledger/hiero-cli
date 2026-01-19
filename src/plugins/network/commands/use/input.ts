import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

/**
 * Input schema for network use command
 * Validates arguments for switching to a specific network
 */
export const UseNetworkInputSchema = z.object({
  global: NetworkSchema.describe(
    'Network to switch to (testnet, mainnet, previewnet, localnet)',
  ),
  g: NetworkSchema.optional().describe(
    'Network to switch to (short form of --global)',
  ),
});

export type UseNetworkInput = z.infer<typeof UseNetworkInputSchema>;
