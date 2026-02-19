import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ListTokensOutput } from './output';

import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { ListTokenInputSchema } from './input';

export async function listTokens(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = ListTokenInputSchema.parse(args.args);

  const showKeys = validArgs.keys;

  logger.info('Listing tokens...');

  const tokens = tokenState.listTokens();
  logger.debug(`[TOKEN LIST] Retrieved ${tokens.length} tokens from state`);

  tokens.forEach((token, index) => {
    logger.debug(
      `[TOKEN LIST]   ${index + 1}. ${token.name} (${token.symbol}) - ${token.tokenId} on ${token.network}`,
    );
  });

  const tokensList = tokens.map((token) => {
    const alias = api.alias.resolve(
      token.tokenId,
      'token',
      token.network,
    )?.alias;

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
      ...(showKeys &&
        token.adminPublicKey && {
          keys: {
            adminKey: token.adminPublicKey,
            supplyKey: null,
            wipeKey: null,
            kycKey: null,
            freezeKey: null,
            pauseKey: null,
            feeScheduleKey: null,
            treasuryKey: null,
          },
        }),
    };
  });

  const stats = tokenState.getTokensWithStats();

  const outputData: ListTokensOutput = {
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
