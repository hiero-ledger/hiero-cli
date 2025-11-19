import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { formatError } from '../../../../core/utils/errors';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { validateAccountId } from '../../../../core/utils/account-id-validator';
import { AliasService } from '../../../../core/services/alias/alias-service.interface';
import { KmsService } from '../../../../core/services/kms/kms-service.interface';
import { parseIdKeyPair } from '../../../../core/utils/keys';
import { Status } from '../../../../core/shared/constants';
import { SetOperatorOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import type { KeyAlgorithmType as KeyAlgorithmType } from '../../../../core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '../../../../core/shared/constants';

function resolveOperatorFromAlias(
  alias: string,
  targetNetwork: SupportedNetwork,
  aliasService: AliasService,
): { accountId: string; keyRefId: string; publicKey?: string } {
  const aliasRecord = aliasService.resolve(alias, 'account', targetNetwork);

  if (!aliasRecord) {
    throw new Error(`Alias '${alias}' not found for network ${targetNetwork}`);
  }

  if (!aliasRecord.keyRefId) {
    throw new Error(`No key found for account ${aliasRecord.entityId}`);
  }

  return {
    accountId: aliasRecord.entityId!,
    keyRefId: aliasRecord.keyRefId,
    publicKey: aliasRecord.publicKey || undefined,
  };
}

function resolveOperatorFromIdKey(
  idKeyPair: string,
  kmsService: KmsService,
  keyManager: KeyManagerName,
  targetNetwork: SupportedNetwork,
): { accountId: string; keyRefId: string; publicKey?: string } {
  const { accountId, privateKey, keyType } = parseIdKeyPair(idKeyPair);
  validateAccountId(accountId);
  // Default to ecdsa if keyType is not provided
  const keyTypeToUse: KeyAlgorithmType = keyType || KeyAlgorithm.ECDSA;
  const imported = kmsService.importPrivateKey(
    keyTypeToUse,
    privateKey,
    keyManager,
    ['network:operator', `network:${targetNetwork}`],
  );
  return {
    accountId,
    keyRefId: imported.keyRefId,
    publicKey: imported.publicKey,
  };
}

export async function setOperatorHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  const operatorArg = (args.args as { operator?: string }).operator;
  const networkArg = (args.args as { network?: string }).network;
  const keyManagerArg = args.args.keyManager as KeyManagerName | undefined;

  if (!operatorArg) {
    return {
      status: Status.Failure,
      errorMessage:
        'Must specify --operator (name or account-id:private-key format)',
    };
  }

  try {
    const targetNetwork =
      (networkArg as SupportedNetwork) || api.network.getCurrentNetwork();

    // Get keyManager from args or fallback to config
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    if (networkArg && !api.network.isNetworkAvailable(networkArg)) {
      const available = api.network.getAvailableNetworks().join(', ');
      return {
        status: Status.Failure,
        errorMessage: `Network '${networkArg}' is not available. Available networks: ${available}`,
      };
    }

    const {
      accountId: resolvedAccountId,
      keyRefId: resolvedKeyRefId,
      publicKey: resolvedPublicKey,
    } = operatorArg.includes(':')
      ? resolveOperatorFromIdKey(
          operatorArg,
          api.kms,
          keyManager,
          targetNetwork,
        )
      : resolveOperatorFromAlias(operatorArg, targetNetwork, api.alias);

    const existingOperator = api.network.getOperator(targetNetwork);
    if (existingOperator) {
      logger.verbose(
        `Overwriting existing operator for ${targetNetwork}: ${existingOperator.accountId} -> ${resolvedAccountId}`,
      );
    } else {
      logger.verbose(`Setting new operator for network ${targetNetwork}`);
    }

    api.network.setOperator(targetNetwork, {
      accountId: resolvedAccountId,
      keyRefId: resolvedKeyRefId,
    });

    const output: SetOperatorOutput = {
      network: targetNetwork,
      operator: {
        accountId: resolvedAccountId,
        keyRefId: resolvedKeyRefId,
        publicKey: resolvedPublicKey || undefined,
      },
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to set operator', error),
    };
  }
}

export default setOperatorHandler;
