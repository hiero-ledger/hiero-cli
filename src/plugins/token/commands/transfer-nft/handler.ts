import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferNftOutput } from './output';
import type {
  TransferNftBuildTransactionResult,
  TransferNftExecuteTransactionResult,
  TransferNftNormalizedParams,
  TransferNftSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
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

export const TOKEN_TRANSFER_NFT_COMMAND_NAME = 'token_transfer-nft';

export class TransferNftCommand extends BaseTransactionCommand<
  TransferNftNormalizedParams,
  TransferNftBuildTransactionResult,
  TransferNftSignTransactionResult,
  TransferNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_TRANSFER_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TransferNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TransferNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManagerName>('default_key_manager');
    const network = api.network.getCurrentNetwork();
    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { tokenIdOrAlias: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId, type: tokenInfo.type },
      });
    }

    const resolvedFromAccount =
      await api.keyResolver.resolveAccountCredentialsWithFallback(
        validArgs.from,
        keyManager,
        ['token:account'],
      );
    const fromAccountId = resolvedFromAccount.accountId;
    const signerKeyRefId = resolvedFromAccount.keyRefId;

    logger.info(`🔑 Using from account: ${fromAccountId}`);
    logger.info('🔑 Will sign with from account key');

    for (const serial of validArgs.serials) {
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
      validArgs.to,
      api,
      network,
    );
    if (!resolvedToAccount) {
      throw new NotFoundError(
        `Destination account not found: ${validArgs.to}`,
        {
          context: { to: validArgs.to },
        },
      );
    }

    logger.info(
      `Transferring ${validArgs.serials.length} NFT(s) of ${tokenId} from ${fromAccountId} to ${resolvedToAccount.accountId}`,
    );

    return {
      network,
      tokenId,
      fromAccountId,
      toAccountId: resolvedToAccount.accountId,
      serials: validArgs.serials,
      signerKeyRefId,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
  ): Promise<TransferNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createNftTransferTransaction({
      tokenId: normalisedParams.tokenId,
      fromAccountId: normalisedParams.fromAccountId,
      toAccountId: normalisedParams.toAccountId,
      serialNumbers: normalisedParams.serials,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
    buildTransactionResult: TransferNftBuildTransactionResult,
  ): Promise<TransferNftSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.signerKeyRefId} for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );
    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
    _buildTransactionResult: TransferNftBuildTransactionResult,
    signTransactionResult: TransferNftSignTransactionResult,
  ): Promise<TransferNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.transaction,
    );
    if (!transactionResult.success) {
      throw new TransactionError(
        `NFT transfer failed (tokenId: ${normalisedParams.tokenId}, from: ${normalisedParams.fromAccountId}, to: ${normalisedParams.toAccountId}, txId: ${transactionResult.transactionId})`,
        false,
      );
    }
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
    _buildTransactionResult: TransferNftBuildTransactionResult,
    _signTransactionResult: TransferNftSignTransactionResult,
    executeTransactionResult: TransferNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TransferNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      from: normalisedParams.fromAccountId,
      to: normalisedParams.toAccountId,
      serials: normalisedParams.serials,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export const transferNft = (args: CommandHandlerArgs) =>
  new TransferNftCommand().execute(args);
