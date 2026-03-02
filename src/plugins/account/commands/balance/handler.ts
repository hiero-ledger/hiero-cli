/**
 * Account Balance Command Handler
 * Handles account balance retrieval using the Core API
 * Follows ADR-003 contract: returns CommandResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AccountBalanceOutput } from './output';

import BigNumber from 'bignumber.js';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import { fetchAccountTokenBalances } from '@/plugins/account/utils/balance-helpers';

import { AccountBalanceInputSchema, TokenEntityType } from './input';

export async function getAccountBalance(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = AccountBalanceInputSchema.parse(args.args);

  const accountIdOrNameOrAlias = validArgs.account;
  const hbarOnly = validArgs.hbarOnly;
  const token = validArgs.token;
  const tokenOnly = !!token;
  const raw = validArgs.raw;

  logger.info(`Getting balance for account: ${accountIdOrNameOrAlias}`);

  const network = args.api.network.getCurrentNetwork();
  let accountId = accountIdOrNameOrAlias;

  const account = args.api.alias.resolve(
    accountIdOrNameOrAlias,
    ALIAS_TYPE.Account,
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
      throw new NotFoundError(
        `Account not found with ID or alias: ${accountIdOrNameOrAlias}`,
      );
    }

    accountId = accountIdParseResult.data;
  }

  const outputData: AccountBalanceOutput = {
    accountId,
    hbarOnly,
    tokenOnly,
    raw,
    network,
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
    let tokenId: string | undefined;
    if (token) {
      if (token.type === TokenEntityType.Alias) {
        const resolved = api.alias.resolve(
          token.value,
          ALIAS_TYPE.Token,
          network,
        );
        if (!resolved || !resolved.entityId) {
          throw new NotFoundError(
            `Token not found with ID or alias: ${token.value}`,
          );
        }
        tokenId = resolved.entityId;
      } else {
        tokenId = token.value;
      }
    }

    outputData.tokenBalances = await fetchAccountTokenBalances(
      api,
      accountId,
      tokenId,
      raw,
      network,
    );
  }

  return { result: outputData };
}
