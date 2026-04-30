import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenWipeNftOutput } from './output';
import type {
  WipeNftBuildTransactionResult,
  WipeNftExecuteTransactionResult,
  WipeNftNormalizedParams,
  WipeNftSignTransactionResult,
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
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import {
  isAccountDoesNotOwnWipedNftError,
  isCannotWipeTreasuryError,
  isNoWipeKeyError,
} from '@/plugins/token/utils/transaction-error-receipt-status';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenWipeNftInputSchema } from './input';

export const TOKEN_WIPE_NFT_COMMAND_NAME = 'token_wipe-nft';

export class TokenWipeNftCommand extends BaseTransactionCommand<
  WipeNftNormalizedParams,
  WipeNftBuildTransactionResult,
  WipeNftSignTransactionResult,
  WipeNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_WIPE_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<WipeNftNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = TokenWipeNftInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
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

    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: validArgs.account.value,
      type: validArgs.account.type,
      network,
    });

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.wipe_key,
      explicitCredentials: validArgs.wipeKey,
      keyManager,
      signingKeyLabels: ['token:wipe'],
      emptyMirrorRoleKeyMessage: 'Token has no wipe key',
      insufficientKmsMatchesMessage:
        'Not enough wipe key(s) found in key manager for this token. Provide --wipe-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    const serialNumbers = validArgs.serials;
    const currentTotalSupply = BigInt(tokenInfo.total_supply || '0');

    logger.info(
      `Wiping ${serialNumbers.length} NFT serial(s) from account ${accountId}. Current supply: ${currentTotalSupply.toString()}`,
    );

    return {
      network,
      tokenId,
      accountId,
      serialNumbers,
      currentTotalSupply,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: WipeNftNormalizedParams,
  ): Promise<WipeNftBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building NFT wipe transaction body');
    const transaction = api.token.createWipeNftTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      serialNumbers: normalisedParams.serialNumbers,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: WipeNftNormalizedParams,
    buildTransactionResult: WipeNftBuildTransactionResult,
  ): Promise<WipeNftSignTransactionResult> {
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
    normalisedParams: WipeNftNormalizedParams,
    _buildTransactionResult: WipeNftBuildTransactionResult,
    signTransactionResult: WipeNftSignTransactionResult,
  ): Promise<WipeNftExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `NFT wipe failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
          false,
        );
      }

      return { transactionResult: result };
    } catch (error) {
      if (isNoWipeKeyError(error)) {
        throw new ValidationError('Token has no wipe key', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      if (isCannotWipeTreasuryError(error)) {
        throw new ValidationError('Cannot wipe tokens from treasury account', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      if (isAccountDoesNotOwnWipedNftError(error)) {
        throw new ValidationError(
          'Account does not own one or more of the specified NFT serials',
          {
            context: {
              tokenId: normalisedParams.tokenId,
              accountId: normalisedParams.accountId,
            },
          },
        );
      }
      throw error;
    }
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: WipeNftNormalizedParams,
    _buildTransactionResult: WipeNftBuildTransactionResult,
    _signTransactionResult: WipeNftSignTransactionResult,
    executeTransactionResult: WipeNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenWipeNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      serialNumbers: normalisedParams.serialNumbers,
      newTotalSupply:
        normalisedParams.currentTotalSupply -
        BigInt(normalisedParams.serialNumbers.length),
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenWipeNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenWipeNftCommand().execute(args);
}
