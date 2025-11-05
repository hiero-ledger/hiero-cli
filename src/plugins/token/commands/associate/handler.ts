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
import { formatError } from '../../../../utils/errors';
import { AssociateTokenOutput } from './output';

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
      // 3. Update token state with association
      tokenState.addTokenAssociation(tokenId, accountId, accountName);
      logger.log(`   Association saved to token state`);

      // Prepare output data
      const outputData: AssociateTokenOutput = {
        transactionId: result.transactionId,
        accountId,
        tokenId,
        associated: true,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      return {
        status: Status.Failure,
        errorMessage: 'Token association failed',
      };
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to associate token', error),
    };
  }
}
