import { z } from 'zod';
import { NetworkSchema } from '../../../../core/schemas';

/**
 * Input schema for network use command
 * Validates arguments for switching to a specific network
 */
export const UseNetworkInputSchema = z.object({
  network: NetworkSchema.describe(
    'Network to switch to (testnet, mainnet, previewnet, localnet)',
  ),
});

export type UseNetworkInput = z.infer<typeof UseNetworkInputSchema>;
