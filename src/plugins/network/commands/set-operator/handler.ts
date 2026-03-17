import type { CommandHandlerArgs } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { NetworkSetOperatorOutput } from './output';
import type {
  SetOperatorExecuteContext,
  SetOperatorNormalisedParams,
} from './types';

import { ValidationError } from '@/core/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { NetworkSetOperatorInputSchema } from './input';

const normalizeParams = (
  args: CommandHandlerArgs,
): SetOperatorNormalisedParams => {
  const { api } = args;
  const validArgs = NetworkSetOperatorInputSchema.parse(args.args);

  const keyManager =
    validArgs.keyManager ||
    api.config.getOption<KeyManager>('default_key_manager');

  const targetNetwork =
    (validArgs.network as SupportedNetwork) || api.network.getCurrentNetwork();

  if (validArgs.network && !api.network.isNetworkAvailable(validArgs.network)) {
    const available = api.network.getAvailableNetworks().join(', ');
    throw new ValidationError(
      ERROR_MESSAGES.networkNotAvailable(validArgs.network, available),
    );
  }

  return {
    keyManager,
    operatorArg: validArgs.operator,
    targetNetwork,
  };
};

export class NetworkSetOperatorCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;
    const normalisedParams = normalizeParams(args);
    const operator = await api.keyResolver.resolveAccountCredentials(
      normalisedParams.operatorArg,
      normalisedParams.keyManager,
      ['network:operator', `network:${normalisedParams.targetNetwork}`],
    );
    const executeContext: SetOperatorExecuteContext = {
      existingOperator: api.network.getOperator(normalisedParams.targetNetwork),
      operator,
    };

    if (executeContext.existingOperator) {
      logger.info(
        `Overwriting existing operator for ${normalisedParams.targetNetwork}: ${executeContext.existingOperator.accountId} -> ${executeContext.operator.accountId}`,
      );
    } else {
      logger.info(
        `Setting new operator for network ${normalisedParams.targetNetwork}`,
      );
    }

    api.network.setOperator(normalisedParams.targetNetwork, {
      accountId: executeContext.operator.accountId,
      keyRefId: executeContext.operator.keyRefId,
    });

    const output: NetworkSetOperatorOutput = {
      network: normalisedParams.targetNetwork,
      operator: {
        accountId: executeContext.operator.accountId,
        keyRefId: executeContext.operator.keyRefId,
        publicKey: executeContext.operator.publicKey,
      },
    };

    return { result: output };
  }
}

export const networkSetOperator = async (
  args: CommandHandlerArgs,
): Promise<CommandResult> => new NetworkSetOperatorCommand().execute(args);
