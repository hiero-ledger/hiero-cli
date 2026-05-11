import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { HbarAllowanceInfo } from '@/core/services/mirrornode/types';
import type { HbarAllowanceListInput } from './input';
import type { HbarAllowanceListOutput } from './output';

import BigNumber from 'bignumber.js';

import { HBAR_DECIMALS } from '@/core/shared/constants';
import { normalizeBalance } from '@/core/utils/normalize-balance';

import { HbarAllowanceListInputSchema } from './input';

export const HBAR_ALLOWANCE_LIST_COMMAND_NAME = 'hbar_allowance-list';

export class HbarAllowanceListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = HbarAllowanceListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const accountId = await this.resolveAccountId(args, validArgs.account);
    const spenderAccountId = await this.resolveOptionalAccountId(
      args,
      validArgs.spender,
    );

    const response = await this.fetchAllowances(
      args,
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

  private async resolveAccountId(
    args: CommandHandlerArgs,
    account: HbarAllowanceListInput['account'],
  ): Promise<string> {
    const network = args.api.network.getCurrentNetwork();
    const resolved = await args.api.identityResolution.resolveAccount({
      accountReference: account.value,
      type: account.type,
      network,
    });
    return resolved.accountId;
  }

  private async resolveOptionalAccountId(
    args: CommandHandlerArgs,
    account: HbarAllowanceListInput['spender'],
  ): Promise<string | undefined> {
    if (account === undefined) return undefined;
    return this.resolveAccountId(args, account);
  }

  private async fetchAllowances(
    args: CommandHandlerArgs,
    accountId: string,
    showAll: boolean,
  ): Promise<{ allowances: HbarAllowanceInfo[]; hasMore: boolean }> {
    const { mirror } = args.api;
    if (!showAll) {
      const response = await mirror.getHbarAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }

    const response = await mirror.getAllHbarAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
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
  return new HbarAllowanceListCommand().execute(args);
}
