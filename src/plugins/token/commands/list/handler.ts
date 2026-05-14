import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
import type { TokenListOutput } from './output';
import type { ListTokensNormalizedParams } from './types';

import { AliasType } from '@/core/types/shared.types';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { TokenListInputSchema } from './input';

export class TokenListCommand implements Command {
  constructor(private readonly tokenStateService: TokenStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs: ListTokensNormalizedParams = TokenListInputSchema.parse(
      args.args,
    );

    api.logger.info('Listing tokens...');

    const tokens = this.tokenStateService.listTokens();
    api.logger.debug(
      `[TOKEN LIST] Retrieved ${tokens.length} tokens from state`,
    );
    tokens.forEach((token, index) => {
      api.logger.debug(
        `[TOKEN LIST]   ${index + 1}. ${token.name} (${token.symbol}) - ${token.tokenId} on ${token.network}`,
      );
    });

    const tokensList = tokens.map((token) => {
      const alias = api.alias
        .list({ network: token.network, type: AliasType.Token })
        .find((rec) => rec.entityId === token.tokenId)?.alias;

      return {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        supplyType: token.supplyType,
        tokenType: token.tokenType,
        treasuryId: token.treasuryId,
        network: token.network,
        alias,
        maxSupply: Number(token.maxSupply),
        associationCount: token.associations?.length || 0,
        ...(validArgs.keys &&
          token.adminKeyRefIds.length > 0 && {
            keys: {
              adminKey:
                token.adminKeyRefIds.length > 0
                  ? token.adminKeyRefIds.join(', ')
                  : null,
              supplyKey:
                token.supplyKeyRefIds.length > 0
                  ? token.supplyKeyRefIds.join(', ')
                  : null,
              wipeKey:
                token.wipeKeyRefIds.length > 0
                  ? token.wipeKeyRefIds.join(', ')
                  : null,
              kycKey:
                token.kycKeyRefIds.length > 0
                  ? token.kycKeyRefIds.join(', ')
                  : null,
              freezeKey:
                token.freezeKeyRefIds.length > 0
                  ? token.freezeKeyRefIds.join(', ')
                  : null,
              pauseKey:
                token.pauseKeyRefIds.length > 0
                  ? token.pauseKeyRefIds.join(', ')
                  : null,
              feeScheduleKey:
                token.feeScheduleKeyRefIds.length > 0
                  ? token.feeScheduleKeyRefIds.join(', ')
                  : null,
              treasuryKey: null,
            },
          }),
      };
    });

    const stats = this.tokenStateService.getTokensWithStats();
    const outputData: TokenListOutput = {
      tokens: tokensList,
      totalCount: tokens.length,
      stats: {
        total: stats.total,
        withKeys: stats.withKeys,
        byNetwork: stats.byNetwork,
        bySupplyType: stats.bySupplyType,
        withAssociations: stats.withAssociations,
        totalAssociations: stats.totalAssociations,
      },
    };

    return { result: outputData };
  }
}

export async function tokenList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenListCommand(
    new TokenStateServiceImpl(api.state, api.logger),
  ).execute(args);
}
