import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountViewOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';

import { AccountViewInputSchema } from './input';

export class AccountViewCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validArgs = AccountViewInputSchema.parse(args.args);

    const accountIdOrNameOrAlias = validArgs.account;

    logger.info(`Viewing account details: ${accountIdOrNameOrAlias}`);

    let accountId = accountIdOrNameOrAlias;

    const network = api.network.getCurrentNetwork();
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

    const accountInfo = await api.mirror.getAccountOrThrow(accountId);

    const outputData: AccountViewOutput = {
      accountId: accountInfo.accountId,
      balance: BigInt(accountInfo.balance.balance.toString()),
      ...(accountInfo.evmAddress && { evmAddress: accountInfo.evmAddress }),
      ...(accountInfo.accountPublicKey && {
        publicKey: accountInfo.accountPublicKey,
      }),
      balanceTimestamp: accountInfo.balance.timestamp,
      network,
    };

    return { result: outputData };
  }
}

export const accountView = (args: CommandHandlerArgs) =>
  new AccountViewCommand().execute(args);
