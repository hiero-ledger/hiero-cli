import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { CreateNftOutput } from '@/plugins/token/commands/create-nft';
import type { MintNftOutput } from '@/plugins/token/commands/mint-nft';
import type { ViewTokenOutput } from '@/plugins/token/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { createAccount, viewAccount } from '@/plugins/account';
import { createNft } from '@/plugins/token/commands/create-nft';
import { mintNft } from '@/plugins/token/commands/mint-nft';
import { viewToken } from '@/plugins/token/commands/view';

describe('Mint NFT Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  it('should create an NFT collection, mint NFT to treasury and verify with view token method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-mint-nft',
      balance: 1,
      keyType: 'ecdsa',
      autoAssociations: 10,
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
    expect(createAccountOutput.name).toBe('account-mint-nft');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-mint-nft',
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
    expect(viewAccountOutput.balance).toBe('100000000');
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

    const createNftArgs: Record<string, unknown> = {
      tokenName: 'Test NFT Collection',
      symbol: 'TNFT',
      treasury: 'account-mint-nft',
      supplyType: SupplyType.FINITE,
      maxSupply: '100',
      adminKey: 'account-mint-nft',
      supplyKey: 'account-mint-nft',
      name: 'test-nft-collection',
    };
    const createNftResult = await createNft({
      args: createNftArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(createNftResult.status).toBe(Status.Success);
    const createNftOutput: CreateNftOutput = JSON.parse(
      createNftResult.outputJson,
    );
    expect(createNftOutput.network).toBe(network);
    expect(createNftOutput.name).toBe('Test NFT Collection');
    expect(createNftOutput.alias).toBe('test-nft-collection');
    expect(createNftOutput.treasuryId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.adminAccountId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.supplyAccountId).toBe(viewAccountOutput.accountId);
    expect(createNftOutput.symbol).toBe('TNFT');
    expect(createNftOutput.supplyType).toBe(SupplyType.FINITE);

    await delay(5000);

    const mintNftArgs: Record<string, unknown> = {
      token: createNftOutput.tokenId,
      metadata: 'Test NFT Metadata',
      supplyKey: 'account-mint-nft',
    };
    const mintNftResult = await mintNft({
      args: mintNftArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(mintNftResult.status).toBe(Status.Success);
    const mintNftOutput: MintNftOutput = JSON.parse(mintNftResult.outputJson);
    expect(mintNftOutput.tokenId).toBe(createNftOutput.tokenId);
    expect(mintNftOutput.serialNumber).toBeDefined();
    expect(mintNftOutput.network).toBe(network);
    expect(mintNftOutput.transactionId).toBeDefined();

    await delay(5000);

    const viewTokenArgs: Record<string, unknown> = {
      token: createNftOutput.tokenId,
      serial: mintNftOutput.serialNumber,
    };
    const viewTokenResult = await viewToken({
      args: viewTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewTokenResult.status).toBe(Status.Success);
    const viewTokenOutput: ViewTokenOutput = JSON.parse(
      viewTokenResult.outputJson,
    );
    expect(viewTokenOutput.tokenId).toBe(createNftOutput.tokenId);
    expect(viewTokenOutput.name).toBe('Test NFT Collection');
    expect(viewTokenOutput.symbol).toBe('TNFT');
    expect(viewTokenOutput.nftSerial).toBeDefined();
    expect(viewTokenOutput.nftSerial?.serialNumber).toBe(
      parseInt(mintNftOutput.serialNumber, 10),
    );
    expect(viewTokenOutput.nftSerial?.owner).toBe(viewAccountOutput.accountId);
    expect(viewTokenOutput.nftSerial?.metadata).toBe('Test NFT Metadata');
  });
});
