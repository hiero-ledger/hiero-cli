import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferNftOutput } from './output';

import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TransferNftInputSchema } from './input';

export async function transferNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = TransferNftInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const from = validArgs.from;
  const to = validArgs.to;
  const serials = validArgs.serials;
  const keyManagerArg = validArgs.keyManager;

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
      context: { tokenIdOrAlias },
    });
  }

  const tokenId = resolvedToken.tokenId;

  const tokenInfo = await api.mirror.getTokenInfo(tokenId);

  if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
    throw new ValidationError('Token is not an NFT', {
      context: { tokenId, type: tokenInfo.type },
    });
  }

  const resolvedFromAccount = await api.keyResolver.getOrInitKeyWithFallback(
    from,
    keyManager,
    ['token:account'],
  );

  const fromAccountId = resolvedFromAccount.accountId;
  const signerKeyRefId = resolvedFromAccount.keyRefId;

  logger.info(`🔑 Using from account: ${fromAccountId}`);
  logger.info(`🔑 Will sign with from account key`);

  for (const serial of serials) {
    const nftInfo = await api.mirror.getNftInfo(tokenId, serial);

    if (nftInfo.account_id !== fromAccountId) {
      throw new ValidationError('NFT not owned by sender', {
        context: {
          tokenId,
          serial,
          owner: nftInfo.account_id,
          expected: fromAccountId,
        },
      });
    }
  }

  const resolvedToAccount = resolveDestinationAccountParameter(
    to,
    api,
    network,
  );

  if (!resolvedToAccount) {
    throw new NotFoundError(`Destination account not found: ${to}`, {
      context: { to },
    });
  }

  const toAccountId = resolvedToAccount.accountId;

  logger.info(
    `Transferring ${serials.length} NFT(s) of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
  );

  const transferTransaction = api.token.createNftTransferTransaction({
    tokenId,
    fromAccountId,
    toAccountId,
    serialNumbers: serials,
  });

  logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
  const result = await api.txExecution.signAndExecuteWith(transferTransaction, [
    signerKeyRefId,
  ]);

  if (!result.success) {
    throw new TransactionError('NFT transfer failed', false);
  }

  const outputData: TransferNftOutput = {
    transactionId: result.transactionId,
    tokenId,
    from: fromAccountId,
    to: toAccountId,
    serials,
    network,
  };

  return { result: outputData };
}
