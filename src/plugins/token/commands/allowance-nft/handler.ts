import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenAllowanceNftOutput } from './output';
import type {
  AllowanceNftBuildTransactionResult,
  AllowanceNftExecuteTransactionResult,
  AllowanceNftNormalizedParams,
  AllowanceNftSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { NftAllowanceEntry } from '@/core/services/allowance';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TokenAllowanceNftInputSchema } from './input';

export const TOKEN_ALLOWANCE_NFT_COMMAND_NAME = 'token_allowance-nft';

export class TokenAllowanceNftCommand extends BaseTransactionCommand<
  AllowanceNftNormalizedParams,
  AllowanceNftBuildTransactionResult,
  AllowanceNftSignTransactionResult,
  AllowanceNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_ALLOWANCE_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AllowanceNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenAllowanceNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');
    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
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

    const resolvedOwner = await api.keyResolver.resolveAccountCredentials(
      validArgs.owner,
      keyManager,
      true,
      ['token:owner'],
    );

    const resolvedSpender = resolveDestinationAccountParameter(
      validArgs.spender,
      api,
      network,
    );
    if (!resolvedSpender) {
      throw new NotFoundError(
        `Spender account not found: ${validArgs.spender}`,
        {
          context: { spender: validArgs.spender },
        },
      );
    }

    logger.info(`🔑 Using owner account: ${resolvedOwner.accountId}`);
    logger.info(`🔑 Approving spender: ${resolvedSpender.accountId}`);
    logger.info(
      validArgs.allSerials
        ? `Approving all serials of ${tokenId} for ${resolvedSpender.accountId}`
        : `Approving serials [${validArgs.serials?.join(', ')}] of ${tokenId} for ${resolvedSpender.accountId}`,
    );

    return {
      network,
      tokenId,
      ownerAccountId: resolvedOwner.accountId,
      spenderAccountId: resolvedSpender.accountId,
      serials: validArgs.serials ?? null,
      allSerials: validArgs.allSerials ?? false,
      signerKeyRefId: resolvedOwner.keyRefId,
      keyRefIds: [resolvedOwner.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AllowanceNftNormalizedParams,
  ): Promise<AllowanceNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.allowance.buildAllowanceApprove([
      new NftAllowanceEntry(
        normalisedParams.ownerAccountId,
        normalisedParams.spenderAccountId,
        normalisedParams.tokenId,
        normalisedParams.allSerials
          ? undefined
          : (normalisedParams.serials ?? undefined),
        normalisedParams.allSerials ? true : undefined,
      ),
    ]);
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AllowanceNftNormalizedParams,
    buildTransactionResult: AllowanceNftBuildTransactionResult,
  ): Promise<AllowanceNftSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.signerKeyRefId} for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AllowanceNftNormalizedParams,
    _buildTransactionResult: AllowanceNftBuildTransactionResult,
    signTransactionResult: AllowanceNftSignTransactionResult,
  ): Promise<AllowanceNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!transactionResult.success) {
      throw new TransactionError(
        `NFT allowance failed (tokenId: ${normalisedParams.tokenId}, owner: ${normalisedParams.ownerAccountId}, spender: ${normalisedParams.spenderAccountId}, txId: ${transactionResult.transactionId})`,
        false,
      );
    }
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: AllowanceNftNormalizedParams,
    _buildTransactionResult: AllowanceNftBuildTransactionResult,
    _signTransactionResult: AllowanceNftSignTransactionResult,
    executeTransactionResult: AllowanceNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenAllowanceNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      ownerAccountId: normalisedParams.ownerAccountId,
      spenderAccountId: normalisedParams.spenderAccountId,
      serials: normalisedParams.allSerials
        ? null
        : (normalisedParams.serials ?? null),
      allSerials: normalisedParams.allSerials,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenAllowanceNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAllowanceNftCommand().execute(args);
}
