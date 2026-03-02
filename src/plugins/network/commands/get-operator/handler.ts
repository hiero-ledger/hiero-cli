import type { CommandHandlerArgs } from '@/core';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { GetOperatorOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { GetOperatorInputSchema } from './input';

export async function getOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger, api } = args;

  const validArgs = GetOperatorInputSchema.parse(args.args);

  const networkArg = validArgs.network;

  if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
    const available = api.network.getAvailableNetworks().join(', ');
    throw new ValidationError(
      ERROR_MESSAGES.networkNotAvailable(networkArg, available),
    );
  }

  const targetNetwork =
    (networkArg as SupportedNetwork) || api.network.getCurrentNetwork();

  logger.info(`Getting operator for network: ${targetNetwork}`);

  const operator = api.network.getOperator(targetNetwork);

  let publicKey: string | undefined;
  if (operator) {
    publicKey = api.kms.getPublicKey(operator.keyRefId) || undefined;
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

  return { result: output };
}
