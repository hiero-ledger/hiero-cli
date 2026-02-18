import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { GetOperatorOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { GetOperatorInputSchema } from './input';

export async function getOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  // Parse and validate args
  const validArgs = GetOperatorInputSchema.parse(args.args);

  const networkArg = validArgs.network;

  try {
    const targetNetwork =
      (networkArg as SupportedNetwork) || api.network.getCurrentNetwork();

    if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
      const available = api.network.getAvailableNetworks().join(', ');
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.networkNotAvailable(networkArg, available),
      };
    }

    logger.info(`Getting operator for network: ${targetNetwork}`);

    const operator = api.network.getOperator(targetNetwork);

    let publicKey: string | undefined;
    if (operator) {
      publicKey = api.kms.get(operator.keyRefId)?.publicKey;
    }

    const output: GetOperatorOutput = operator
      ? {
          network: targetNetwork,
          operator: {
            accountId: operator.accountId,
            keyRefId: operator.keyRefId,
            publicKey,
          },
        }
      : {
          network: targetNetwork,
        };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(ERROR_MESSAGES.failedToGetOperator, error),
    };
  }
}
