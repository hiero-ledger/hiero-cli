import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddFtOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapAddFtInputSchema } from './input';

export class SwapAddFtCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapAddFtInputSchema.parse(args.args);
    const { name } = validArgs;

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();
    const helper = new SwapStateHelper(api.state);

    helper.assertCanAdd(name, 1);

    const { entityIdOrEvmAddress: tokenId } =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.token.value,
        referenceType: validArgs.token.type,
        network,
        aliasType: AliasType.Token,
      });

    const [tokenInfo, fromResolved, toResolved] = await Promise.all([
      api.mirror.getTokenInfo(tokenId),
      api.keyResolver.resolveAccountCredentials(
        validArgs.from,
        keyManager,
        true,
        ['token:account'],
      ),
      api.keyResolver.resolveDestination(validArgs.to, keyManager),
    ]);

    const decimals = parseInt(tokenInfo.decimals) || 0;
    const rawAmount = processTokenBalanceInput(validArgs.amount, decimals);

    if (!toResolved.accountId) {
      throw new ValidationError(
        'The parameter "to" could not be resolved to an account ID',
      );
    }
    const toDestination = toResolved.accountId;

    const updated = helper.addTransfer(name, {
      type: SwapTransferType.FT,
      from: {
        accountId: fromResolved.accountId,
        keyRefId: fromResolved.keyRefId,
      },
      to: toDestination,
      token: tokenId,
      amount: rawAmount.toString(),
    });

    const output: SwapAddFtOutput = {
      swapName: name,
      from: fromResolved.accountId,
      to: toDestination,
      token: tokenId,
      amount: validArgs.amount,
      transferCount: updated.transfers.length,
      maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    };

    return { result: output };
  }
}

export async function swapAddFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapAddFtCommand().execute(args);
}
