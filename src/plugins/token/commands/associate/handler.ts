/**
 * Token Associate Command Handler
 * Handles token association operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { resolveTokenParameter } from '../../resolver-helper';
import { formatError } from '../../../../core/utils/errors';
import { AssociateTokenOutput } from './output';
import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { AssociateTokenInputSchema } from './input';

export async function associateToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Validate command parameters
  const validArgs = AssociateTokenInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const accountIdOrAlias = validArgs.account;
  const providedKeyManager = validArgs.keyManager;

  // Get keyManager from args or fallback to config
  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  // Resolve token ID from alias if provided
  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new Error(
      `Failed to resolve token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  // Resolve account parameter (alias or account-id:account-key) if provided

  const account = await api.keyResolver.resolveKeyOrAlias(
    accountIdOrAlias,
    keyManager,
    ['token:associate'],
  );

  logger.info(`🔑 Using account: ${account.accountId}`);
  logger.info(`🔑 Will sign with account key`);
  logger.info(`Associating token ${tokenId} with account ${account.accountId}`);

  const saveAssociationToState = () => {
    const tokenData = tokenState.getToken(tokenId);
    if (tokenData) {
      tokenState.addTokenAssociation(
        tokenId,
        account.accountId,
        account.accountId,
      );
      logger.info(`   Association saved to token state`);
    }
  };

  let alreadyAssociated = false;
  let transactionId: string | undefined;

  // Check if token is already associated on chain via Mirror Node
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

      saveAssociationToState();
      alreadyAssociated = true;
    }
  } catch (mirrorError) {
    logger.debug(
      `Failed to check token association via Mirror Node: ${formatError('', mirrorError)}. Proceeding with transaction.`,
    );
  }

  if (!alreadyAssociated) {
    try {
      // 1. Create association transaction using Core API
      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: account.accountId,
      });

      // Sign and execute using the account key
      logger.debug(`Using key ${account.keyRefId} for signing transaction`);
      const result = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        [account.keyRefId],
      );

      if (result.success) {
        transactionId = result.transactionId;
        saveAssociationToState();
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
        saveAssociationToState();
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
