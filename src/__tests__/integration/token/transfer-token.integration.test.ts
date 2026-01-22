import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { AssociateTokenOutput } from '@/plugins/token/commands/associate';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { TransferFungibleTokenOutput } from '@/plugins/token/commands/transfer-ft';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import {
  createAccount,
  getAccountBalance,
  viewAccount,
} from '@/plugins/account';
import { associateToken, createToken, transferToken } from '@/plugins/token';

describe('Transfer Token Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a token associate with account and transfer to it from operator account and verify with account balance method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-transfer-token',
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
    expect(createAccountOutput.name).toBe('account-transfer-token');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-transfer-token',
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
      tokenName: 'Test Token Transfer',
      symbol: 'TTT',
      initialSupply: '10',
      supplyType: 'INFINITE',
      name: 'test-token-transfer',
    };
    const createTokenResult = await createToken({
      args: createTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(createTokenResult.status).toBe(Status.Success);
    const createTokenOutput: CreateFungibleTokenOutput = JSON.parse(
      createTokenResult.outputJson!,
    );
    expect(createTokenOutput.network).toBe(network);
    expect(createTokenOutput.decimals).toBe(0);
    expect(createTokenOutput.initialSupply).toBe('10');
    expect(createTokenOutput.name).toBe('Test Token Transfer');
    expect(createTokenOutput.alias).toBe('test-token-transfer');
    expect(createTokenOutput.treasuryId).toBe(process.env.OPERATOR_ID);
    expect(createTokenOutput.symbol).toBe('TTT');
    expect(createTokenOutput.supplyType).toBe('INFINITE');

    await delay(5000);

    const associateTokenArgs: Record<string, unknown> = {
      token: createTokenOutput.tokenId,
      account: 'account-transfer-token',
    };
    const associateTokenResult = await associateToken({
      args: associateTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(associateTokenResult.status).toBe(Status.Success);
    const associateTokenOutput: AssociateTokenOutput = JSON.parse(
      associateTokenResult.outputJson!,
    );
    expect(associateTokenOutput.tokenId).toBe(createTokenOutput.tokenId);
    expect(associateTokenOutput.accountId).toBe(createAccountOutput.accountId);
    expect(associateTokenOutput.associated).toBe(true);
    expect(associateTokenOutput.alreadyAssociated).toBe(undefined);

    await delay(5000);

    const transferTokenArgs: Record<string, unknown> = {
      token: createTokenOutput.tokenId,
      from: `${process.env.OPERATOR_ID}:${process.env.OPERATOR_KEY}`,
      to: 'account-transfer-token',
      amount: '5',
    };
    const transferTokenResult = await transferToken({
      args: transferTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(transferTokenResult.status).toBe(Status.Success);
    const transferTokenOutput: TransferFungibleTokenOutput = JSON.parse(
      transferTokenResult.outputJson!,
    );
    expect(transferTokenOutput.tokenId).toBe(createTokenOutput.tokenId);
    expect(transferTokenOutput.from).toBe(process.env.OPERATOR_ID);
    expect(transferTokenOutput.to).toBe(createAccountOutput.accountId);
    expect(transferTokenOutput.amount).toBe('5');

    await delay(5000);

    const accountBalanceArgs: Record<string, unknown> = {
      account: 'account-transfer-token',
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
    expect(accountBalanceOutput.tokenBalances?.at(0)?.balance).toBe('5');
  });
});
