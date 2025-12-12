import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { GetOperatorOutput } from '@/plugins/network/commands/get-operator';

import { z } from 'zod';

import {
  EcdsaPrivateKeySchema,
  Ed25519PrivateKeySchema,
  EntityIdSchema,
} from '@/core/schemas/common-schemas';
import { Status } from '@/core/shared/constants';
import { getOperatorHandler } from '@/plugins/network/commands/get-operator';
import { setOperatorHandler } from '@/plugins/network/commands/set-operator';
import { useHandler } from '@/plugins/network/commands/use';

const envSchema = z.object({
  OPERATOR_ID: z
    .string()
    .min(1, 'OPERATOR_ID is required')
    .trim()
    .pipe(EntityIdSchema)
    .describe('Hedera entity ID in format 0.0.{number}'),
  OPERATOR_KEY: z
    .string()
    .min(1, 'OPERATOR_KEY is required')
    .trim()
    .refine(
      (value) => {
        const ed25519Result = Ed25519PrivateKeySchema.safeParse(value);
        const ecdsaResult = EcdsaPrivateKeySchema.safeParse(value);
        return ed25519Result.success || ecdsaResult.success;
      },
      {
        message:
          'OPERATOR_KEY must be a valid ED25519 or ECDSA key in hex (with optional 0x prefix)',
      },
    ),
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
    OPERATOR_ID: process.env.OPERATOR_ID,
    OPERATOR_KEY: process.env.OPERATOR_KEY,
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
    if (getOperatorOutput.operator?.accountId != env.OPERATOR_ID) {
      const setOperatorArgs: Record<string, unknown> = {
        operator: `${env.OPERATOR_ID}:${env.OPERATOR_KEY}`,
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
