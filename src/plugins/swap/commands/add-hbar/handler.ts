import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddHbarOutput } from './output';

import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import { formatAccount, SwapStateHelper } from '@/plugins/swap/state-helper';
import { resolveDestinationAccountParameter } from '@/plugins/token/resolver-helper';

import { SwapAddHbarInputSchema } from './input';

export async function swapAddHbar(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = SwapAddHbarInputSchema.parse(args.args);
  const { name, amount } = validArgs;

  const keyManager =
    validArgs.keyManager ??
    api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

  const network = api.network.getCurrentNetwork();
  const helper = new SwapStateHelper(api.state);

  helper.assertCanAdd(name, 1);

  const fromResolved = await api.keyResolver.resolveAccountCredentials(
    validArgs.from,
    keyManager,
    true,
  );

  const toResolved = resolveDestinationAccountParameter(
    validArgs.to,
    api,
    network,
  );

  const updated = helper.addTransfer(name, {
    type: SwapTransferType.HBAR,
    from: {
      input: validArgs.from?.rawValue ?? fromResolved.accountId,
      accountId: fromResolved.accountId,
      keyRefId: fromResolved.keyRefId,
    },
    to: {
      input: validArgs.to,
      accountId: toResolved!.accountId,
    },
    amount,
  });

  const output: SwapAddHbarOutput = {
    swapName: name,
    from: formatAccount(
      validArgs.from?.rawValue ?? fromResolved.accountId,
      fromResolved.accountId,
    ),
    to: formatAccount(validArgs.to, toResolved!.accountId),
    amount,
    transferCount: updated.transfers.length,
    maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
  };

  return { result: output };
}
