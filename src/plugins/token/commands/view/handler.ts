import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { NftInfo } from '@/core/services/mirrornode/types';
import type { ViewTokenOutput } from './output';

import { NotFoundError, ValidationError } from '@/core/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { buildOutput } from '@/plugins/token/utils/nft-build-output';

import { ViewTokenInputSchema } from './input';

export async function viewToken(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = ViewTokenInputSchema.parse(args.args);
  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
  if (!resolvedToken) {
    throw new NotFoundError(`Token not found: ${validArgs.token}`, {
      context: { token: validArgs.token },
    });
  }

  const tokenId = resolvedToken.tokenId;
  const nftSerial = validArgs.serial;

  logger.info(`Fetching token info for ${tokenId}...`);

  const tokenInfo = await api.mirror.getTokenInfo(tokenId);

  let nftInfo: NftInfo | null = null;
  if (nftSerial) {
    if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
      throw new ValidationError('Token is not an NFT collection', {
        context: { tokenId, type: tokenInfo.type },
      });
    }

    const serialNum = parseInt(nftSerial, 10);
    if (isNaN(serialNum) || serialNum < 1) {
      throw new ValidationError('Invalid serial number', {
        context: { serial: nftSerial },
      });
    }

    logger.info(`Fetching NFT serial #${serialNum}...`);
    nftInfo = await api.mirror.getNftInfo(tokenId, serialNum);
  }

  const output: ViewTokenOutput = buildOutput(tokenInfo, nftInfo, network);

  return { result: output };
}
