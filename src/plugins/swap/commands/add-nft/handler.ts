import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddNftOutput } from './output';

import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapAddNftInputSchema } from './input';

export class SwapAddNftCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapAddNftInputSchema.parse(args.args);
    const { name, serials } = validArgs;

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();
    const helper = new SwapStateHelper(api.state);

    helper.assertCanAdd(name, serials.length);

    const { entityIdOrEvmAddress: tokenId } =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.token.value,
        referenceType: validArgs.token.type,
        network,
        aliasType: AliasType.Token,
      });

    const fromResolved = await api.keyResolver.resolveAccountCredentials(
      validArgs.from,
      keyManager,
      true,
      ['token:account'],
    );

    const toResolved = await api.keyResolver.resolveDestination(
      validArgs.to,
      keyManager,
    );
    const toDestination = toResolved.accountId ?? toResolved.evmAddress ?? '';

    const updated = helper.addTransfer(name, {
      type: SwapTransferType.NFT,
      from: {
        accountId: fromResolved.accountId,
        keyRefId: fromResolved.keyRefId,
      },
      to: toDestination,
      token: tokenId,
      serials,
    });

    const output: SwapAddNftOutput = {
      swapName: name,
      from: fromResolved.accountId,
      to: toDestination,
      token: tokenId,
      serials,
      transferCount: updated.transfers.length,
      maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    };

    return { result: output };
  }
}

export async function swapAddNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapAddNftCommand().execute(args);
}
