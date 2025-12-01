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
  OPERATOR_ID: z
    .string()
    .min(1, 'OPERATOR_ID is required')
    .trim()
    .regex(
      /^0\.0\.[1-9][0-9]*$/,
      'Hedera entity ID must be in format 0.0.{number}',
    )
    .describe('Hedera entity ID in format 0.0.{number}'),
  OPERATOR_KEY: z
    .string()
    .min(1, 'OPERATOR_KEY is required')
    .trim()
    .refine(
      (value) => {
        const ed25519Regex =
          /^(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?[0-9a-fA-F]{128}|(?:0x)?30[0-9a-fA-F]{80,160})$/;
        const ecdsaRegex =
          /^(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?30[0-9a-fA-F]{100,180})$/;
        return ed25519Regex.test(value) || ecdsaRegex.test(value);
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
  console.log(process.env.OPERATOR_ID);
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
