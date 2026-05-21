import type { AccountReference } from '@/core/schemas/common-schemas';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type {
  TokenAllowanceInfo,
  TokenInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { FtTokenMetadata, NftTokenMetadata } from '@/plugins/token/types';
import type {
  NftAllowanceGroup,
  TokenAllowanceFtFetchResult,
  TokenAllowanceNftFetchResult,
  TokenAllowanceQueryService,
} from './token-allowance-query.service.interface';

export class TokenAllowanceQueryServiceImpl implements TokenAllowanceQueryService {
  constructor(
    private readonly identityResolution: IdentityResolutionService,
    private readonly mirror: HederaMirrornodeService,
  ) {}

  async resolveAccountId(
    account: AccountReference,
    network: SupportedNetwork,
  ): Promise<string> {
    const resolved = await this.identityResolution.resolveAccount({
      accountReference: account.value,
      type: account.type,
      network,
    });
    return resolved.accountId;
  }

  async resolveOptionalSpender(
    spender: AccountReference | undefined,
    network: SupportedNetwork,
  ): Promise<string | undefined> {
    if (spender === undefined) return undefined;
    return this.resolveAccountId(spender, network);
  }

  async fetchFtAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAllowanceFtFetchResult> {
    if (!showAll) {
      const response = await this.mirror.getTokenAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }
    const response = await this.mirror.getAllTokenAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
  }

  async fetchNftAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAllowanceNftFetchResult> {
    if (!showAll) {
      const response = await this.mirror.getNftAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }
    const response = await this.mirror.getAllNftAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
  }

  async fetchFtTokenInfoMap(
    allowances: TokenAllowanceInfo[],
    raw: boolean,
  ): Promise<Map<string, FtTokenMetadata>> {
    if (raw) return new Map();
    const tokenIds = [
      ...new Set(allowances.map((allowance) => allowance.token_id)),
    ];
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await this.mirror.getTokenInfo(tokenId);
        return [tokenId, this.toFtTokenMetadata(info)] as const;
      }),
    );
    return new Map(entries);
  }

  async fetchNftTokenInfoMap(
    groups: NftAllowanceGroup[],
    raw: boolean,
  ): Promise<Map<string, NftTokenMetadata>> {
    if (raw) return new Map();
    const tokenIds = [...new Set(groups.map((group) => group.tokenId))];
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await this.mirror.getTokenInfo(tokenId);
        return [tokenId, this.toNftTokenMetadata(info)] as const;
      }),
    );
    return new Map(entries);
  }

  private toFtTokenMetadata(info: TokenInfo): FtTokenMetadata {
    return {
      name: info.name,
      symbol: info.symbol,
      decimals: Number.parseInt(info.decimals, 10) || 0,
    };
  }

  private toNftTokenMetadata(info: TokenInfo): NftTokenMetadata {
    return {
      name: info.name,
      symbol: info.symbol,
    };
  }
}
