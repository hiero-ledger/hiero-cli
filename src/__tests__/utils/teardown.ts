import * as fs from 'fs';
import { transferHandler } from '../../plugins/hbar/commands/transfer';
import { CoreApi } from '../../core/core-api/core-api.interface';
import {
  importAccount,
  listAccounts,
  viewAccount,
} from '../../plugins/account';
import { Status } from '../../core/shared/constants';
import { ListAccountsOutput } from '../../plugins/account/commands/list';
import { ViewAccountOutput } from '../../plugins/account/commands/view';
import { delay } from './common-utils';

export const deleteStateFiles = (dir: string): void => {
  fs.rmSync(dir, { recursive: true, force: true });
};

export const returnFundsFromCreatedAccountsToMainAccount = async (
  coreApi: CoreApi,
): Promise<void> => {
  const accountListResult = await listAccounts({
    args: {},
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
  if (accountListResult.status == Status.Success) {
    const accountOutput: ListAccountsOutput = JSON.parse(
      accountListResult.outputJson!,
    );
    const accounts = accountOutput.accounts;

    const importAccountArgs: Record<string, unknown> = {
      id: process.env.OPERATOR_ID as string,
      name: 'main-account',
      key: process.env.OPERATOR_KEY as string,
    };
    await importAccount({
      args: importAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    await delay(5000);
    for (const account of accounts) {
      const viewAccountResult = await viewAccount({
        args: { account: account.name },
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      if (viewAccountResult.status == Status.Success) {
        const viewAccountOutput: ViewAccountOutput = JSON.parse(
          viewAccountResult.outputJson!,
        );
        const args: Record<string, unknown> = {
          amount: String(Number(viewAccountOutput.balance) / 100000000),
          to: 'main-account',
          from: account.name,
        };
        await transferHandler({
          args,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        });
      }
    }
  }
};
