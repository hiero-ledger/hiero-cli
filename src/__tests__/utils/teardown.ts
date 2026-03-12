import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ListAccountsOutput } from '@/plugins/account/commands/list';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';

import * as fs from 'fs';

import { importAccount, listAccounts, viewAccount } from '@/plugins/account';
import { transferHbar } from '@/plugins/hbar/commands/transfer';

import { delay } from './common-utils';

export const deleteStateFiles = (dir: string): void => {
  fs.rmSync(dir, { recursive: true, force: true });
};

export const returnFundsFromCreatedAccountsToMainAccount = async (
  coreApi: CoreApi,
): Promise<void> => {
  try {
    const accountListResult = await listAccounts({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const accountOutput = accountListResult.result as ListAccountsOutput;
    const accounts = accountOutput.accounts;

    const importAccountArgs: Record<string, unknown> = {
      name: 'main-account',
      key: `${process.env.OPERATOR_ID as string}:${process.env.OPERATOR_KEY as string}`,
    };
    try {
      await importAccount({
        args: importAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
    } catch {
      // main-account may already exist
    }
    await delay(5000);
    for (const account of accounts) {
      try {
        const viewAccountResult = await viewAccount({
          args: { account: account.name },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
        const viewAccountOutput = viewAccountResult.result as ViewAccountOutput;
        const args: Record<string, unknown> = {
          amount: String(Number(viewAccountOutput.balance) / 100000000),
          to: 'main-account',
          from: account.name,
        };
        await transferHbar({
          args,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
      } catch {
        // skip accounts that cannot be viewed or transferred
      }
    }
  } catch {
    // if listing fails, skip cleanup
  }
};
