import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenUpdateNftMetadataOutput } from './output';
import type {
  UpdateNftMetadataBuildTransactionResult,
  UpdateNftMetadataExecuteTransactionResult,
  UpdateNftMetadataNormalizedParams,
  UpdateNftMetadataSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { MAX_NFT_METADATA_BYTES } from '@/plugins/token/constants';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenUpdateNftMetadataInputSchema } from './input';

export const TOKEN_UPDATE_NFT_METADATA_COMMAND_NAME =
  'token_update-metadata-nft';

export class TokenUpdateNftMetadataCommand extends BaseTransactionCommand<
  UpdateNftMetadataNormalizedParams,
  UpdateNftMetadataBuildTransactionResult,
  UpdateNftMetadataSignTransactionResult,
  UpdateNftMetadataExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_UPDATE_NFT_METADATA_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<UpdateNftMetadataNormalizedParams> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = TokenUpdateNftMetadataInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { tokenIdOrAlias: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    logger.info(`Updating NFT metadata for token: ${tokenId}`);

    const metadataBytes = new TextEncoder().encode(validArgs.metadata);
    if (metadataBytes.length > MAX_NFT_METADATA_BYTES) {
      throw new ValidationError('Metadata exceeds 100 bytes', {
        context: { tokenId, size: metadataBytes.length },
      });
    }

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = tokenState.getToken(tokenId);
    const isNftByState =
      tokenData !== null &&
      tokenData.tokenType === HederaTokenType.NON_FUNGIBLE_TOKEN;
    const isNftByMirror =
      tokenInfo.type === MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE;

    if (!isNftByState && !isNftByMirror) {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId },
      });
    }

    const { keyRefIds } =
      await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
        mirrorRoleKey: tokenInfo.metadata_key,
        explicitCredentials: validArgs.metadataKey,
        keyManager,
        resolveSigningKeyLabels: ['token:metadata'],
        emptyMirrorRoleKeyMessage: 'Token has no metadata key',
        insufficientKmsMatchesMessage:
          'Not enough metadata key(s) found in key manager for this token. Provide --metadata-key.',
        validationErrorOptions: { context: { tokenId } },
      });

    return {
      network,
      tokenId,
      serialNumbers: validArgs.serials,
      metadataBytes,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNftMetadataNormalizedParams,
  ): Promise<UpdateNftMetadataBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createUpdateNftMetadataTransaction({
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
      metadata: normalisedParams.metadataBytes,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNftMetadataNormalizedParams,
    buildTransactionResult: UpdateNftMetadataBuildTransactionResult,
  ): Promise<UpdateNftMetadataSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNftMetadataNormalizedParams,
    _buildTransactionResult: UpdateNftMetadataBuildTransactionResult,
    signTransactionResult: UpdateNftMetadataSignTransactionResult,
  ): Promise<UpdateNftMetadataExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!transactionResult.success) {
      throw new TransactionError(
        `NFT metadata update failed (tokenId: ${normalisedParams.tokenId}, txId: ${transactionResult.transactionId})`,
        false,
      );
    }
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: UpdateNftMetadataNormalizedParams,
    _buildTransactionResult: UpdateNftMetadataBuildTransactionResult,
    _signTransactionResult: UpdateNftMetadataSignTransactionResult,
    executeTransactionResult: UpdateNftMetadataExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenUpdateNftMetadataOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenUpdateNftMetadata(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenUpdateNftMetadataCommand().execute(args);
}
