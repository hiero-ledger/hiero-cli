import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { NftInfo } from '@/core/services/mirrornode/types';
import type { ViewTokenOutput } from './output';
import type { ViewTokenNormalizedParams } from './types';

import { NotFoundError, ValidationError } from '@/core/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { buildOutput } from '@/plugins/token/utils/nft-build-output';

import { ViewTokenInputSchema } from './input';

export class ViewTokenCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const validArgs: ViewTokenNormalizedParams = ViewTokenInputSchema.parse(
      args.args,
    );
    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    logger.info(`Fetching token info for ${tokenId}...`);
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    let nftInfo: NftInfo | null = null;
    if (validArgs.serial) {
      if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
        throw new ValidationError('Token is not an NFT collection', {
          context: { tokenId, type: tokenInfo.type },
        });
      }

      const serialNum = parseInt(validArgs.serial, 10);
      if (isNaN(serialNum) || serialNum < 1) {
        throw new ValidationError('Invalid serial number', {
          context: { serial: validArgs.serial },
        });
      }

      logger.info(`Fetching NFT serial #${serialNum}...`);
      nftInfo = await api.mirror.getNftInfo(tokenId, serialNum);
    }

    const output: ViewTokenOutput = buildOutput(tokenInfo, nftInfo, network);
    return { result: output };
  }
}

export async function tokenView(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ViewTokenCommand().execute(args);
}
