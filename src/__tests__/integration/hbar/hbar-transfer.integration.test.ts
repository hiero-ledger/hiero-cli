import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { TransferOutput } from '@/plugins/hbar/commands/transfer';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { createAccount, viewAccount } from '@/plugins/account';
import { transferHandler } from '@/plugins/hbar/commands/transfer';

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
    const createAccountResult = await createAccount({
      args: createAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(createAccountResult.status).toBe(Status.Success);
    const createAccountOutput: CreateAccountOutput = JSON.parse(
      createAccountResult.outputJson,
    );
    expect(createAccountOutput.name).toBe('account-transfer');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      to: 'account-transfer',
      memo: 'Memo test',
    };
    const transferHbarResult = await transferHandler({
      args: transferAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(transferHbarResult.status).toBe(Status.Success);
    const transferHbarOutput: TransferOutput = JSON.parse(
      transferHbarResult.outputJson,
    );
    expect(transferHbarOutput.status).toBe('success');
    expect(transferHbarOutput.fromAccountId).toBe(process.env.OPERATOR_ID);
    expect(transferHbarOutput.toAccountId).toBe(createAccountOutput.accountId);
    expect(transferHbarOutput.memo).toBe('Memo test');
    expect(transferHbarOutput.network).toBe(network);
    expect(transferHbarOutput.amountTinybar).toBe('100000000');

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-transfer',
    };
    const viewAccountResult = await viewAccount({
      args: viewAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewAccountResult.status).toBe(Status.Success);
    const viewAccountOutput: ViewAccountOutput = JSON.parse(
      viewAccountResult.outputJson,
    );
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe('200000000'); // result in tinybars
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);
  });

  it('should transfer HBAR from defined account to account and then verify it with account view method', async () => {
    const accountFromArgs: Record<string, unknown> = {
      name: 'account-transfer-from',
      balance: 1,
      'key-type': 'ecdsa',
      'auto-associations': 10,
    };
    const accountFromResult = await createAccount({
      args: accountFromArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(accountFromResult.status).toBe(Status.Success);
    const accountFromOutput: CreateAccountOutput = JSON.parse(
      accountFromResult.outputJson,
    );
    expect(accountFromOutput.name).toBe('account-transfer-from');
    expect(accountFromOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountFromOutput.network).toBe(network);

    const accountToArgs: Record<string, unknown> = {
      name: 'account-transfer-to',
      balance: 1,
      'key-type': 'ecdsa',
      'auto-associations': 10,
    };
    const accountToResult = await createAccount({
      args: accountToArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(accountToResult.status).toBe(Status.Success);
    const accountToOutput: CreateAccountOutput = JSON.parse(
      accountToResult.outputJson,
    );
    expect(accountToOutput.name).toBe('account-transfer-to');
    expect(accountToOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(accountToOutput.network).toBe(network);

    await delay(5000);

    const transferAccountArgs: Record<string, unknown> = {
      amount: '1',
      from: 'account-transfer-from',
      to: 'account-transfer-to',
    };
    const transferHbarResult = await transferHandler({
      args: transferAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(transferHbarResult.status).toBe(Status.Success);
    const transferHbarOutput: TransferOutput = JSON.parse(
      transferHbarResult.outputJson,
    );
    expect(transferHbarOutput.status).toBe('success');
    expect(transferHbarOutput.fromAccountId).toBe(accountFromOutput.accountId);
    expect(transferHbarOutput.toAccountId).toBe(accountToOutput.accountId);
    expect(transferHbarOutput.network).toBe(network);
    expect(transferHbarOutput.amountTinybar).toBe('100000000');

    await delay(5000);

    const viewAccountFromArgs: Record<string, unknown> = {
      account: 'account-transfer-from',
    };
    const viewAccountFromResult = await viewAccount({
      args: viewAccountFromArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewAccountFromResult.status).toBe(Status.Success);
    const viewAccountFromOutput: ViewAccountOutput = JSON.parse(
      viewAccountFromResult.outputJson,
    );
    expect(viewAccountFromOutput.accountId).toBe(accountFromOutput.accountId);
    expect(viewAccountFromOutput.publicKey).toBe(accountFromOutput.publicKey);

    const viewAccountToArgs: Record<string, unknown> = {
      account: 'account-transfer-to',
    };
    const viewAccountToResult = await viewAccount({
      args: viewAccountToArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewAccountToResult.status).toBe(Status.Success);
    const viewAccountToOutput: ViewAccountOutput = JSON.parse(
      viewAccountToResult.outputJson,
    );
    expect(viewAccountToOutput.accountId).toBe(accountToOutput.accountId);
    expect(viewAccountToOutput.balance).toBe('200000000'); // result in tinybars
    expect(viewAccountToOutput.publicKey).toBe(accountToOutput.publicKey);
  });
});
