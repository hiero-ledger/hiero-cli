import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountBalanceOutput } from './output';

import BigNumber from 'bignumber.js';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import {
  fetchAccountNftBalances,
  fetchAccountTokenBalances,
} from '@/plugins/account/utils/balance-helpers';

import { AccountBalanceInputSchema, TokenEntityType } from './input';

export class AccountBalanceCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validArgs = AccountBalanceInputSchema.parse(args.args);

    const accountIdOrNameOrAlias = validArgs.account;
    const hbarOnly = validArgs.hbarOnly;
    const token = validArgs.token;
    const tokenOnly = !!token;
    const raw = validArgs.raw;

    logger.info(`Getting balance for account: ${accountIdOrNameOrAlias}`);

    const network = api.network.getCurrentNetwork();
    let accountId = accountIdOrNameOrAlias;

    const account = api.alias.resolve(
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
      const account = await api.mirror.getAccountOrThrow(accountId);
      const hbarBalanceRaw = BigInt(account.balance.balance);
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
            AliasType.Token,
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

      outputData.nftBalances = await fetchAccountNftBalances(
        api,
        accountId,
        tokenId,
        network,
      );
    }

    return { result: outputData };
  }
}

export const accountBalance = (args: CommandHandlerArgs) =>
  new AccountBalanceCommand().execute(args);
