import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenRejectAirdropOutput } from './output';
import type {
  RejectAirdropResolved,
  TokenRejectAirdropBuildTransactionResult,
  TokenRejectAirdropExecuteTransactionResult,
  TokenRejectAirdropNormalizedParams,
  TokenRejectAirdropSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import { KeySchema } from '@/core/schemas/common-schemas';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorTokenType } from '@/core/shared/constants';
import { AirdropTokenType } from '@/core/types/token.types';

import { TokenRejectAirdropInputSchema } from './input';

export const TOKEN_REJECT_AIRDROP_COMMAND_NAME = 'token_reject-airdrop';

export class TokenRejectAirdropCommand extends BaseTransactionCommand<
  TokenRejectAirdropNormalizedParams,
  TokenRejectAirdropBuildTransactionResult,
  TokenRejectAirdropSignTransactionResult,
  TokenRejectAirdropExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_REJECT_AIRDROP_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenRejectAirdropNormalizedParams> {
    const { api, logger } = args;
    const {
      owner,
      token: tokenId,
      serial: serials,
      from,
      keyManager: keyManagerArg,
    } = TokenRejectAirdropInputSchema.parse(args.args);

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();
    const { accountId: ownerAccountId } =
      await api.identityResolution.resolveAccount({
        accountReference: owner.value,
        type: owner.type,
        network,
      });

    logger.info(`Fetching token info for ${tokenId}...`);
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    const isNft = tokenInfo.type === MirrorTokenType.NON_FUNGIBLE_UNIQUE;

    if (isNft && !serials) {
      throw new ValidationError('--serial is required for NFT tokens');
    }

    if (!isNft && serials) {
      throw new ValidationError(
        '--serial is not applicable for fungible tokens',
      );
    }

    const rejectItems =
      isNft && serials
        ? serials.map((s) => ({ tokenId, serialNumber: s }))
        : [{ tokenId, serialNumber: undefined }];

    const resolvedAirdrop: RejectAirdropResolved = {
      tokenId,
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      type: isNft ? AirdropTokenType.NFT : AirdropTokenType.FUNGIBLE,
      serialNumbers: serials,
    };

    const signingCredential = from ?? KeySchema.parse(owner.value);
    const resolvedAccount = await api.keyResolver.resolveAccountCredentials(
      signingCredential,
      keyManager,
      false,
      ['token:account'],
    );

    if (!resolvedAccount?.keyRefId) {
      const fromDisplay = signingCredential.rawValue;
      throw new ValidationError(
        `Failed to resolve signing account: ${fromDisplay}`,
      );
    }

    const { keyRefId: signerKeyRefId } = resolvedAccount;

    logger.info(`Rejecting token ${tokenId} for ${ownerAccountId}`);

    return {
      network,
      ownerAccountId,
      signerKeyRefId,
      rejectItems,
      resolvedAirdrop,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenRejectAirdropNormalizedParams,
  ): Promise<TokenRejectAirdropBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building reject transaction body');

    const transaction = api.token.createRejectAirdropTransaction({
      ownerAccountId: normalisedParams.ownerAccountId,
      items: normalisedParams.rejectItems,
    });

    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenRejectAirdropNormalizedParams,
    buildTransactionResult: TokenRejectAirdropBuildTransactionResult,
  ): Promise<TokenRejectAirdropSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(`Using key ${normalisedParams.signerKeyRefId} for signing`);

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenRejectAirdropNormalizedParams,
    _buildTransactionResult: TokenRejectAirdropBuildTransactionResult,
    signTransactionResult: TokenRejectAirdropSignTransactionResult,
  ): Promise<TokenRejectAirdropExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Reject token transaction failed (owner: ${normalisedParams.ownerAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenRejectAirdropNormalizedParams,
    _buildTransactionResult: TokenRejectAirdropBuildTransactionResult,
    _signTransactionResult: TokenRejectAirdropSignTransactionResult,
    executeTransactionResult: TokenRejectAirdropExecuteTransactionResult,
  ): Promise<CommandResult> {
    const output: TokenRejectAirdropOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      ownerAccountId: normalisedParams.ownerAccountId,
      rejected: normalisedParams.resolvedAirdrop,
      network: normalisedParams.network,
    };

    return { result: output };
  }
}

export async function tokenRejectAirdrop(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenRejectAirdropCommand().execute(args);
}
