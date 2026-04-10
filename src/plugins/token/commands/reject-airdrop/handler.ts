import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TokenAirdropItem } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenRejectAirdropOutput } from './output';
import type {
  RejectAirdropResolved,
  TokenRejectAirdropBuildTransactionResult,
  TokenRejectAirdropExecuteTransactionResult,
  TokenRejectAirdropNormalizedParams,
  TokenRejectAirdropSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';

import { TokenRejectAirdropInputSchema } from './input';
import { MAX_REJECT_AIRDROPS } from './types';

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
    const validArgs = TokenRejectAirdropInputSchema.parse(args.args);
    const {
      account,
      index: indices,
      from,
      keyManager: keyManagerArg,
    } = validArgs;
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();
    const ownerAccountId = this.resolveAccountId(account, api, network);

    logger.info(`Fetching pending airdrops for ${ownerAccountId}...`);
    const { airdrops } = await api.mirror.getPendingAirdrops(ownerAccountId);

    this.validateIndices(indices, airdrops.length);

    const selectedAirdrops = indices.map((i) => airdrops[i - 1]);

    const uniqueTokenIds = [
      ...new Set(selectedAirdrops.map((a) => a.token_id)),
    ];
    const tokenInfoMap = await this.fetchTokenInfoMap(
      api,
      logger,
      uniqueTokenIds,
    );

    const rejectItems = selectedAirdrops.map((airdrop) => ({
      tokenId: airdrop.token_id,
      serialNumber:
        airdrop.serial_number !== null ? airdrop.serial_number : undefined,
    }));

    const resolvedAirdrops = selectedAirdrops.map((airdrop) =>
      this.buildResolved(airdrop, tokenInfoMap),
    );

    const resolvedAccount = await api.keyResolver.resolveAccountCredentials(
      from,
      keyManager,
      true,
      ['token:account'],
    );

    if (!resolvedAccount?.accountId || !resolvedAccount?.keyRefId) {
      const fromDisplay = from?.rawValue ?? 'unknown';
      throw new ValidationError(
        `Failed to resolve signing account: ${fromDisplay}`,
      );
    }

    const { accountId: resolvedOwnerAccountId, keyRefId: signerKeyRefId } =
      resolvedAccount;

    logger.info(
      `Rejecting ${rejectItems.length} airdrop(s) for ${resolvedOwnerAccountId}`,
    );

    return {
      network,
      ownerAccountId: resolvedOwnerAccountId,
      signerKeyRefId,
      rejectItems,
      resolvedAirdrops,
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
        `Reject airdrop transaction failed (owner: ${normalisedParams.ownerAccountId}, txId: ${result.transactionId})`,
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
      rejected: normalisedParams.resolvedAirdrops,
      network: normalisedParams.network,
    };

    return { result: output };
  }

  private resolveAccountId(
    accountOrAlias: string,
    api: CoreApi,
    network: SupportedNetwork,
  ): string {
    const resolved = api.alias.resolve(
      accountOrAlias,
      AliasType.Account,
      network,
    );
    if (resolved && resolved.entityId) {
      return resolved.entityId;
    }

    const parsed = EntityIdSchema.safeParse(accountOrAlias);
    if (!parsed.success) {
      throw new NotFoundError(
        `Account not found with ID or alias: ${accountOrAlias}`,
      );
    }

    return parsed.data;
  }

  private validateIndices(indices: number[], total: number): void {
    const duplicates = indices.filter(
      (index, i) => indices.indexOf(index) !== i,
    );
    if (duplicates.length > 0) {
      throw new ValidationError(
        `Duplicate index(es) found: ${[...new Set(duplicates)].join(', ')}.`,
      );
    }

    if (indices.length > MAX_REJECT_AIRDROPS) {
      throw new ValidationError(
        `Too many airdrops selected: ${indices.length}. Maximum allowed is ${MAX_REJECT_AIRDROPS} per transaction.`,
      );
    }

    for (const index of indices) {
      if (index > total) {
        throw new ValidationError(
          `Index ${index} is out of range. There are only ${total} pending airdrop(s).`,
        );
      }
    }
  }

  private async fetchTokenInfoMap(
    api: CoreApi,
    logger: Logger,
    tokenIds: string[],
  ): Promise<Map<string, { name: string; symbol: string }>> {
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        logger.info(`Fetching token info for ${tokenId}...`);
        const info = await api.mirror.getTokenInfo(tokenId);
        return [tokenId, { name: info.name, symbol: info.symbol }] as const;
      }),
    );
    return new Map(entries);
  }

  private buildResolved(
    item: TokenAirdropItem,
    tokenInfoMap: Map<string, { name: string; symbol: string }>,
  ): RejectAirdropResolved {
    const tokenInfo = tokenInfoMap.get(item.token_id);
    const tokenName = tokenInfo?.name ?? item.token_id;
    const tokenSymbol = tokenInfo?.symbol ?? '';

    if (item.serial_number !== null) {
      return {
        tokenId: item.token_id,
        tokenName,
        tokenSymbol,
        senderId: item.sender_id,
        type: 'NFT',
        serialNumber: item.serial_number,
      };
    }

    return {
      tokenId: item.token_id,
      tokenName,
      tokenSymbol,
      senderId: item.sender_id,
      type: 'FUNGIBLE',
      amount: item.amount ?? undefined,
    };
  }
}

export async function tokenRejectAirdrop(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenRejectAirdropCommand().execute(args);
}
