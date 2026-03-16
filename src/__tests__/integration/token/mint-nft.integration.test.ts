import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountCreateOutput } from '@/plugins/account/commands/create';
import type { AccountViewOutput } from '@/plugins/account/commands/view';
import type { TokenCreateNftOutput } from '@/plugins/token/commands/create-nft';
import type { TokenMintNftOutput } from '@/plugins/token/commands/mint-nft';
import type { TokenViewOutput } from '@/plugins/token/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { accountCreate, accountView } from '@/plugins/account';
import { tokenCreateNft, tokenMintNft, tokenView } from '@/plugins/token';

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
    const createAccountResult = await accountCreate({
      args: createAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const createAccountOutput =
      createAccountResult.result as AccountCreateOutput;
    expect(createAccountOutput.name).toBe('account-mint-nft');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-mint-nft',
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
    expect(viewAccountOutput.balance).toBe(100000000n);
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
    const createNftResult = await tokenCreateNft({
      args: createNftArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const createNftOutput = createNftResult.result as TokenCreateNftOutput;
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
    const mintNftResult = await tokenMintNft({
      args: mintNftArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const mintNftOutput = mintNftResult.result as TokenMintNftOutput;
    expect(mintNftOutput.tokenId).toBe(createNftOutput.tokenId);
    expect(mintNftOutput.serialNumber).toBeDefined();
    expect(mintNftOutput.network).toBe(network);
    expect(mintNftOutput.transactionId).toBeDefined();

    await delay(5000);

    const viewTokenArgs: Record<string, unknown> = {
      token: createNftOutput.tokenId,
      serial: mintNftOutput.serialNumber,
    };
    const viewTokenResult = await tokenView({
      args: viewTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewTokenOutput = viewTokenResult.result as TokenViewOutput;
    expect(viewTokenOutput.tokenId).toBe(createNftOutput.tokenId);
    expect(viewTokenOutput.name).toBe('Test NFT Collection');
    expect(viewTokenOutput.symbol).toBe('TNFT');
    expect(viewTokenOutput.nftSerial).toBeDefined();
    expect(viewTokenOutput.nftSerial?.serialNumber).toBe(
      parseInt(mintNftOutput.serialNumber, 10),
    );
    expect(viewTokenOutput.nftSerial?.owner).toBe(viewAccountOutput.accountId);
    expect(viewTokenOutput.nftSerial?.metadata).toBe('Test NFT Metadata');
  }, 90000);
});
