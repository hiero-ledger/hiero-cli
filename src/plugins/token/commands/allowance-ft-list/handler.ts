import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountReference } from '@/core/schemas/common-schemas';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type {
  TokenAllowanceInfo,
  TokenInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { FtTokenMetadata } from '@/plugins/token/types';
import type { TokenAllowanceFtListOutput } from './output';

import BigNumber from 'bignumber.js';

import { normalizeBalance } from '@/core/utils/normalize-balance';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';

import { TokenAllowanceFtListInputSchema } from './input';

export const TOKEN_ALLOWANCE_FT_LIST_COMMAND_NAME = 'token_allowance-ft-list';

export class TokenAllowanceFtListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = TokenAllowanceFtListInputSchema.parse(args.args);
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
    const tokenId = this.resolveOptionalToken(validArgs.token, api, network);

    const response = await this.fetchAllowances(
      api.mirror,
      accountId,
      validArgs.showAll,
    );
    const filtered = response.allowances.filter((allowance) =>
      this.matchesFilters(allowance, tokenId, spenderAccountId),
    );
    const tokenInfoMap = await this.fetchTokenInfoMap(
      api.mirror,
      filtered,
      validArgs.raw,
    );

    const allowances = filtered.map((allowance) =>
      this.toOutputEntry(allowance, tokenInfoMap.get(allowance.token_id)),
    );

    const output: TokenAllowanceFtListOutput = {
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
    api: CoreApi,
    network: SupportedNetwork,
  ): string | undefined {
    if (token === undefined) return undefined;
    const resolved = resolveTokenParameter(token, api, network);
    if (!resolved) return undefined;
    return resolved.tokenId;
  }

  private async fetchAllowances(
    mirror: HederaMirrornodeService,
    accountId: string,
    showAll: boolean,
  ): Promise<{ allowances: TokenAllowanceInfo[]; hasMore: boolean }> {
    if (!showAll) {
      const response = await mirror.getTokenAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }

    const response = await mirror.getAllTokenAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
  }

  private matchesFilters(
    allowance: TokenAllowanceInfo,
    tokenId: string | undefined,
    spenderAccountId: string | undefined,
  ): boolean {
    const tokenMatches =
      tokenId === undefined || allowance.token_id === tokenId;
    const spenderMatches =
      spenderAccountId === undefined || allowance.spender === spenderAccountId;
    return tokenMatches && spenderMatches;
  }

  private async fetchTokenInfoMap(
    mirror: HederaMirrornodeService,
    allowances: TokenAllowanceInfo[],
    raw: boolean,
  ): Promise<Map<string, FtTokenMetadata>> {
    if (raw) return new Map();
    const tokenIds = [
      ...new Set(allowances.map((allowance) => allowance.token_id)),
    ];
    const entries = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const info = await mirror.getTokenInfo(tokenId);
        return [tokenId, this.toTokenMetadata(info)] as const;
      }),
    );
    return new Map(entries);
  }

  private toTokenMetadata(info: TokenInfo): FtTokenMetadata {
    return {
      name: info.name,
      symbol: info.symbol,
      decimals: Number.parseInt(info.decimals, 10) || 0,
    };
  }

  private toOutputEntry(
    allowance: TokenAllowanceInfo,
    metadata: FtTokenMetadata | undefined,
  ) {
    const amount = allowance.amount;
    return {
      tokenId: allowance.token_id,
      tokenName: metadata?.name,
      tokenSymbol: metadata?.symbol,
      decimals: metadata?.decimals,
      spenderAccountId: allowance.spender,
      amount,
      amountDisplay:
        metadata === undefined
          ? undefined
          : normalizeBalance(
              new BigNumber(amount.toString()),
              metadata.decimals,
            ),
    };
  }
}

export async function tokenAllowanceFtList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAllowanceFtListCommand().execute(args);
}
