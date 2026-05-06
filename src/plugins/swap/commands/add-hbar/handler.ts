import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddHbarOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import {
  HBAR_DECIMALS,
  HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
} from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapAddHbarInputSchema } from './input';

export class SwapAddHbarCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapAddHbarInputSchema.parse(args.args);
    const { name } = validArgs;
    const rawAmount = processBalanceInput(validArgs.amount, HBAR_DECIMALS);

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const helper = new SwapStateHelper(api.state);

    helper.assertCanAdd(name, 1);

    const fromResolved = await api.keyResolver.resolveAccountCredentials(
      validArgs.from,
      keyManager,
      true,
    );

    const toResolved = await api.keyResolver.resolveDestination(
      validArgs.to,
      keyManager,
    );
    if (!toResolved.accountId) {
      throw new ValidationError(
        'Destination must be an account ID or an alias that resolves to an account ID',
      );
    }
    const toDestination = toResolved.accountId;

    const updated = helper.addTransfer(name, {
      type: SwapTransferType.HBAR,
      from: {
        accountId: fromResolved.accountId,
        keyRefId: fromResolved.keyRefId,
      },
      to: toDestination,
      amount: rawAmount.toString(),
    });

    const output: SwapAddHbarOutput = {
      swapName: name,
      from: fromResolved.accountId,
      to: toDestination,
      amount: validArgs.amount,
      transferCount: updated.transfers.length,
      maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    };

    return { result: output };
  }
}

export async function swapAddHbar(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapAddHbarCommand().execute(args);
}
