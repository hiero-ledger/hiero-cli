import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountBalanceService } from '@/plugins/account/services/account-balance.service.interface';
import type { AccountBalanceOutput } from './output';

import BigNumber from 'bignumber.js';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import { AccountBalanceServiceImpl } from '@/plugins/account/services/account-balance.service';

import { AccountBalanceInputSchema, TokenEntityType } from './input';

export class AccountBalanceCommand implements Command {
  constructor(private readonly accountBalance: AccountBalanceService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = AccountBalanceInputSchema.parse(args.args);

    const accountIdOrNameOrAlias = validArgs.account;
    const hbarOnly = validArgs.hbarOnly;
    const token = validArgs.token;
    const tokenOnly = !!token;
    const raw = validArgs.raw;

    api.logger.info(`Getting balance for account: ${accountIdOrNameOrAlias}`);

    const network = api.network.getCurrentNetwork();
    let accountId = accountIdOrNameOrAlias;

    const account = api.alias.resolve(
      accountIdOrNameOrAlias,
      AliasType.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      api.logger.info(
        `Found account in state: ${account.alias} -> ${accountId}`,
      );
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
    console.log('signoff test');
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

      outputData.tokenBalances = await this.accountBalance.fetchTokenBalances(
        accountId,
        tokenId,
        raw,
        network,
      );

      outputData.nftBalances = await this.accountBalance.fetchNftBalances(
        accountId,
        tokenId,
        network,
      );
    }

    return { result: outputData };
  }
}

export const accountBalance = (args: CommandHandlerArgs) =>
  new AccountBalanceCommand(
    new AccountBalanceServiceImpl(args.api.mirror, args.api.alias),
  ).execute(args);
