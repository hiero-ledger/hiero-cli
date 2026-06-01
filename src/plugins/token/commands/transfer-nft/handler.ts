import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenTransferNftOutput } from './output';
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
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { NftTransferEntry } from '@/core/services/transfer';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

import { TokenTransferNftInputSchema } from './input';

export const TOKEN_TRANSFER_NFT_COMMAND_NAME = 'token_transfer-nft';

export class TokenTransferNftCommand extends BaseTransactionCommand<
  TransferNftNormalizedParams,
  TransferNftBuildTransactionResult,
  TransferNftSignTransactionResult,
  TransferNftExecuteTransactionResult
> {
  constructor(private readonly tokenReferenceService: TokenReferenceService) {
    super(TOKEN_TRANSFER_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TransferNftNormalizedParams> {
    const { api } = args;
    const validArgs = TokenTransferNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { tokenIdOrAlias: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    if (tokenInfo.type !== MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE) {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId, type: tokenInfo.type },
      });
    }

    const resolvedFromAccount = await api.keyResolver.resolveAccountCredentials(
      validArgs.from,
      keyManager,
      true,
      ['token:account'],
    );
    const fromAccountId = resolvedFromAccount.accountId;
    const signerKeyRefId = resolvedFromAccount.keyRefId;

    api.logger.info(`🔑 Using from account: ${fromAccountId}`);
    api.logger.info('🔑 Will sign with from account key');

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

    const resolvedToAccount =
      await this.tokenReferenceService.resolveDestinationAccount(
        validArgs.to,
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

    const toAccountId =
      resolvedToAccount.accountId ?? resolvedToAccount.evmAddress;

    if (!toAccountId) {
      throw new NotFoundError(
        `Destination account not found: ${validArgs.to}`,
        {
          context: { to: validArgs.to },
        },
      );
    }

    api.logger.info(
      `Transferring ${validArgs.serials.length} NFT(s) of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
    );

    return {
      network,
      tokenId,
      fromAccountId,
      toAccountId,
      serials: validArgs.serials,
      signerKeyRefId,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
  ): Promise<TransferNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.transfer.buildTransferTransaction(
      normalisedParams.serials.map(
        (serial) =>
          new NftTransferEntry(
            normalisedParams.fromAccountId,
            normalisedParams.toAccountId,
            normalisedParams.tokenId,
            serial,
          ),
      ),
    );
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
    buildTransactionResult: TransferNftBuildTransactionResult,
  ): Promise<TransferNftSignTransactionResult> {
    const { api } = args;
    api.logger.debug(
      `Using key ${normalisedParams.signerKeyRefId} for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNftNormalizedParams,
    _buildTransactionResult: TransferNftBuildTransactionResult,
    signTransactionResult: TransferNftSignTransactionResult,
  ): Promise<TransferNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
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
    const outputData: TokenTransferNftOutput = {
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

export async function tokenTransferNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenTransferNftCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
  ).execute(args);
}
