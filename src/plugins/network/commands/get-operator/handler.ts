import type { CommandHandlerArgs } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { GetOperatorOutput } from './output';
import type { GetOperatorNormalisedParams } from './types';

import { ValidationError } from '@/core/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { NetworkGetOperatorInputSchema } from './input';

const normalizeParams = (
  args: CommandHandlerArgs,
): GetOperatorNormalisedParams => {
  const { api } = args;
  const validArgs = NetworkGetOperatorInputSchema.parse(args.args);
  const networkArg = validArgs.network;

  if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
    const available = api.network.getAvailableNetworks().join(', ');
    throw new ValidationError(
      ERROR_MESSAGES.networkNotAvailable(networkArg, available),
    );
  }

  return {
    targetNetwork:
      (networkArg as SupportedNetwork) || api.network.getCurrentNetwork(),
  };
};

export class NetworkGetOperatorCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;
    const normalisedParams = normalizeParams(args);

    logger.info(
      `Getting operator for network: ${normalisedParams.targetNetwork}`,
    );

    const operator = api.network.getOperator(normalisedParams.targetNetwork);
    const publicKey = operator
      ? api.kms.get(operator.keyRefId)?.publicKey
      : undefined;

    const output: GetOperatorOutput = operator
      ? {
          network: normalisedParams.targetNetwork,
          operator: {
            accountId: operator.accountId,
            keyRefId: operator.keyRefId,
            publicKey,
          },
        }
      : {
          network: normalisedParams.targetNetwork,
        };

    return { result: output };
  }
}

export const networkGetOperator = async (
  args: CommandHandlerArgs,
): Promise<CommandResult> => new NetworkGetOperatorCommand().execute(args);
