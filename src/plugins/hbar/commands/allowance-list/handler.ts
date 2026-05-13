import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountReference } from '@/core/schemas/common-schemas';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { HbarAllowanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
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
    const accountId = await this.resolveAccountId(
      api.identityResolution,
      network,
      validArgs.account,
    );
    const spenderAccountId = await this.resolveOptionalAccountId(
      api.identityResolution,
      network,
      validArgs.spender,
    );

    const response = await this.fetchAllowances(
      api.mirror,
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
    identityResolution: IdentityResolutionService,
    network: SupportedNetwork,
    account: AccountReference,
  ): Promise<string> {
    const resolved = await identityResolution.resolveAccount({
      accountReference: account.value,
      type: account.type,
      network,
    });
    return resolved.accountId;
  }

  private async resolveOptionalAccountId(
    identityResolution: IdentityResolutionService,
    network: SupportedNetwork,
    account: AccountReference | undefined,
  ): Promise<string | undefined> {
    if (account === undefined) return undefined;
    return this.resolveAccountId(identityResolution, network, account);
  }

  private async fetchAllowances(
    mirror: HederaMirrornodeService,
    accountId: string,
    showAll: boolean,
  ): Promise<{ allowances: HbarAllowanceInfo[]; hasMore: boolean }> {
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
