import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountReference } from '@/core/schemas/common-schemas';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type {
  NftAllowanceInfo,
  TokenInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { NftTokenMetadata } from '@/plugins/token/types';
import type { TokenAllowanceNftListOutput } from './output';

import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

import { TokenAllowanceNftListInputSchema } from './input';

export const TOKEN_ALLOWANCE_NFT_LIST_COMMAND_NAME = 'token_allowance-nft-list';

interface NftAllowanceGroup {
  tokenId: string;
  spenderAccountId: string;
  approvedForAll: boolean;
  serialNumbers: Set<number>;
}

type TokenAllowanceNftFetchResult = {
  allowances: NftAllowanceInfo[];
  hasMore: boolean;
};

export class TokenAllowanceNftListCommand implements Command {
  constructor(private readonly tokenReferenceService: TokenReferenceService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = TokenAllowanceNftListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const accountId = await this.resolveAccountId(
      api.identityResolution,
      network,
      validArgs.account,
    );
    const spenderAccountId = await this.resolveOptionalSpender(
      api.identityResolution,
      network,
      validArgs.spender,
    );
    const tokenId = this.resolveOptionalToken(validArgs.token, network);

    const response = await this.fetchAllowances(
      api.mirror,
      accountId,
      validArgs.showAll,
    );
    const filtered = response.allowances.filter((allowance) =>
      this.matchesFilters(allowance, tokenId, spenderAccountId),
    );
    const groups = this.groupAllowances(filtered);
    const tokenInfoMap = await this.fetchTokenInfoMap(
      api.mirror,
      groups,
      validArgs.raw,
    );
    const allowances = groups.map((group) =>
      this.toOutputEntry(group, tokenInfoMap.get(group.tokenId)),
    );

    const output: TokenAllowanceNftListOutput = {
      accountId,
      network,
      raw: validArgs.raw,
      allowances,
      total: allowances.length,
      hasMore: !validArgs.showAll && response.hasMore,
    };

    return { result: output };
  }

  private async resolveAccountId(
    identityResolution: IdentityResolutionService,
    network: SupportedNetwork,
    account: AccountReference,
  ): Promise<string> {
    const resolved = await identityResolution.resolveAccount({
      accountReference: account.value,
      type: account.type,
      network,
    });
    return resolved.accountId;
  }

  private async resolveOptionalSpender(
    identityResolution: IdentityResolutionService,
    network: SupportedNetwork,
    spender: AccountReference | undefined,
  ): Promise<string | undefined> {
    if (spender === undefined) return undefined;
    return this.resolveAccountId(identityResolution, network, spender);
  }

  private resolveOptionalToken(
    token: string | undefined,
    network: SupportedNetwork,
  ): string | undefined {
    if (token === undefined) return undefined;
    const resolved = this.tokenReferenceService.resolveToken(token, network);
    if (!resolved) return undefined;
    return resolved.tokenId;
  }

  private async fetchAllowances(
    mirror: HederaMirrornodeService,
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAllowanceNftFetchResult> {
    if (!showAll) {
      const response = await mirror.getNftAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }

    const response = await mirror.getAllNftAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
  }

  private matchesFilters(
    allowance: NftAllowanceInfo,
    tokenId: string | undefined,
    spenderAccountId: string | undefined,
  ): boolean {
    const tokenMatches =
      tokenId === undefined || allowance.token_id === tokenId;
    const spenderMatches =
      spenderAccountId === undefined || allowance.spender === spenderAccountId;
    return tokenMatches && spenderMatches;
  }

  private groupAllowances(allowances: NftAllowanceInfo[]): NftAllowanceGroup[] {
    const groups = new Map<string, NftAllowanceGroup>();
    for (const allowance of allowances) {
      const key = `${allowance.token_id}:${allowance.spender}`;
      const existing = groups.get(key);
      const group =
        existing ?? this.createGroup(allowance.token_id, allowance.spender);

      if (allowance.approved_for_all === true) {
        group.approvedForAll = true;
      }
      if (
        allowance.serial_number !== undefined &&
        allowance.serial_number !== null
      ) {
        group.serialNumbers.add(allowance.serial_number);
      }
      groups.set(key, group);
    }

    return [...groups.values()];
  }

  private createGroup(
    tokenId: string,
    spenderAccountId: string,
  ): NftAllowanceGroup {
    return {
      tokenId,
      spenderAccountId,
      approvedForAll: false,
      serialNumbers: new Set<number>(),
    };
  }

  private async fetchTokenInfoMap(
    mirror: HederaMirrornodeService,
    groups: NftAllowanceGroup[],
    raw: boolean,
  ): Promise<Map<string, NftTokenMetadata>> {
    if (raw) return new Map();
    const tokenIds = [...new Set(groups.map((group) => group.tokenId))];
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await mirror.getTokenInfo(tokenId);
        return [tokenId, this.toTokenMetadata(info)] as const;
      }),
    );
    return new Map(entries);
  }

  private toTokenMetadata(info: TokenInfo): NftTokenMetadata {
    return {
      name: info.name,
      symbol: info.symbol,
    };
  }

  private toOutputEntry(
    group: NftAllowanceGroup,
    metadata: NftTokenMetadata | undefined,
  ) {
    return {
      tokenId: group.tokenId,
      tokenName: metadata?.name,
      tokenSymbol: metadata?.symbol,
      spenderAccountId: group.spenderAccountId,
      approvedForAll: group.approvedForAll,
      serialNumbers: [...group.serialNumbers].sort((a, b) => a - b),
    };
  }
}

export async function tokenAllowanceNftList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenAllowanceNftListCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
  ).execute(args);
}
