/**
 * Token Associate Command Handler
 * Handles token association operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { safeValidateTokenAssociateParams } from '../../schema';
import {
  resolveAccountParameter,
  resolveTokenParameter,
} from '../../resolver-helper';
import { formatError } from '../../../../core/utils/errors';
import { AssociateTokenOutput } from './output';
import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

export async function associateToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validate command parameters
  const validationResult = safeValidateTokenAssociateParams(args.args);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(
      (error) => `${error.path.join('.')}: ${error.message}`,
    );
    return {
      status: Status.Failure,
      errorMessage: `Invalid command parameters:\n${errorMessages.join('\n')}`,
    };
  }

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Use validated parameters
  const validatedParams = validationResult.data;
  const tokenIdOrAlias = validatedParams.token;
  const accountIdOrAlias = validatedParams.account;

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

  const resolvedAccount = resolveAccountParameter(
    accountIdOrAlias,
    api,
    network,
  );

  // Account was explicitly provided - it MUST resolve or fail
  if (!resolvedAccount) {
    throw new Error(
      `Failed to resolve account parameter: ${accountIdOrAlias}. ` +
        `Expected format: account-name OR account-id:account-key`,
    );
  }

  // Use resolved account from alias or account-id:account-key
  const accountId = resolvedAccount.accountId;
  const accountKeyRefId = resolvedAccount.accountKeyRefId;

  // Get the account name for state storage
  // If it's an alias, use the alias name; if it's account-id:key format, use account ID
  const accountName = accountIdOrAlias.includes(':')
    ? accountId
    : accountIdOrAlias;

  logger.log(`🔑 Using account: ${accountId}`);
  logger.log(`🔑 Will sign with account key`);
  logger.log(`Associating token ${tokenId} with account ${accountId}`);

  const saveAssociationToState = () => {
    const tokenData = tokenState.getToken(tokenId);
    if (tokenData) {
      tokenState.addTokenAssociation(tokenId, accountId, accountName);
      logger.log(`   Association saved to token state`);
    }
  };

  let alreadyAssociated = false;
  let transactionId: string | undefined;

  // Check if token is already associated on chain via Mirror Node
  try {
    const tokenBalances = await api.mirror.getAccountTokenBalances(
      accountId,
      tokenId,
    );
    const isAssociated = tokenBalances.tokens.some(
      (token) => token.token_id === tokenId,
    );

    if (isAssociated) {
      logger.log(
        `Token ${tokenId} is already associated with account ${accountId}`,
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
        accountId,
      });

      // 2. Sign and execute transaction using the account key
      logger.debug(`Using key ${accountKeyRefId} for signing transaction`);
      const result = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        {
          keyRefId: accountKeyRefId,
        },
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
        logger.log(
          `Token ${tokenId} is already associated with account ${accountId}`,
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
    accountId,
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
