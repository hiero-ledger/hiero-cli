import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TokenAirdropItem } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenPendingAirdropsOutput } from './output';
import type {
  PendingAirdropEntry,
  PendingAirdropsNormalizedParams,
} from './types';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { AliasType } from '@/core/types/shared.types';

import { TokenPendingAirdropsInputSchema } from './input';

const PAGE_LIMIT = 100;

export class TokenPendingAirdropsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const validArgs: PendingAirdropsNormalizedParams =
      TokenPendingAirdropsInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const accountId = this.resolveAccountId(validArgs.account, api, network);

    logger.info(`Fetching pending airdrops for ${accountId}...`);
    const allAirdrops = await this.fetchAirdrops(
      api,
      accountId,
      validArgs.showAll,
    );

    const uniqueTokenIds = [...new Set(allAirdrops.map((a) => a.token_id))];
    const tokenInfoMap = await this.fetchTokenInfoMap(
      api,
      logger,
      uniqueTokenIds,
    );

    const hasMore = !validArgs.showAll && allAirdrops.length >= PAGE_LIMIT;

    const airdrops: PendingAirdropEntry[] = allAirdrops.map((item) =>
      this.buildEntry(item, tokenInfoMap),
    );

    const output: TokenPendingAirdropsOutput = {
      account: accountId,
      network,
      airdrops,
      hasMore,
      total: airdrops.length,
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

  private async fetchAirdrops(
    api: CoreApi,
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAirdropItem[]> {
    if (!showAll) {
      const response = await api.mirror.getPendingAirdrops(accountId);
      return response.airdrops;
    }

    const collected: TokenAirdropItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await api.mirror.getPendingAirdrops(accountId, {
        limit: PAGE_LIMIT,
        cursor,
      });
      collected.push(...response.airdrops);
      cursor = this.extractCursor(response.links.next);
    } while (cursor !== undefined);

    return collected;
  }

  private extractCursor(next: string | null): string | undefined {
    if (!next) return undefined;
    const url = new URL(next, 'http://localhost');
    return url.searchParams.get('cursor') ?? undefined;
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

  private buildEntry(
    item: TokenAirdropItem,
    tokenInfoMap: Map<string, { name: string; symbol: string }>,
  ): PendingAirdropEntry {
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

export async function tokenPendingAirdrops(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenPendingAirdropsCommand().execute(args);
}
