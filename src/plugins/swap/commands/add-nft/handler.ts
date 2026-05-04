import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddNftOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { SwapAddNftInputSchema } from './input';

export async function swapAddNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = SwapAddNftInputSchema.parse(args.args);
  const { name, serials } = validArgs;

  const keyManager =
    validArgs.keyManager ??
    api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

  const network = api.network.getCurrentNetwork();
  const helper = new SwapStateHelper(api.state);

  // Each serial is a separate transfer entry
  helper.assertCanAdd(name, serials.length);

  const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
  if (!resolvedToken) {
    throw new NotFoundError(`Token "${validArgs.token}" not found`, {
      context: { token: validArgs.token, network },
    });
  }

  const fromResolved = await api.keyResolver.resolveAccountCredentials(
    validArgs.from,
    keyManager,
    true,
    ['token:account'],
  );

  const toResolved = resolveDestinationAccountParameter(
    validArgs.to,
    api,
    network,
  );

  const updated = helper.addTransfer(name, {
    type: SwapTransferType.NFT,
    from: {
      input: validArgs.from?.rawValue ?? fromResolved.accountId,
      accountId: fromResolved.accountId,
      keyRefId: fromResolved.keyRefId,
    },
    to: {
      input: validArgs.to,
      accountId: toResolved!.accountId,
    },
    token: {
      input: validArgs.token,
      tokenId: resolvedToken.tokenId,
    },
    serials,
  });

  const output: SwapAddNftOutput = {
    swapName: name,
    from: formatAccount(
      validArgs.from?.rawValue ?? fromResolved.accountId,
      fromResolved.accountId,
    ),
    to: formatAccount(validArgs.to, toResolved!.accountId),
    token: formatToken(validArgs.token, resolvedToken.tokenId),
    serials,
    transferCount: updated.transfers.length,
    maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
  };

  return { result: output };
}
