import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenGrantKycOutput } from './output';
import type {
  GrantKycBuildTransactionResult,
  GrantKycExecuteTransactionResult,
  GrantKycNormalizedParams,
  GrantKycSignTransactionResult,
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

import { TokenGrantKycInputSchema } from './input';

export const TOKEN_GRANT_KYC_COMMAND_NAME = 'token_grant_kyc';

export class TokenGrantKycCommand extends BaseTransactionCommand<
  GrantKycNormalizedParams,
  GrantKycBuildTransactionResult,
  GrantKycSignTransactionResult,
  GrantKycExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_GRANT_KYC_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<GrantKycNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenGrantKycInputSchema.parse(args.args);

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
      `Granting KYC for account ${accountId} on token ${tokenId} on ${network}`,
    );

    const { keyRefIds } =
      await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
        mirrorRoleKey: tokenInfo.kyc_key,
        explicitCredentials: validArgs.kycKey,
        keyManager,
        resolveSigningKeyLabels: ['token:kyc'],
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
    normalisedParams: GrantKycNormalizedParams,
  ): Promise<GrantKycBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token grant KYC transaction');
    const transaction = api.token.createGrantKycTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: GrantKycNormalizedParams,
    buildTransactionResult: GrantKycBuildTransactionResult,
  ): Promise<GrantKycSignTransactionResult> {
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
    normalisedParams: GrantKycNormalizedParams,
    _buildTransactionResult: GrantKycBuildTransactionResult,
    signTransactionResult: GrantKycSignTransactionResult,
  ): Promise<GrantKycExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token grant KYC failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
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
    normalisedParams: GrantKycNormalizedParams,
    _buildTransactionResult: GrantKycBuildTransactionResult,
    _signTransactionResult: GrantKycSignTransactionResult,
    executeTransactionResult: GrantKycExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenGrantKycOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenGrantKyc(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenGrantKycCommand().execute(args);
}
