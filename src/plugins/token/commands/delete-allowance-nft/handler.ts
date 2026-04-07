import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenDeleteAllowanceNftOutput } from './output';
import type {
  DeleteAllowanceNftBuildTransactionResult,
  DeleteAllowanceNftExecuteTransactionResult,
  DeleteAllowanceNftNormalizedParams,
  DeleteAllowanceNftSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TokenDeleteAllowanceNftInputSchema } from './input';

export const TOKEN_DELETE_ALLOWANCE_NFT_COMMAND_NAME =
  'token_delete-allowance-nft';

export class TokenDeleteAllowanceNftCommand extends BaseTransactionCommand<
  DeleteAllowanceNftNormalizedParams,
  DeleteAllowanceNftBuildTransactionResult,
  DeleteAllowanceNftSignTransactionResult,
  DeleteAllowanceNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_DELETE_ALLOWANCE_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteAllowanceNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenDeleteAllowanceNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
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

    const resolvedOwner = await api.keyResolver.resolveAccountCredentials(
      validArgs.owner,
      keyManager,
      true,
      ['token:owner'],
    );

    let spenderAccountId: string | null = null;
    if (validArgs.allSerials && validArgs.spender) {
      const resolvedSpender = resolveDestinationAccountParameter(
        validArgs.spender,
        api,
        network,
      );
      if (!resolvedSpender) {
        throw new NotFoundError(
          `Spender account not found: ${validArgs.spender}`,
          { context: { spender: validArgs.spender } },
        );
      }
      spenderAccountId = resolvedSpender.accountId;
    }

    logger.info(`🔑 Using owner account: ${resolvedOwner.accountId}`);
    logger.info(
      validArgs.allSerials
        ? `Revoking all-serials blanket approval of ${tokenId} for spender ${spenderAccountId}`
        : `Deleting allowance for serials [${validArgs.serials?.join(', ')}] of ${tokenId}`,
    );

    return {
      network,
      tokenId,
      ownerAccountId: resolvedOwner.accountId,
      spenderAccountId,
      serials: validArgs.serials ?? null,
      allSerials: validArgs.allSerials,
      signerKeyRefId: resolvedOwner.keyRefId,
      keyRefIds: [resolvedOwner.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteAllowanceNftNormalizedParams,
  ): Promise<DeleteAllowanceNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createNftAllowanceDeleteTransaction(
      normalisedParams.allSerials
        ? {
            tokenId: normalisedParams.tokenId,
            ownerAccountId: normalisedParams.ownerAccountId,
            spenderAccountId: normalisedParams.spenderAccountId!,
            allSerials: true,
          }
        : {
            tokenId: normalisedParams.tokenId,
            ownerAccountId: normalisedParams.ownerAccountId,
            serialNumbers: normalisedParams.serials!,
          },
    );
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteAllowanceNftNormalizedParams,
    buildTransactionResult: DeleteAllowanceNftBuildTransactionResult,
  ): Promise<DeleteAllowanceNftSignTransactionResult> {
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
    normalisedParams: DeleteAllowanceNftNormalizedParams,
    _buildTransactionResult: DeleteAllowanceNftBuildTransactionResult,
    signTransactionResult: DeleteAllowanceNftSignTransactionResult,
  ): Promise<DeleteAllowanceNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!transactionResult.success) {
      const spenderMsg = normalisedParams.spenderAccountId
        ? `, spender: ${normalisedParams.spenderAccountId}`
        : '';
      throw new TransactionError(
        `NFT allowance deletion failed (tokenId: ${normalisedParams.tokenId}, owner: ${normalisedParams.ownerAccountId}${spenderMsg}, txId: ${transactionResult.transactionId})`,
        false,
      );
    }
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: DeleteAllowanceNftNormalizedParams,
    _buildTransactionResult: DeleteAllowanceNftBuildTransactionResult,
    _signTransactionResult: DeleteAllowanceNftSignTransactionResult,
    executeTransactionResult: DeleteAllowanceNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenDeleteAllowanceNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      ownerAccountId: normalisedParams.ownerAccountId,
      spenderAccountId: normalisedParams.spenderAccountId,
      serials: normalisedParams.allSerials ? null : normalisedParams.serials,
      allSerials: normalisedParams.allSerials,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenDeleteAllowanceNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenDeleteAllowanceNftCommand().execute(args);
}
