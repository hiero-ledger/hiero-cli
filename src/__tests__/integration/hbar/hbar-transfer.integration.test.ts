import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountViewOutput } from '@/plugins/account/commands/view';
import type { HbarTransferOutput } from '@/plugins/hbar/commands/transfer';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { accountCreate, accountView } from '@/plugins/account';
import { hbarTransfer } from '@/plugins/hbar/commands/transfer';

describe('HBAR Transfer Account Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  it('should transfer HBAR from operator to account and then verify it with account view method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-transfer',
      balance: 1,
      'key-type': 'ecdsa',
      'auto-associations': 10,
    };
    const createAccountResult = await accountCreate({
      args: createAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const createAccountOutput =
      createAccountResult.result as AccountCreateOutput;
    expect(createAccountOutput.name).toBe('account-transfer');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      to: 'account-transfer',
      memo: 'Memo test',
    };
    const transferHbarResult = await hbarTransfer({
      args: transferAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const transferHbarOutput = transferHbarResult.result as HbarTransferOutput;
    expect(transferHbarOutput.status).toBe('success');
    expect(transferHbarOutput.fromAccountId).toBe(process.env.OPERATOR_ID);
    expect(transferHbarOutput.toAccountId).toBe(createAccountOutput.accountId);
    expect(transferHbarOutput.memo).toBe('Memo test');
    expect(transferHbarOutput.network).toBe(network);
    expect(transferHbarOutput.amountTinybar).toBe(100000000n);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-transfer',
    };
    const viewAccountResult = await accountView({
      args: viewAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewAccountOutput = viewAccountResult.result as AccountViewOutput;
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe(200000000n); // result in tinybars
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);
  }, 60000);

  it('should transfer HBAR from defined account to account and then verify it with account view method', async () => {
    const accountFromArgs: Record<string, unknown> = {
      name: 'account-transfer-from',
      balance: 1,
      'key-type': 'ecdsa',
      'auto-associations': 10,
    };
    const accountFromResult = await accountCreate({
      args: accountFromArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const accountFromOutput = accountFromResult.result as AccountCreateOutput;
    expect(accountFromOutput.name).toBe('account-transfer-from');
    expect(accountFromOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountFromOutput.network).toBe(network);

    const accountToArgs: Record<string, unknown> = {
      name: 'account-transfer-to',
      balance: 1,
      'key-type': 'ecdsa',
      'auto-associations': 10,
    };
    const accountToResult = await accountCreate({
      args: accountToArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const accountToOutput = accountToResult.result as AccountCreateOutput;
    expect(accountToOutput.name).toBe('account-transfer-to');
    expect(accountToOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountToOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      from: 'account-transfer-from',
      to: 'account-transfer-to',
    };
    const transferHbarResult = await hbarTransfer({
      args: transferAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const transferHbarOutput = transferHbarResult.result as HbarTransferOutput;
    expect(transferHbarOutput.status).toBe('success');
    expect(transferHbarOutput.fromAccountId).toBe(accountFromOutput.accountId);
    expect(transferHbarOutput.toAccountId).toBe(accountToOutput.accountId);
    expect(transferHbarOutput.network).toBe(network);
    expect(transferHbarOutput.amountTinybar).toBe(100000000n);

    await delay(5000);

    const viewAccountFromArgs: Record<string, unknown> = {
      account: 'account-transfer-from',
    };
    const viewAccountFromResult = await accountView({
      args: viewAccountFromArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewAccountFromOutput =
      viewAccountFromResult.result as AccountViewOutput;
    expect(viewAccountFromOutput.accountId).toBe(accountFromOutput.accountId);
    expect(viewAccountFromOutput.publicKey).toBe(accountFromOutput.publicKey);

    const viewAccountToArgs: Record<string, unknown> = {
      account: 'account-transfer-to',
    };
    const viewAccountToResult = await accountView({
      args: viewAccountToArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewAccountToOutput = viewAccountToResult.result as AccountViewOutput;
    expect(viewAccountToOutput.accountId).toBe(accountToOutput.accountId);
    expect(viewAccountToOutput.balance).toBe(200000000n); // result in tinybars
    expect(viewAccountToOutput.publicKey).toBe(accountToOutput.publicKey);
  }, 90000);
});
