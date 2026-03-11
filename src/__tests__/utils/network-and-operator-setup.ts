import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { GetOperatorOutput } from '@/plugins/network/commands/get-operator';

import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { GetOperatorCommand } from '@/plugins/network/commands/get-operator';
import { SetOperatorCommand } from '@/plugins/network/commands/set-operator';
import { UseNetworkCommand } from '@/plugins/network/commands/use';

const envSchema = z.object({
  OPERATOR_ID: z
    .string()
    .min(1, 'OPERATOR_ID is required')
    .trim()
    .pipe(EntityIdSchema)
    .describe('Hedera entity ID in format 0.0.{number}'),
  OPERATOR_KEY: z.string().min(1, 'OPERATOR_KEY is required').trim(),
  NETWORK: z.enum(['testnet', 'localnet'], {
    error: () => ({
      message: 'Network must be testnet or localnet',
    }),
  }),
});

export const setDefaultOperatorForNetwork = async (
  coreApi: CoreApi,
): Promise<void> => {
  // Validate environment variables with Zod
  const env = envSchema.parse({
    OPERATOR_ID: process.env.OPERATOR_ID,
    OPERATOR_KEY: process.env.OPERATOR_KEY,
    NETWORK: process.env.NETWORK,
  });

  const useNetworkArgs: Record<string, unknown> = {
    global: env.NETWORK,
  };
  await new UseNetworkCommand().execute({
    args: useNetworkArgs,
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });

  const getOperatorResult = await new GetOperatorCommand().execute({
    args: {},
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
  const getOperatorOutput = getOperatorResult.result as GetOperatorOutput;
  if (getOperatorOutput.operator?.accountId != env.OPERATOR_ID) {
    const setOperatorArgs: Record<string, unknown> = {
      operator: `${env.OPERATOR_ID}:${env.OPERATOR_KEY}`,
    };
    await new SetOperatorCommand().execute({
      args: setOperatorArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
  }
};
