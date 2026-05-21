import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { NftAllowanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  NftAllowanceGroup,
  TokenAllowanceQueryService,
} from '@/plugins/token/services/token-allowance-query.service.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { NftTokenMetadata } from '@/plugins/token/types';
import type { TokenAllowanceNftListOutput } from './output';

import { TokenAllowanceQueryServiceImpl } from '@/plugins/token/services/token-allowance-query.service';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

import { TokenAllowanceNftListInputSchema } from './input';

export const TOKEN_ALLOWANCE_NFT_LIST_COMMAND_NAME = 'token_allowance-nft-list';

export class TokenAllowanceNftListCommand implements Command {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly allowanceQuery: TokenAllowanceQueryService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = TokenAllowanceNftListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const accountId = await this.allowanceQuery.resolveAccountId(
      validArgs.account,
      network,
    );
    const spenderAccountId = await this.allowanceQuery.resolveOptionalSpender(
      validArgs.spender,
      network,
    );
    const tokenId = this.resolveOptionalToken(validArgs.token, network);

    const response = await this.allowanceQuery.fetchNftAllowances(
      accountId,
      validArgs.showAll,
    );
    const filtered = response.allowances.filter((allowance) =>
      this.matchesFilters(allowance, tokenId, spenderAccountId),
    );
    const groups = this.groupAllowances(filtered);
    const tokenInfoMap = await this.allowanceQuery.fetchNftTokenInfoMap(
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

  private resolveOptionalToken(
    token: string | undefined,
    network: SupportedNetwork,
  ): string | undefined {
    if (token === undefined) return undefined;
    const resolved = this.tokenReferenceService.resolveToken(token, network);
    if (!resolved) return undefined;
    return resolved.tokenId;
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
  const tokenRef = new TokenReferenceServiceImpl(api.identityResolution);
  const allowanceQuery = new TokenAllowanceQueryServiceImpl(
    api.identityResolution,
    api.mirror,
  );
  return new TokenAllowanceNftListCommand(tokenRef, allowanceQuery).execute(
    args,
  );
}
