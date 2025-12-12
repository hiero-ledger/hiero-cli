import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core/core-api/core-api';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import {
  createAccount,
  getAccountBalance,
  viewAccount,
} from '@/plugins/account';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import { createToken } from '@/plugins/token';
import type { CreateTokenOutput } from '@/plugins/token/commands/create';

import '@/core/utils/json-serialize';

describe('Create Token Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a token and verify with account balance method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-create-token',
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
      createAccountResult.outputJson!,
    );
    expect(createAccountOutput.name).toBe('account-create-token');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-create-token',
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
      viewAccountResult.outputJson!,
    );
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe('100000000'); // result in tinybars
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

    const createTokenArgs: Record<string, unknown> = {
      tokenName: 'Test Token',
      symbol: 'TT',
      treasury: 'account-create-token',
      initialSupply: '10',
      supplyType: 'FINITE',
      maxSupply: '100',
      adminKey: 'account-create-token',
      name: 'test-token',
    };
    const createTokenResult = await createToken({
      args: createTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(createTokenResult.status).toBe(Status.Success);
    const createTokenOutput: CreateTokenOutput = JSON.parse(
      createTokenResult.outputJson!,
    );
    expect(createTokenOutput.network).toBe(network);
    expect(createTokenOutput.decimals).toBe(0);
    expect(createTokenOutput.initialSupply).toBe('10');
    expect(createTokenOutput.name).toBe('Test Token');
    expect(createTokenOutput.alias).toBe('test-token');
    expect(createTokenOutput.treasuryId).toBe(viewAccountOutput.accountId);
    expect(createTokenOutput.symbol).toBe('TT');
    expect(createTokenOutput.supplyType).toBe('FINITE');

    await delay(5000);

    const accountBalanceArgs: Record<string, unknown> = {
      account: 'account-create-token',
      hbarOnly: false,
      token: createTokenOutput.tokenId,
    };
    const accountBalanceResult = await getAccountBalance({
      args: accountBalanceArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(accountBalanceResult.status).toBe(Status.Success);
    const accountBalanceOutput: AccountBalanceOutput = JSON.parse(
      accountBalanceResult.outputJson!,
    );
    expect(accountBalanceOutput.tokenBalances?.length).toBe(1);
    expect(accountBalanceOutput.tokenBalances?.at(0)?.tokenId).toBe(
      createTokenOutput.tokenId,
    );
    expect(accountBalanceOutput.tokenBalances?.at(0)?.balance).toBe(
      createTokenOutput.initialSupply,
    );
  });
});
