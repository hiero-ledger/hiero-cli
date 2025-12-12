/**
 * Account Balance Command Handler
 * Handles account balance retrieval using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import BigNumber from 'bignumber.js';

import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import { fetchAccountTokenBalances } from '@/plugins/account/utils/balance-helpers';

import { AccountBalanceInputSchema, TokenEntityType } from './input';
import type { AccountBalanceOutput } from './output';

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
  const raw = validArgs.raw;

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
      raw,
    };

    if (!tokenOnly) {
      const hbarBalanceRaw = await api.mirror.getAccountHBarBalance(accountId);
      outputData.hbarBalance = hbarBalanceRaw;

      if (!raw) {
        const hbarBalanceBigNumber = new BigNumber(hbarBalanceRaw);
        outputData.hbarBalanceDisplay = normalizeBalance(
          hbarBalanceBigNumber,
          HBAR_DECIMALS,
        );
      }
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
          raw,
          network,
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
