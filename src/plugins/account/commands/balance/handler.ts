/**
 * Account Balance Command Handler
 * Handles account balance retrieval using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { TokenBalance } from '../../../../../types';
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { CoreApi } from '../../../../core';
import { formatError } from '../../../../utils/errors';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import { AccountBalanceOutput } from './output';
import { AliasType } from '../../../../core/services/alias/alias-service.interface';

/**
 * Fetches and maps token balances for an account
 * @param api - The Core API instance
 * @param accountId - The account ID to fetch token balances for
 * @returns An array of token balances or undefined if no tokens found
 * @throws Error if token balances could not be fetched
 */
async function fetchAccountTokenBalances(
  api: CoreApi,
  accountId: string,
): Promise<
  | Array<{
      tokenId: string;
      balance: bigint;
    }>
  | undefined
> {
  const tokenBalances = await api.mirror.getAccountTokenBalances(accountId);
  if (tokenBalances.tokens && tokenBalances.tokens.length > 0) {
    return tokenBalances.tokens.map((token: TokenBalance) => ({
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

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Extract command arguments
  const accountIdOrNameOrAlias = args.args.account as string;
  const onlyHbar = (args.args.onlyHbar as boolean) || false;
  // @TODO Add handling for specific tokenId if provided, rn missing functionality
  // @TODO Dont allow both onlyHbar and tokenId at the same time
  const tokenId = args.args.tokenId as string;

  logger.log(`Getting balance for account: ${accountIdOrNameOrAlias}`);

  try {
    // Resolve account identifier (could be name, account ID, or alias)
    let accountId = accountIdOrNameOrAlias;

    // First check if it's a stored account name
    const account = accountState.loadAccount(accountIdOrNameOrAlias);
    if (account) {
      accountId = account.accountId;
      logger.log(`Found account in state: ${account.name} -> ${accountId}`);
    } else {
      const currentNetwork = api.network.getCurrentNetwork();
      const resolved = api.alias.resolve(
        accountIdOrNameOrAlias,
        AliasType.Account,
        currentNetwork,
      );

      if (!resolved?.entityId) {
        return {
          status: Status.Failure,
          errorMessage: `Account not found with ID or alias: ${accountIdOrNameOrAlias}`,
        };
      }

      accountId = resolved.entityId;
    }

    // Get HBAR balance from mirror node
    const hbarBalance = await api.mirror.getAccountHBarBalance(accountId);

    // Prepare output data
    const outputData: AccountBalanceOutput = {
      accountId,
      hbarBalance: hbarBalance,
    };

    // Get token balances if not only HBAR
    if (!onlyHbar && !tokenId) {
      try {
        outputData.tokenBalances = await fetchAccountTokenBalances(
          api,
          accountId,
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
      // @TODO Remove all of these, in future PR comes serialization for bigint
      outputJson: JSON.stringify(outputData, (_key, value): unknown =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get account balance', error),
    };
  }
}
