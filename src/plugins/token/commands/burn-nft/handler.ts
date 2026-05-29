import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  BurnNftBuildTransactionResult,
  BurnNftExecuteTransactionResult,
  BurnNftNormalizedParams,
  BurnNftSignTransactionResult,
} from '@/plugins/token/commands/burn-nft/types';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
import type { TokenBurnNftOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { TokenBurnNftInputSchema } from './input';

export const TOKEN_BURN_NFT_COMMAND_NAME = 'token_burn-nft';

export class TokenBurnNftCommand extends BaseTransactionCommand<
  BurnNftNormalizedParams,
  BurnNftBuildTransactionResult,
  BurnNftSignTransactionResult,
  BurnNftExecuteTransactionResult
> {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly tokenStateService: TokenStateService,
  ) {
    super(TOKEN_BURN_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<BurnNftNormalizedParams> {
    const { api } = args;

    const validArgs = TokenBurnNftInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const keyManagerArg = validArgs.keyManager;

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = this.tokenReferenceService.resolveToken(
      tokenIdOrAlias,
      network,
    );

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
        context: { tokenIdOrAlias },
      });
    }

    const tokenId = resolvedToken.tokenId;

    api.logger.info(`Burning NFT serials for token: ${tokenId}`);

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = this.tokenStateService.getToken(tokenId);

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

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.supply_key,
      explicitCredentials: validArgs.supplyKey,
      keyManager,
      signingKeyLabels: ['token:supply'],
      emptyMirrorRoleKeyMessage: 'Token has no supply key',
      insufficientKmsMatchesMessage:
        'Not enough supply key(s) found in key manager for this token. Provide --supply-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    const serialNumbers = validArgs.serials;
    const currentTotalSupply = BigInt(tokenInfo.total_supply || '0');

    api.logger.info(
      `Burning ${serialNumbers.length} NFT serial(s). Current supply: ${currentTotalSupply.toString()}, after burn: ${(currentTotalSupply - BigInt(serialNumbers.length)).toString()}`,
    );

    return {
      network,
      tokenId,
      serialNumbers,
      currentTotalSupply,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
  ): Promise<BurnNftBuildTransactionResult> {
    const { api } = args;
    api.logger.debug('Building NFT burn transaction body');
    const transaction = api.token.createBurnNftTransaction({
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
    buildTransactionResult: BurnNftBuildTransactionResult,
  ): Promise<BurnNftSignTransactionResult> {
    const { api } = args;
    api.logger.debug(
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
    normalisedParams: BurnNftNormalizedParams,
    _buildTransactionResult: BurnNftBuildTransactionResult,
    signTransactionResult: BurnNftSignTransactionResult,
  ): Promise<BurnNftExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `NFT burn failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: BurnNftNormalizedParams,
    _buildTransactionResult: BurnNftBuildTransactionResult,
    _signTransactionResult: BurnNftSignTransactionResult,
    executeTransactionResult: BurnNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const newTotalSupply =
      normalisedParams.currentTotalSupply -
      BigInt(normalisedParams.serialNumbers.length);

    const outputData: TokenBurnNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      serialNumbers: normalisedParams.serialNumbers,
      newTotalSupply,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenBurnNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenBurnNftCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
    new TokenStateServiceImpl(api.state, api.logger, api.receipt, api.alias),
  ).execute(args);
}
