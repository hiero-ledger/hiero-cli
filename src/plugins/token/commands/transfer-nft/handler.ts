import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferNftOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TransferNftInputSchema } from './input';

export async function transferNft(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
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
    throw new Error(
      `Failed to resolve NFT token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  try {
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
      return {
        status: Status.Failure,
        errorMessage: `Token ${tokenId} is not an NFT (NON_FUNGIBLE_UNIQUE). Type is: ${tokenInfo.type}`,
      };
    }
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to fetch token type for ${tokenId}`,
        error,
      ),
    };
  }

  const resolvedFromAccount = await api.keyResolver.getOrInitKeyWithFallback(
    from,
    keyManager,
    ['token:account'],
  );

  const fromAccountId = resolvedFromAccount.accountId;
  if (!fromAccountId) {
    throw new Error(
      `Could not resolve account ID for passed "from" argument ${validArgs.from?.type} from value ${validArgs.from?.rawValue}`,
    );
  }
  const signerKeyRefId = resolvedFromAccount.keyRefId;

  logger.info(`🔑 Using from account: ${fromAccountId}`);
  logger.info(`🔑 Will sign with from account key`);

  for (const serial of serials) {
    try {
      const nftInfo = await api.mirror.getNftInfo(tokenId, serial);

      if (nftInfo.account_id !== fromAccountId) {
        return {
          status: Status.Failure,
          errorMessage: `NFT ${tokenId}:${serial} is not owned by ${fromAccountId}. Owner: ${nftInfo.account_id}`,
        };
      }
    } catch (error) {
      return {
        status: Status.Failure,
        errorMessage: formatError(
          `Failed to verify ownership of NFT ${tokenId}:${serial}`,
          error,
        ),
      };
    }
  }

  const resolvedToAccount = resolveDestinationAccountParameter(
    to,
    api,
    network,
  );

  if (!resolvedToAccount) {
    throw new Error(
      `Failed to resolve to account parameter: ${to}. ` +
        `Expected format: account-name OR account-id`,
    );
  }

  const toAccountId = resolvedToAccount.accountId;

  logger.info(
    `Transferring ${serials.length} NFT(s) of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
  );

  try {
    const transferTransaction = api.token.createNftTransferTransaction({
      tokenId,
      fromAccountId,
      toAccountId,
      serialNumbers: serials,
    });

    logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
    const result = await api.txExecution.signAndExecuteWith(
      transferTransaction,
      [signerKeyRefId],
    );

    if (result.success) {
      const outputData: TransferNftOutput = {
        transactionId: result.transactionId,
        tokenId,
        from: fromAccountId,
        to: toAccountId,
        serials,
        network,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      return {
        status: Status.Failure,
        errorMessage: 'NFT transfer failed',
      };
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to transfer NFT', error),
    };
  }
}
