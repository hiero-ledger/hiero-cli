import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenRevokeKycOutput } from './output';
import type {
  RevokeKycBuildTransactionResult,
  RevokeKycExecuteTransactionResult,
  RevokeKycNormalizedParams,
  RevokeKycSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isNoKycKeyError } from '@/plugins/token/utils/transaction-error-receipt-status';

import { TokenRevokeKycInputSchema } from './input';

export const TOKEN_REVOKE_KYC_COMMAND_NAME = 'token_revoke_kyc';

export class TokenRevokeKycCommand extends BaseTransactionCommand<
  RevokeKycNormalizedParams,
  RevokeKycBuildTransactionResult,
  RevokeKycSignTransactionResult,
  RevokeKycExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_REVOKE_KYC_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<RevokeKycNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenRevokeKycInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: validArgs.account.value,
      type: validArgs.account.type,
      network,
    });

    logger.info(
      `Revoking KYC for account ${accountId} on token ${tokenId} on ${network}`,
    );

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.kyc_key,
      explicitCredentials: validArgs.kycKey,
      keyManager,
      signingKeyLabels: ['token:kyc'],
      emptyMirrorRoleKeyMessage: 'Token has no KYC key',
      insufficientKmsMatchesMessage:
        'Not enough KYC key(s) found in key manager for this token. Provide --kyc-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    return {
      network,
      tokenId,
      accountId,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: RevokeKycNormalizedParams,
  ): Promise<RevokeKycBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token revoke KYC transaction');
    const transaction = api.token.createRevokeKycTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: RevokeKycNormalizedParams,
    buildTransactionResult: RevokeKycBuildTransactionResult,
  ): Promise<RevokeKycSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: RevokeKycNormalizedParams,
    _buildTransactionResult: RevokeKycBuildTransactionResult,
    signTransactionResult: RevokeKycSignTransactionResult,
  ): Promise<RevokeKycExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token revoke KYC failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
          false,
        );
      }

      return { transactionResult: result };
    } catch (error) {
      if (isNoKycKeyError(error)) {
        throw new ValidationError('Token has no KYC key', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      throw error;
    }
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: RevokeKycNormalizedParams,
    _buildTransactionResult: RevokeKycBuildTransactionResult,
    _signTransactionResult: RevokeKycSignTransactionResult,
    executeTransactionResult: RevokeKycExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenRevokeKycOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenRevokeKyc(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenRevokeKycCommand().execute(args);
}
