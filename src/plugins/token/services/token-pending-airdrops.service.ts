import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TokenAirdropItem } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenPendingAirdropsService } from '@/plugins/token/services/token-pending-airdrops.service.interface';
import type {
  PendingAirdropEntry,
  TokenPendingAirdropsResult,
} from '@/plugins/token/services/token-pending-airdrops.types';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';

import { NotFoundError } from '@/core/errors';

const PAGE_LIMIT = 100;

export class TokenPendingAirdropsServiceImpl implements TokenPendingAirdropsService {
  constructor(
    private readonly mirror: HederaMirrornodeService,
    private readonly logger: Logger,
    private readonly tokenReference: TokenReferenceService,
  ) {}

  async getPendingAirdrops(
    account: string,
    showAll: boolean,
    network: SupportedNetwork,
  ): Promise<TokenPendingAirdropsResult> {
    const accountId = await this.resolveAccountId(account, network);

    this.logger.info(`Fetching pending airdrops for ${accountId}...`);
    const allAirdrops = await this.fetchAirdrops(accountId, showAll);
    const uniqueTokenIds = [
      ...new Set(allAirdrops.map((airdrop) => airdrop.token_id)),
    ];
    const tokenInfoMap = await this.fetchTokenInfoMap(uniqueTokenIds);
    const hasMore = !showAll && allAirdrops.length >= PAGE_LIMIT;
    const airdrops = allAirdrops.map((item) =>
      this.buildEntry(item, tokenInfoMap),
    );

    return {
      account: accountId,
      network,
      airdrops,
      hasMore,
      total: airdrops.length,
    };
  }

  private async resolveAccountId(
    accountOrAlias: string,
    network: SupportedNetwork,
  ): Promise<string> {
    const resolved = await this.tokenReference.resolveDestinationAccount(
      accountOrAlias,
      network,
    );
    if (!resolved) {
      throw new NotFoundError(
        `Account not found with ID or alias: ${accountOrAlias}`,
      );
    }
    return resolved.accountId;
  }

  private async fetchAirdrops(
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAirdropItem[]> {
    if (!showAll) {
      const response = await this.mirror.getPendingAirdrops(accountId);
      return response.airdrops;
    }

    const collected: TokenAirdropItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.mirror.getPendingAirdrops(accountId, {
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
    tokenIds: string[],
  ): Promise<Map<string, { name: string; symbol: string }>> {
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        this.logger.info(`Fetching token info for ${tokenId}...`);
        const info = await this.mirror.getTokenInfo(tokenId);
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
