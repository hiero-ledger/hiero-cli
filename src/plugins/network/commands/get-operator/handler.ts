import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { formatError } from '../../../../core/utils/errors';
import { Status } from '../../../../core/shared/constants';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { GetOperatorOutput } from './output';

export async function getOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  const networkArg = (args.args as { network?: string }).network;

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

    logger.verbose(`Getting operator for network: ${targetNetwork}`);

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
