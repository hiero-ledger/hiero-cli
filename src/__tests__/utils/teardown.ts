import * as fs from 'fs';
import { transferHandler } from '../../plugins/hbar/commands/transfer';
import { CoreApi } from '../../core/core-api/core-api.interface';

export const deleteStateFiles = async (dir: string): Promise<void> => {
  fs.rm(dir, { recursive: true, force: true }, (err: any) => {
    if (err) {
      throw err;
    }

    console.log(`${dir} is deleted!`);
  });
};

export const transferRemainingBalanceFromCreatedAccountToOperator = async (
  coreApi: CoreApi,
  params: { balance: number; to: string; from: string },
): Promise<void> => {
  const args: Record<string, unknown> = {
    balance: params.balance,
    to: params.to,
    from: params.from,
  };
  await transferHandler({
    args,
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
};
