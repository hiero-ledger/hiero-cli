/**
 * Account Balance Command Handler
 * Handles account balance retrieval using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { TokenBalanceInfo } from '../../../../core/services/mirrornode/types';
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { CoreApi } from '../../../../core';
import { formatError } from '../../../../core/utils/errors';
import { AccountBalanceOutput } from './output';
import { EntityIdSchema } from '../../../../core/schemas';
import { AliasType } from '../../../../core/services/alias/alias-service.interface';
import { AccountBalanceInputSchema, TokenEntityType } from './input';

/**
 * Fetches and maps token balances for an account
 * @param api - The Core API instance
 * @param accountId - The account ID to fetch token balances for
 * @param tokenId - Optional specific token ID to filter by
 * @returns An array of token balances or undefined if no tokens found
 * @throws Error if token balances could not be fetched
 */
async function fetchAccountTokenBalances(
  api: CoreApi,
  accountId: string,
  tokenId: string | undefined,
): Promise<
  | Array<{
      tokenId: string;
      balance: bigint;
    }>
  | undefined
> {
  const tokenBalances = await api.mirror.getAccountTokenBalances(
    accountId,
    tokenId,
  );
  if (tokenBalances.tokens && tokenBalances.tokens.length > 0) {
    return tokenBalances.tokens.map((token: TokenBalanceInfo) => ({
      tokenId: token.token_id,
      balance: BigInt(token.balance.toString()),
    }));
  }
  return undefined;
}

export async function getAccountBalance(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate command arguments
  const validArgs = AccountBalanceInputSchema.parse(args.args);

  const accountIdOrNameOrAlias = validArgs.account;
  const hbarOnly = validArgs.hbarOnly;
  const token = validArgs.token;
  const tokenOnly = !!token;

  logger.info(`Getting balance for account: ${accountIdOrNameOrAlias}`);

  try {
    // Resolve account identifier (could be name, account ID, or alias)
    let accountId = accountIdOrNameOrAlias;

    // First check if it's a stored account name (alias)
    const network = args.api.network.getCurrentNetwork();
    const account = args.api.alias.resolve(
      accountIdOrNameOrAlias,
      AliasType.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      logger.info(`Found account in state: ${account.alias} -> ${accountId}`);
    } else {
      const accountIdParseResult = EntityIdSchema.safeParse(
        accountIdOrNameOrAlias,
      );

      if (!accountIdParseResult.success) {
        return {
          status: Status.Failure,
          errorMessage: `Account not found with ID or alias: ${accountIdOrNameOrAlias}`,
        };
      }

      accountId = accountIdParseResult.data;
    }

    const outputData: AccountBalanceOutput = {
      accountId,
      hbarOnly,
      tokenOnly,
    };

    if (!tokenOnly) {
      outputData.hbarBalance =
        await api.mirror.getAccountHBarBalance(accountId);
    }

    if (!hbarOnly) {
      /* TODO: move this fetching of token ID to separate function when we will have domain error handling
      as it will increase readability of this code */
      let tokenId: string | undefined;
      if (token) {
        if (token.type === TokenEntityType.Alias) {
          const resolved = api.alias.resolve(
            token.value,
            AliasType.Token,
            network,
          );
          if (!resolved || !resolved.entityId) {
            return {
              status: Status.Failure,
              errorMessage: `Token not found with ID or alias: ${token.value}`,
            };
          }
          tokenId = resolved.entityId;
        } else {
          tokenId = token.value;
        }
      }
      try {
        outputData.tokenBalances = await fetchAccountTokenBalances(
          api,
          accountId,
          tokenId,
        );
      } catch (error: unknown) {
        return {
          status: Status.Failure,
          errorMessage: formatError('Could not fetch token balances', error),
        };
      }
    }

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get account balance', error),
    };
  }
}
