import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type {
  TokenAllowanceInfo,
  TokenInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenAllowanceQueryService } from '@/plugins/token/services/token-allowance-query.service.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { FtTokenMetadata } from '@/plugins/token/types';
import type { TokenAllowanceFtListOutput } from './output';

import BigNumber from 'bignumber.js';

import { normalizeBalance } from '@/core/utils/normalize-balance';
import { TokenAllowanceQueryServiceImpl } from '@/plugins/token/services/token-allowance-query.service';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

import { TokenAllowanceFtListInputSchema } from './input';

export const TOKEN_ALLOWANCE_FT_LIST_COMMAND_NAME = 'token_allowance-ft-list';

export class TokenAllowanceFtListCommand implements Command {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly allowanceQuery: TokenAllowanceQueryService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = TokenAllowanceFtListInputSchema.parse(args.args);
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

    const response = await this.allowanceQuery.fetchFtAllowances(
      accountId,
      validArgs.showAll,
    );
    const filtered = response.allowances.filter((allowance) =>
      this.matchesFilters(allowance, tokenId, spenderAccountId),
    );
    const tokenInfoMap = await this.allowanceQuery.fetchFtTokenInfoMap(
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
  const { api } = args;
  const tokenRef = new TokenReferenceServiceImpl(api.identityResolution);
  const allowanceQuery = new TokenAllowanceQueryServiceImpl(
    api.identityResolution,
    api.mirror,
  );
  return new TokenAllowanceFtListCommand(tokenRef, allowanceQuery).execute(
    args,
  );
}

export type { TokenInfo };
