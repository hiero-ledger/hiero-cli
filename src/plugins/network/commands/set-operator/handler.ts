import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { SetOperatorOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { SetOperatorInputSchema } from './input';

export async function setOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  // Parse and validate args
  const validArgs = SetOperatorInputSchema.parse(args.args);

  const operatorArg = validArgs.operator;
  const networkArg = validArgs.network;
  const keyManagerArg = validArgs.keyManager;

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const targetNetwork =
    (networkArg as SupportedNetwork) || api.network.getCurrentNetwork();

  try {
    const operator = await api.keyResolver.getOrInitKey(
      operatorArg,
      keyManager,
      ['network:operator', `network:${targetNetwork}`],
    );
    if (!operator.accountId) {
      throw new Error(
        `Could not resolve account ID for passed "operator" argument ${validArgs.operator?.type} from value ${validArgs.operator?.rawValue}`,
      );
    }
    if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
      const available = api.network.getAvailableNetworks().join(', ');
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.networkNotAvailable(networkArg, available),
      };
    }

    const existingOperator = api.network.getOperator(targetNetwork);
    if (existingOperator) {
      logger.info(
        `Overwriting existing operator for ${targetNetwork}: ${existingOperator.accountId} -> ${operator.accountId}`,
      );
    } else {
      logger.info(`Setting new operator for network ${targetNetwork}`);
    }

    api.network.setOperator(targetNetwork, {
      accountId: operator.accountId,
      keyRefId: operator.keyRefId,
    });

    const output: SetOperatorOutput = {
      network: targetNetwork,
      operator: {
        accountId: operator.accountId,
        keyRefId: operator.keyRefId,
        publicKey: operator.publicKey,
      },
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(ERROR_MESSAGES.failedToSetOperator, error),
    };
  }
}
