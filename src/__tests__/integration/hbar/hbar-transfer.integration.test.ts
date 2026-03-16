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
    const alias = `account-transfer-${Date.now()}`;
    const createAccountArgs: Record<string, unknown> = {
      name: alias,
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
    expect(createAccountOutput.name).toBe(alias);
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      to: alias,
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
      account: alias,
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
    const suffix = Date.now();
    const aliasFrom = `account-transfer-from-${suffix}`;
    const aliasTo = `account-transfer-to-${suffix}`;
    const accountFromArgs: Record<string, unknown> = {
      name: aliasFrom,
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
    expect(accountFromOutput.name).toBe(aliasFrom);
    expect(accountFromOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountFromOutput.network).toBe(network);

    const accountToArgs: Record<string, unknown> = {
      name: aliasTo,
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
    expect(accountToOutput.name).toBe(aliasTo);
    expect(accountToOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountToOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      from: aliasFrom,
      to: aliasTo,
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
      account: aliasFrom,
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
      account: aliasTo,
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
