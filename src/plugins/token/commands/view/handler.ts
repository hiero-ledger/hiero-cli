/**
 * View Token Command Handler
 * Supports two modes:
 * 1. Default View: Shows full token info (FT or NFT collection)
 * 2. NFT Serial View: Shows collection info + specific NFT instance details
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { NftInfo } from '@/core/services/mirrornode/types';
import type { ViewTokenOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { buildOutput } from '@/plugins/token/utils/nft-build-output';

import { ViewTokenInputSchema } from './input';

export async function viewToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  try {
    const validArgs = ViewTokenInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    // Resolve alias → tokenId
    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new Error(
        `Failed to resolve token: ${validArgs.token}. Expected token-id or registered name.`,
      );
    }

    const tokenId = resolvedToken.tokenId;
    const nftSerial = validArgs.serial;

    logger.info(`Fetching token info for ${tokenId}...`);

    // 1. Always fetch basic token info first
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    // 2. If --serial provided, fetch specific NFT details
    let nftInfo: NftInfo | null = null;
    if (nftSerial) {
      // Validate: is this an NFT collection?
      if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
        return {
          status: Status.Failure,
          errorMessage: `Token ${tokenId} is not an NFT collection (type: ${tokenInfo.type}). Cannot query serial number.`,
        };
      }

      // Validate serial number format
      const serialNum = parseInt(nftSerial, 10);
      if (isNaN(serialNum) || serialNum < 1) {
        return {
          status: Status.Failure,
          errorMessage: `Invalid serial number: ${nftSerial}. Must be a positive integer.`,
        };
      }

      logger.info(`Fetching NFT serial #${serialNum}...`);
      nftInfo = await api.mirror.getNftInfo(tokenId, serialNum);
    }

    // 3. Build output based on mode
    const output: ViewTokenOutput = buildOutput(tokenInfo, nftInfo);

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to view token', error),
    };
  }
}
