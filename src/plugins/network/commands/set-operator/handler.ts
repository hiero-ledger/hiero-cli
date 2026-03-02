import type { CommandHandlerArgs } from '@/core';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { SetOperatorOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { SetOperatorInputSchema } from './input';

export async function setOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger, api } = args;

  const validArgs = SetOperatorInputSchema.parse(args.args);

  const operatorArg = validArgs.operator;
  const networkArg = validArgs.network;
  const keyManagerArg = validArgs.keyManager;

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const targetNetwork =
    (networkArg as SupportedNetwork) || api.network.getCurrentNetwork();

  if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
    const available = api.network.getAvailableNetworks().join(', ');
    throw new ValidationError(
      ERROR_MESSAGES.networkNotAvailable(networkArg, available),
    );
  }

  const operator = await api.keyResolver.getOrInitKey(operatorArg, keyManager, [
    'network:operator',
    `network:${targetNetwork}`,
  ]);

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

  return { result: output };
}
