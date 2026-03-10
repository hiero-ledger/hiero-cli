import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ViewAccountOutput } from './output';
import type {
  ViewAccountBuildTransactionResult,
  ViewAccountExecuteTransactionResult,
  ViewAccountNormalisedParams,
  ViewAccountSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';

import { ViewAccountInputSchema } from './input';

export class ViewAccountCommand extends BaseTransactionCommand<
  ViewAccountNormalisedParams,
  ViewAccountBuildTransactionResult,
  ViewAccountSignTransactionResult,
  ViewAccountExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ViewAccountNormalisedParams> {
    const { api, logger } = args;

    const validArgs = ViewAccountInputSchema.parse(args.args);
    const accountIdOrNameOrAlias = validArgs.account;

    logger.info(`Viewing account details: ${accountIdOrNameOrAlias}`);

    const network = api.network.getCurrentNetwork();
    let accountId = accountIdOrNameOrAlias;

    const account = api.alias.resolve(
      accountIdOrNameOrAlias,
      AliasType.Account,
      network,
    );
    if (account && account.entityId) {
      accountId = account.entityId;
      logger.info(`Found account in state: ${account.alias}`);
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

    return { accountId, network };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: ViewAccountNormalisedParams,
  ): Promise<ViewAccountBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: ViewAccountNormalisedParams,
    b: ViewAccountBuildTransactionResult,
  ): Promise<ViewAccountSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: ViewAccountNormalisedParams,
    b: ViewAccountBuildTransactionResult,
    s: ViewAccountSignTransactionResult,
  ): Promise<ViewAccountExecuteTransactionResult> {
    void b;
    void s;
    return await args.api.mirror.getAccount(p.accountId);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: ViewAccountNormalisedParams,
    b: ViewAccountBuildTransactionResult,
    s: ViewAccountSignTransactionResult,
    e: ViewAccountExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void b;
    void s;

    const outputData: ViewAccountOutput = {
      accountId: e.accountId,
      balance: BigInt(e.balance.balance.toString()),
      ...(e.evmAddress && { evmAddress: e.evmAddress }),
      ...(e.accountPublicKey && { publicKey: e.accountPublicKey }),
      balanceTimestamp: e.balance.timestamp,
      network: p.network,
    };

    return { result: outputData };
  }
}
