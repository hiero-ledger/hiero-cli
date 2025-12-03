import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { formatError } from '../../../../core/utils/errors';
import { Status } from '../../../../core/shared/constants';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { GetOperatorOutput } from './output';
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
        errorMessage: `Network '${networkArg}' is not available. Available networks: ${available}`,
      };
    }

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

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get operator', error),
    };
  }
}

export default getOperatorHandler;
