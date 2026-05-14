import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { MemoStateService } from '@/plugins/test/services/memo-state.service.interface';
import type { TestMemoOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType, EntityReferenceType } from '@/core/types/shared.types';
import { TestMemoInputSchema } from '@/plugins/test/commands/memo/input';
import { MemoStateServiceImpl } from '@/plugins/test/services/memo-state.service';

export class TestMemoCommand implements Command {
  constructor(private readonly memoState: MemoStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = TestMemoInputSchema.parse(args.args);
    const memo = validArgs.memo;
    const accountAlias = validArgs.account;

    this.resolveAccountAlias(args, accountAlias);

    const existingMemo = this.memoState.getMemo(accountAlias);
    if (existingMemo) {
      throw new StateError(
        `Memo already existing for an account ${accountAlias}`,
        {
          context: { accountAlias },
        },
      );
    }

    const memoData = {
      account: accountAlias,
      memo,
    };
    this.memoState.saveMemo(accountAlias, memoData);

    const output: TestMemoOutput = {
      memo,
      account: accountAlias,
    };

    return { result: output };
  }

  private resolveAccountAlias(
    args: CommandHandlerArgs,
    accountAlias: string,
  ): void {
    try {
      args.api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: accountAlias,
        referenceType: EntityReferenceType.ALIAS,
        network: args.api.network.getCurrentNetwork(),
        aliasType: AliasType.Account,
      });
    } catch (error) {
      throw new NotFoundError(
        `Failed to create memo for an account. Missing account in state ${accountAlias}`,
        { context: { accountAlias }, cause: error },
      );
    }
  }
}

export async function testMemo(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TestMemoCommand(
    new MemoStateServiceImpl(args.api.state, args.api.logger),
  ).execute(args);
}
