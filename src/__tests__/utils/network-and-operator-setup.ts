import { z } from 'zod';
import { CoreApi } from '../../core/core-api/core-api.interface';
import { setOperatorHandler } from '../../plugins/network/commands/set-operator';
import { useHandler } from '../../plugins/network/commands/use';
import {
  getOperatorHandler,
  GetOperatorOutput,
} from '../../plugins/network/commands/get-operator';
import { Status } from '../../core/shared/constants';

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

  const getOperatorResult = await getOperatorHandler({
    args: {},
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
  if (getOperatorResult.status == Status.Success) {
    const getOperatorOutput: GetOperatorOutput = JSON.parse(
      getOperatorResult.outputJson!,
    );
    if (getOperatorOutput.operator?.accountId != env.ACCOUNT_ID) {
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
    }
  }
};
