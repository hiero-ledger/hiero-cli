import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { NftInfo } from '@/core/services/mirrornode/types';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenViewOutput } from './output';
import type { ViewTokenNormalizedParams } from './types';

import { NotFoundError, ValidationError } from '@/core/errors';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';
import { tokenBuildOutput } from '@/plugins/token/utils/token-build-output';

import { TokenViewInputSchema } from './input';

export class TokenViewCommand implements Command {
  constructor(private readonly tokenReferenceService: TokenReferenceService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs: ViewTokenNormalizedParams = TokenViewInputSchema.parse(
      args.args,
    );
    const network = api.network.getCurrentNetwork();

    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    api.logger.info(`Fetching token info for ${tokenId}...`);
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    let nftInfo: NftInfo | null = null;
    if (validArgs.serial) {
      if (tokenInfo.type !== MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE) {
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

      api.logger.info(`Fetching NFT serial #${serialNum}...`);
      nftInfo = await api.mirror.getNftInfo(tokenId, serialNum);
    }
    const output: TokenViewOutput = tokenBuildOutput(
      tokenInfo,
      nftInfo,
      network,
    );
    return { result: output };
  }
}

export async function tokenView(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenViewCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
  ).execute(args);
}
