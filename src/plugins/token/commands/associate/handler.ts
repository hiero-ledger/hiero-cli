import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AssociateTokenOutput } from './output';

import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { saveAssociationToState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { AssociateTokenInputSchema } from './input';

function isTokenAlreadyAssociatedError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenAlreadyAssociatedToAccount
  );
}

export async function associateToken(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = AssociateTokenInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const accountIdOrAlias = validArgs.account;
  const providedKeyManager = validArgs.keyManager;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new NotFoundError('Token not found', {
      context: { token: tokenIdOrAlias },
    });
  }

  const tokenId = resolvedToken.tokenId;

  const account = await api.keyResolver.getOrInitKey(
    accountIdOrAlias,
    keyManager,
    ['token:associate'],
  );

  logger.info(`🔑 Using account: ${account.accountId}`);
  logger.info(`🔑 Will sign with account key`);
  logger.info(`Associating token ${tokenId} with account ${account.accountId}`);

  const tokenBalances = await api.mirror.getAccountTokenBalances(
    account.accountId,
    tokenId,
  );
  const isAlreadyAssociated = tokenBalances.tokens.some(
    (token) => token.token_id === tokenId,
  );

  if (isAlreadyAssociated) {
    logger.info(
      `Token ${tokenId} is already associated with account ${account.accountId}`,
    );

    saveAssociationToState(tokenState, tokenId, account.accountId, logger);

    const outputData: AssociateTokenOutput = {
      accountId: account.accountId,
      tokenId,
      associated: true,
      alreadyAssociated: true,
      network,
    };

    return { result: outputData };
  }

  const associateTransaction = api.token.createTokenAssociationTransaction({
    tokenId,
    accountId: account.accountId,
  });

  let result;
  try {
    logger.debug(`Using key ${account.keyRefId} for signing transaction`);
    result = await api.txExecution.signAndExecuteWith(associateTransaction, [
      account.keyRefId,
    ]);
  } catch (error) {
    if (isTokenAlreadyAssociatedError(error)) {
      saveAssociationToState(tokenState, tokenId, account.accountId, logger);
      return {
        result: {
          accountId: account.accountId,
          tokenId,
          associated: true,
          alreadyAssociated: true,
          network,
        } satisfies AssociateTokenOutput,
      };
    }

    throw error;
  }

  if (!result.success) {
    throw new TransactionError('Token association failed', false, {
      context: { tokenId, accountId: account.accountId },
    });
  }

  saveAssociationToState(tokenState, tokenId, account.accountId, logger);

  const outputData: AssociateTokenOutput = {
    accountId: account.accountId,
    tokenId,
    associated: true,
    transactionId: result.transactionId,
    network,
  };

  return { result: outputData };
}
