import { z } from 'zod';
import { CoreApi } from '../../core/core-api/core-api.interface';
import { setOperatorHandler } from '../../plugins/network/commands/set-operator';
import { useHandler } from '../../plugins/network/commands/use';

const envSchema = z.object({
  ACCOUNT_ID: z
    .string()
    .min(1, 'ACCOUNT_ID is required')
    .regex(/^0\.0\.\d+$/, 'ACCOUNT_ID must be in format 0.0.12345'),
  PRIVATE_KEY: z.string().min(1, 'PRIVATE_KEY is required'),
  NETWORK: z.enum(['testnet', 'localnet'], {
    errorMap: () => ({
      message: 'Network must be testnet or localnet',
    }),
  }),
});

/**
 * Creates a Hedera client for testing purposes using environment variables.
 *
 * This function reads operator credentials from environment variables and creates
 * a pre-configured Hedera testnet client. The environment variables should be
 * defined in a `.env.test` file.
 *
 * Required environment variables:
 * - ACCOUNT_ID: The operator account ID in format "0.0.12345"
 * - PRIVATE_KEY: The operator private key in DER string format
 *
 * @throws {z.ZodError} When environment variables are missing or invalid
 * @returns {Client} A Hedera testnet client configured with the operator account and private key
 *
 * @example
 * ```typescript
 * // Ensure .env.test contains:
 * // ACCOUNT_ID=0.0.12345
 * // PRIVATE_KEY=302e020100300506032b657004220420...
 *
 * const client = getOperatorClientForTests();
 * ```
 */
export const setDefaultOperatorForNetwork = async (
  coreApi: CoreApi,
): Promise<void> => {
  // Validate environment variables with Zod
  const env = envSchema.parse({
    ACCOUNT_ID: process.env.ACCOUNT_ID,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    NETWORK: process.env.NETWORK,
  });

  const useNetworkArgs: Record<string, unknown> = {
    network: env.NETWORK,
  };
  await useHandler({
    args: useNetworkArgs,
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });

  const setOperatorArgs: Record<string, unknown> = {
    operator: `${env.ACCOUNT_ID}:${env.PRIVATE_KEY}`,
  };
  await setOperatorHandler({
    args: setOperatorArgs,
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
};
