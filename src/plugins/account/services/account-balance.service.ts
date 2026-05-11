import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TokenBalanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  AccountBalanceService,
  NftBalancesResult,
  TokenBalanceWithMetadata,
} from '@/plugins/account/services/account-balance.service.interface';

import BigNumber from 'bignumber.js';

import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { NFT_BALANCE_PAGE_SIZE } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { normalizeBalance } from '@/core/utils/normalize-balance';

export class AccountBalanceServiceImpl implements AccountBalanceService {
  constructor(
    private readonly mirror: HederaMirrornodeService,
    private readonly alias: AliasService,
  ) {}

  async fetchTokenBalances(
    accountId: string,
    tokenId: string | undefined,
    raw: boolean,
    network: SupportedNetwork,
  ): Promise<TokenBalanceWithMetadata[] | undefined> {
    const tokenBalances = await this.mirror.getAccountTokenBalances(
      accountId,
      tokenId,
    );

    if (!tokenBalances.tokens?.length) {
      return undefined;
    }

    const results = await Promise.all(
      tokenBalances.tokens.map((token) =>
        this.buildTokenBalance(token, raw, network),
      ),
    );

    const filtered = results.filter(
      (token): token is TokenBalanceWithMetadata => token !== null,
    );
    return filtered.length > 0 ? filtered : undefined;
  }

  async fetchNftBalances(
    accountId: string,
    tokenId: string | undefined,
    network: SupportedNetwork,
  ): Promise<NftBalancesResult | undefined> {
    const response = await this.mirror.getAccountNfts(
      accountId,
      NFT_BALANCE_PAGE_SIZE,
    );

    const nfts = tokenId
      ? response.nfts.filter((nft) => nft.token_id === tokenId)
      : response.nfts;

    if (nfts.length === 0) {
      return undefined;
    }

    const serialsByToken = new Map<string, number[]>();
    for (const nft of nfts) {
      const serials = serialsByToken.get(nft.token_id) ?? [];
      serialsByToken.set(nft.token_id, [...serials, nft.serial_number]);
    }

    const uniqueTokenIds = Array.from(serialsByToken.keys());
    const tokenInfoResults = await Promise.all(
      uniqueTokenIds.map((id) => this.getNftCollectionMetadata(id, network)),
    );

    const collections = tokenInfoResults.map((info) => {
      const serialNumbers = serialsByToken.get(info.tokenId) ?? [];
      return {
        tokenId: info.tokenId,
        name: info.name,
        symbol: info.symbol,
        alias: info.alias,
        serialNumbers,
        count: serialNumbers.length,
      };
    });

    return {
      collections,
      totalCount: nfts.length,
      truncated: Boolean(response.links?.next),
    };
  }

  private async buildTokenBalance(
    token: TokenBalanceInfo,
    raw: boolean,
    network: SupportedNetwork,
  ): Promise<TokenBalanceWithMetadata | null> {
    const balanceRaw = BigInt(token.balance.toString());
    const alias = this.alias.resolve(
      token.token_id,
      AliasType.Token,
      network,
    )?.alias;

    const info = await this.mirror
      .getTokenInfo(token.token_id)
      .catch(() => null);

    if (info?.type === MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE) {
      return null;
    }

    const decimals = info ? parseInt(info.decimals, 10) : token.decimals;
    let balanceDisplay: string | undefined;
    if (!raw && decimals !== undefined) {
      balanceDisplay = normalizeBalance(
        new BigNumber(balanceRaw.toString()),
        decimals,
      );
    }

    return {
      tokenId: token.token_id,
      name: info?.name,
      symbol: info?.symbol,
      alias,
      balance: balanceRaw,
      balanceDisplay,
      decimals,
    };
  }

  private async getNftCollectionMetadata(
    tokenId: string,
    network: SupportedNetwork,
  ): Promise<{
    tokenId: string;
    name?: string;
    symbol?: string;
    alias?: string;
  }> {
    const alias = this.alias.resolve(tokenId, AliasType.Token, network)?.alias;

    try {
      const info = await this.mirror.getTokenInfo(tokenId);
      return { tokenId, name: info.name, symbol: info.symbol, alias };
    } catch {
      return { tokenId, alias };
    }
  }
}
