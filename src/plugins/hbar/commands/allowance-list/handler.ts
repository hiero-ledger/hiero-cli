import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { HbarAllowanceInfo } from '@/core/services/mirrornode/types';
import type { HbarAllowanceQueryService } from '@/plugins/hbar/services/hbar-allowance-query.service.interface';
import type { HbarAllowanceListOutput } from './output';

import BigNumber from 'bignumber.js';

import { HBAR_DECIMALS } from '@/core/shared/constants';
import { normalizeBalance } from '@/core/utils/normalize-balance';
import { HbarAllowanceQueryServiceImpl } from '@/plugins/hbar/services/hbar-allowance-query.service';

import { HbarAllowanceListInputSchema } from './input';

export const HBAR_ALLOWANCE_LIST_COMMAND_NAME = 'hbar_allowance-list';

export class HbarAllowanceListCommand implements Command {
  constructor(private readonly allowanceQuery: HbarAllowanceQueryService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = HbarAllowanceListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const accountId = await this.allowanceQuery.resolveAccountId(
      validArgs.account,
      network,
    );
    const spenderAccountId = await this.allowanceQuery.resolveOptionalAccountId(
      validArgs.spender,
      network,
    );

    const response = await this.allowanceQuery.fetchAllowances(
      accountId,
      validArgs.showAll,
    );
    const allowances = response.allowances
      .filter((allowance) => this.matchesSpender(allowance, spenderAccountId))
      .map((allowance) => this.toOutputEntry(allowance));

    const output: HbarAllowanceListOutput = {
      accountId,
      network,
      allowances,
      total: allowances.length,
      hasMore: !validArgs.showAll && response.hasMore,
    };

    return { result: output };
  }

  private matchesSpender(
    allowance: HbarAllowanceInfo,
    spenderAccountId: string | undefined,
  ): boolean {
    return (
      spenderAccountId === undefined || allowance.spender === spenderAccountId
    );
  }

  private toOutputEntry(allowance: HbarAllowanceInfo) {
    const amountTinybar = allowance.amount;
    return {
      spenderAccountId: allowance.spender,
      amountTinybar,
      amountDisplay: normalizeBalance(
        new BigNumber(amountTinybar.toString()),
        HBAR_DECIMALS,
      ),
    };
  }
}

export async function hbarAllowanceList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const allowanceQuery = new HbarAllowanceQueryServiceImpl(
    api.identityResolution,
    api.mirror,
  );
  return new HbarAllowanceListCommand(allowanceQuery).execute(args);
}
