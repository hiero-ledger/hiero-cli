import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TokenAirdropItem } from '@/core/services/mirrornode/types';
import type { ClaimAirdropItem } from '@/core/types/token.types';
import type { TokenClaimAirdropOutput } from './output';
import type {
  ClaimAirdropResolved,
  TokenClaimAirdropBuildTransactionResult,
  TokenClaimAirdropExecuteTransactionResult,
  TokenClaimAirdropNormalizedParams,
  TokenClaimAirdropSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import { KeySchema } from '@/core/schemas/common-schemas';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AirdropTokenType } from '@/core/types/token.types';

import { TokenClaimAirdropInputSchema } from './input';
import { MAX_CLAIM_AIRDROPS } from './types';

export const TOKEN_CLAIM_AIRDROP_COMMAND_NAME = 'token_claim-airdrop';

export class TokenClaimAirdropCommand extends BaseTransactionCommand<
  TokenClaimAirdropNormalizedParams,
  TokenClaimAirdropBuildTransactionResult,
  TokenClaimAirdropSignTransactionResult,
  TokenClaimAirdropExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CLAIM_AIRDROP_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenClaimAirdropNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenClaimAirdropInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const { accountId: receiverAccountId } =
      await api.identityResolution.resolveAccount({
        accountReference: validArgs.account.value,
        type: validArgs.account.type,
        network,
      });

    logger.info(`Fetching pending airdrops for ${receiverAccountId}...`);
    const response = await api.mirror.getPendingAirdrops(receiverAccountId);
    const allAirdrops = response.airdrops;

    this.validateIndices(validArgs.index, allAirdrops.length);

    const selectedAirdrops = validArgs.index.map((idx) => allAirdrops[idx - 1]);

    const uniqueTokenIds = [
      ...new Set(selectedAirdrops.map((a) => a.token_id)),
    ];
    const tokenInfoMap = await this.fetchTokenInfoMap(
      api.mirror,
      logger,
      uniqueTokenIds,
    );

    const claimItems: ClaimAirdropItem[] = selectedAirdrops.map((item) => ({
      tokenId: item.token_id,
      senderAccountId: item.sender_id,
      receiverAccountId,
      serialNumber: item.serial_number ?? undefined,
    }));

    const resolvedAirdrops: ClaimAirdropResolved[] = selectedAirdrops.map(
      (item) => this.buildResolvedAirdrop(item, tokenInfoMap),
    );

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const signerCredential =
      validArgs.from ?? KeySchema.parse(validArgs.account.value);
    const resolvedAccount = await api.keyResolver.resolveAccountCredentials(
      signerCredential,
      keyManager,
      false,
      ['token:account'],
    );

    if (!resolvedAccount?.accountId || !resolvedAccount?.keyRefId) {
      throw new ValidationError(`Failed to resolve signing account for claim`);
    }

    logger.info(
      `Claiming ${claimItems.length} airdrop(s) for ${receiverAccountId}`,
    );

    return {
      network,
      receiverAccountId,
      signerKeyRefId: resolvedAccount.keyRefId,
      keyRefIds: [resolvedAccount.keyRefId],
      claimItems,
      resolvedAirdrops,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalizedParams: TokenClaimAirdropNormalizedParams,
  ): Promise<TokenClaimAirdropBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building claim airdrop transaction body');

    const transaction = api.token.createClaimAirdropTransaction({
      items: normalizedParams.claimItems,
    });

    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalizedParams: TokenClaimAirdropNormalizedParams,
    buildResult: TokenClaimAirdropBuildTransactionResult,
  ): Promise<TokenClaimAirdropSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(`Using key ${normalizedParams.signerKeyRefId} for signing`);

    const signedTransaction = await api.txSign.sign(buildResult.transaction, [
      normalizedParams.signerKeyRefId,
    ]);

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalizedParams: TokenClaimAirdropNormalizedParams,
    _buildResult: TokenClaimAirdropBuildTransactionResult,
    signResult: TokenClaimAirdropSignTransactionResult,
  ): Promise<TokenClaimAirdropExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(signResult.signedTransaction);

    if (!result.success) {
      throw new TransactionError(
        `Claim airdrop failed (receiver: ${normalizedParams.receiverAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalizedParams: TokenClaimAirdropNormalizedParams,
    _buildResult: TokenClaimAirdropBuildTransactionResult,
    _signResult: TokenClaimAirdropSignTransactionResult,
    executeResult: TokenClaimAirdropExecuteTransactionResult,
  ): Promise<CommandResult> {
    const output: TokenClaimAirdropOutput = {
      transactionId: executeResult.transactionResult.transactionId,
      receiverAccountId: normalizedParams.receiverAccountId,
      claimed: normalizedParams.resolvedAirdrops,
      network: normalizedParams.network,
    };

    return { result: output };
  }

  private validateIndices(indices: number[], totalAirdrops: number): void {
    if (indices.length > MAX_CLAIM_AIRDROPS) {
      throw new ValidationError(
        `Too many airdrops to claim: ${indices.length}. Maximum allowed is ${MAX_CLAIM_AIRDROPS} per transaction.`,
      );
    }

    for (const idx of indices) {
      if (idx > totalAirdrops) {
        throw new ValidationError(
          `Index ${idx} is out of range. Found ${totalAirdrops} pending airdrop(s).`,
        );
      }
    }
  }

  private buildResolvedAirdrop(
    item: TokenAirdropItem,
    tokenInfoMap: Map<string, { name: string; symbol: string }>,
  ): ClaimAirdropResolved {
    const tokenInfo = tokenInfoMap.get(item.token_id);
    const tokenName = tokenInfo?.name ?? item.token_id;
    const tokenSymbol = tokenInfo?.symbol ?? '';

    if (item.serial_number !== null) {
      return {
        tokenId: item.token_id,
        tokenName,
        tokenSymbol,
        senderId: item.sender_id,
        type: AirdropTokenType.NFT,
        serialNumber: item.serial_number,
      };
    }

    return {
      tokenId: item.token_id,
      tokenName,
      tokenSymbol,
      senderId: item.sender_id,
      type: AirdropTokenType.FUNGIBLE,
      amount: item.amount ?? undefined,
    };
  }

  private async fetchTokenInfoMap(
    mirror: HederaMirrornodeService,
    logger: Logger,
    tokenIds: string[],
  ): Promise<Map<string, { name: string; symbol: string }>> {
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        logger.info(`Fetching token info for ${tokenId}...`);
        const info = await mirror.getTokenInfo(tokenId);
        return [tokenId, { name: info.name, symbol: info.symbol }] as const;
      }),
    );
    return new Map(entries);
  }
}

export async function tokenClaimAirdrop(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenClaimAirdropCommand().execute(args);
}
