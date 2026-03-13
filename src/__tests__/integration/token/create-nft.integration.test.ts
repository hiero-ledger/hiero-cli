import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { CreateNftOutput } from '@/plugins/token/commands/create-nft';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { accountCreate, accountView } from '@/plugins/account';
import { tokenCreateNft } from '@/plugins/token';

describe('Create NFT Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a non-fungible token and verify with account balance method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-create-nft',
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
      createAccountResult.result as CreateAccountOutput;
    expect(createAccountOutput.name).toBe('account-create-nft');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-create-nft',
    };
    const viewAccountResult = await accountView({
      args: viewAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewAccountOutput = viewAccountResult.result as ViewAccountOutput;
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe(100000000n); // result in tinybars
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

    const createNftArgs: Record<string, unknown> = {
      tokenName: 'Test NFT',
      symbol: 'NFT',
      treasury: 'account-create-nft',
      supplyType: SupplyType.FINITE,
      maxSupply: '100',
      adminKey: 'account-create-nft',
      supplyKey: 'account-create-nft',
      name: 'test-nft',
    };
    const createNftResult = await tokenCreateNft({
      args: createNftArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const createNftOutput = createNftResult.result as CreateNftOutput;
    expect(createNftOutput.network).toBe(network);
    expect(createNftOutput.name).toBe('Test NFT');
    expect(createNftOutput.alias).toBe('test-nft');
    expect(createNftOutput.treasuryId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.adminAccountId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.supplyAccountId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.symbol).toBe('NFT');
    expect(createNftOutput.supplyType).toBe(SupplyType.FINITE);
  });
});
