import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AccountBalanceOutput } from './output';
import type {
  AccountBalanceBuildTransactionResult,
  AccountBalanceExecuteTransactionResult,
  AccountBalanceNormalisedParams,
  AccountBalanceSignTransactionResult,
} from './types';

import BigNumber from 'bignumber.js';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import { fetchAccountTokenBalances } from '@/plugins/account/utils/balance-helpers';

import { AccountBalanceInputSchema, TokenEntityType } from './input';

export class AccountBalanceCommand extends BaseTransactionCommand<
  AccountBalanceNormalisedParams,
  AccountBalanceBuildTransactionResult,
  AccountBalanceSignTransactionResult,
  AccountBalanceExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AccountBalanceNormalisedParams> {
    const { api } = args;

    const validArgs = AccountBalanceInputSchema.parse(args.args);

    const accountIdOrNameOrAlias = validArgs.account;
    const hbarOnly = validArgs.hbarOnly;
    const token = validArgs.token;
    const tokenOnly = !!token;
    const raw = validArgs.raw;

    const network = api.network.getCurrentNetwork();
    let accountId = accountIdOrNameOrAlias;

    const account = api.alias.resolve(
      accountIdOrNameOrAlias,
      AliasType.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
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

    return { accountId, hbarOnly, tokenOnly, raw, network, tokenId };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: AccountBalanceNormalisedParams,
  ): Promise<AccountBalanceBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: AccountBalanceNormalisedParams,
    b: AccountBalanceBuildTransactionResult,
  ): Promise<AccountBalanceSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: AccountBalanceNormalisedParams,
    b: AccountBalanceBuildTransactionResult,
    s: AccountBalanceSignTransactionResult,
  ): Promise<AccountBalanceExecuteTransactionResult> {
    void b;
    void s;
    const { api } = args;

    let hbarBalance: bigint | undefined;
    let hbarBalanceDisplay: string | undefined;

    if (!p.tokenOnly) {
      hbarBalance = await api.mirror.getAccountHBarBalance(p.accountId);
      if (!p.raw) {
        const hbarBalanceBigNumber = new BigNumber(hbarBalance);
        hbarBalanceDisplay = normalizeBalance(
          hbarBalanceBigNumber,
          HBAR_DECIMALS,
        );
      }
    }

    let tokenBalances: AccountBalanceExecuteTransactionResult['tokenBalances'];

    if (!p.hbarOnly) {
      tokenBalances = await fetchAccountTokenBalances(
        api,
        p.accountId,
        p.tokenId,
        p.raw,
        p.network,
      );
    }

    return { hbarBalance, hbarBalanceDisplay, tokenBalances };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: AccountBalanceNormalisedParams,
    b: AccountBalanceBuildTransactionResult,
    s: AccountBalanceSignTransactionResult,
    e: AccountBalanceExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void b;
    void s;

    const outputData: AccountBalanceOutput = {
      accountId: p.accountId,
      hbarOnly: p.hbarOnly,
      tokenOnly: p.tokenOnly,
      raw: p.raw,
      network: p.network,
      hbarBalance: e.hbarBalance,
      hbarBalanceDisplay: e.hbarBalanceDisplay,
      tokenBalances: e.tokenBalances,
    };

    return { result: outputData };
  }
}
