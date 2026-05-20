import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TokenPendingAirdropsService } from '@/plugins/token/services/token-pending-airdrops.service.interface';
import type { TokenPendingAirdropsOutput } from './output';
import type { PendingAirdropsNormalizedParams } from './types';

import { TokenPendingAirdropsServiceImpl } from '@/plugins/token/services/token-pending-airdrops.service';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

import { TokenPendingAirdropsInputSchema } from './input';

export class TokenPendingAirdropsCommand implements Command {
  constructor(
    private readonly pendingAirdropsService: TokenPendingAirdropsService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs: PendingAirdropsNormalizedParams =
      TokenPendingAirdropsInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const output: TokenPendingAirdropsOutput =
      await this.pendingAirdropsService.getPendingAirdrops(
        validArgs.account,
        validArgs.showAll,
        network,
      );

    return { result: output };
  }
}

export async function tokenPendingAirdrops(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  return new TokenPendingAirdropsCommand(
    new TokenPendingAirdropsServiceImpl(
      api.mirror,
      api.logger,
      new TokenReferenceServiceImpl(api.identityResolution),
    ),
  ).execute(args);
}
