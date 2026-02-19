/**
 * Token Associate Command Handler
 * Handles token association operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AssociateTokenOutput } from './output';

import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { saveAssociationToState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { AssociateTokenInputSchema } from './input';

export async function associateToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = AssociateTokenInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const accountReference = validArgs.account;
  const providedKeyManager = validArgs.keyManager;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new Error(
      `Failed to resolve token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  const account = await api.keyResolver.getOrInitKey(
    accountReference,
    keyManager,
    ['token:associate'],
  );
  if (!account.accountId) {
    throw new Error(
      `Could not resolve account ID for passed "account" argument for type ${validArgs.account?.type} from value ${validArgs.account?.rawValue}`,
    );
  }

  logger.info(`🔑 Using account: ${account.accountId}`);
  logger.info(`🔑 Will sign with account key`);
  logger.info(`Associating token ${tokenId} with account ${account.accountId}`);

  let alreadyAssociated = false;
  let transactionId: string | undefined;

  try {
    const tokenBalances = await api.mirror.getAccountTokenBalances(
      account.accountId,
      tokenId,
    );
    const isAssociated = tokenBalances.tokens.some(
      (token) => token.token_id === tokenId,
    );

    if (isAssociated) {
      logger.info(
        `Token ${tokenId} is already associated with account ${account.accountId}`,
      );

      saveAssociationToState(tokenState, tokenId, account.accountId, logger);
      alreadyAssociated = true;
    }
  } catch (mirrorError) {
    logger.debug(
      `Failed to check token association via Mirror Node: ${formatError('', mirrorError)}. Proceeding with transaction.`,
    );
  }

  if (!alreadyAssociated) {
    try {
      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: account.accountId,
      });

      logger.debug(`Using key ${account.keyRefId} for signing transaction`);
      const result = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        [account.keyRefId],
      );

      if (result.success) {
        transactionId = result.transactionId;
        saveAssociationToState(tokenState, tokenId, account.accountId, logger);
      } else {
        return {
          status: Status.Failure,
          errorMessage: 'Token association failed',
        };
      }
    } catch (error: unknown) {
      if (
        error instanceof ReceiptStatusError &&
        error.status === HederaStatus.TokenAlreadyAssociatedToAccount
      ) {
        logger.info(
          `Token ${tokenId} is already associated with account ${account.accountId}`,
        );
        saveAssociationToState(tokenState, tokenId, account.accountId, logger);
        alreadyAssociated = true;
      } else {
        return {
          status: Status.Failure,
          errorMessage: formatError('Failed to associate token', error),
        };
      }
    }
  }

  if (!alreadyAssociated && !transactionId) {
    return {
      status: Status.Failure,
      errorMessage: 'Failed to associate token',
    };
  }

  const outputData: AssociateTokenOutput = {
    accountId: account.accountId,
    tokenId,
    associated: true,
    network,
  };

  if (transactionId) {
    outputData.transactionId = transactionId;
  }

  if (alreadyAssociated) {
    outputData.alreadyAssociated = true;
  }

  return {
    status: Status.Success,
    outputJson: JSON.stringify(outputData),
  };
}
