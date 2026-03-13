import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { AssociateTokenOutput } from '@/plugins/token/commands/associate';
import type { CreateNftOutput } from '@/plugins/token/commands/create-nft';
import type { MintNftOutput } from '@/plugins/token/commands/mint-nft';
import type { TransferNftOutput } from '@/plugins/token/commands/transfer-nft';
import type { ViewTokenOutput } from '@/plugins/token/commands/view';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { accountCreate } from '@/plugins/account';
import {
  tokenAssociate,
  tokenCreateNft,
  tokenMintNft,
  tokenTransferNft,
  tokenView,
} from '@/plugins/token';

describe('Transfer NFT Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  describe('Valid Transfer NFT Scenarios', () => {
    it('should create NFT, mint to source account and transfer to destination account', async () => {
      const createSourceAccountArgs: Record<string, unknown> = {
        name: 'account-nft-transfer-source',
        balance: 1,
        'key-type': 'ecdsa',
        'auto-associations': 10,
      };
      const createSourceAccountResult = await accountCreate({
        args: createSourceAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createSourceAccountOutput =
        createSourceAccountResult.result as CreateAccountOutput;
      expect(createSourceAccountOutput.name).toBe(
        'account-nft-transfer-source',
      );
      expect(createSourceAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createSourceAccountOutput.network).toBe(network);

      await delay(5000);

      const createDestinationAccountArgs: Record<string, unknown> = {
        name: 'account-nft-transfer-destination',
        balance: 1,
        'key-type': 'ecdsa',
        'auto-associations': 10,
      };
      const createDestinationAccountResult = await accountCreate({
        args: createDestinationAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createDestinationAccountOutput =
        createDestinationAccountResult.result as CreateAccountOutput;
      expect(createDestinationAccountOutput.name).toBe(
        'account-nft-transfer-destination',
      );
      expect(createDestinationAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createDestinationAccountOutput.network).toBe(network);

      await delay(5000);

      const createNftArgs: Record<string, unknown> = {
        tokenName: 'Test NFT Transfer Collection',
        symbol: 'TNFTC',
        treasury: 'account-nft-transfer-source',
        supplyType: SupplyType.FINITE,
        maxSupply: '100',
        adminKey: 'account-nft-transfer-source',
        supplyKey: 'account-nft-transfer-source',
        name: 'test-nft-transfer-collection',
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
      expect(createNftOutput.name).toBe('Test NFT Transfer Collection');
      expect(createNftOutput.alias).toBe('test-nft-transfer-collection');
      expect(createNftOutput.treasuryId).toBe(
        createSourceAccountOutput.accountId,
      );
      expect(createNftOutput.adminAccountId).toBe(
        createSourceAccountOutput.accountId,
      );
      expect(createNftOutput.supplyAccountId).toBe(
        createSourceAccountOutput.accountId,
      );
      expect(createNftOutput.symbol).toBe('TNFTC');
      expect(createNftOutput.supplyType).toBe(SupplyType.FINITE);

      await delay(5000);

      const mintNftArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        metadata: 'Test NFT Transfer Metadata',
        supplyKey: 'account-nft-transfer-source',
      };
      const mintNftResult = await tokenMintNft({
        args: mintNftArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const mintNftOutput = mintNftResult.result as MintNftOutput;
      expect(mintNftOutput.tokenId).toBe(createNftOutput.tokenId);
      expect(mintNftOutput.serialNumber).toBeDefined();
      expect(mintNftOutput.network).toBe(network);
      expect(mintNftOutput.transactionId).toBeDefined();

      await delay(5000);

      const associateTokenArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        account: 'account-nft-transfer-destination',
      };
      const associateTokenResult = await tokenAssociate({
        args: associateTokenArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const associateTokenOutput =
        associateTokenResult.result as AssociateTokenOutput;
      expect(associateTokenOutput.tokenId).toBe(createNftOutput.tokenId);
      expect(associateTokenOutput.accountId).toBe(
        createDestinationAccountOutput.accountId,
      );
      expect(associateTokenOutput.associated).toBe(true);

      await delay(5000);

      const viewTokenBeforeTransferArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        serial: mintNftOutput.serialNumber,
      };
      const viewTokenBeforeTransferResult = await tokenView({
        args: viewTokenBeforeTransferArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const viewTokenBeforeTransferOutput =
        viewTokenBeforeTransferResult.result as ViewTokenOutput;
      expect(viewTokenBeforeTransferOutput.tokenId).toBe(
        createNftOutput.tokenId,
      );
      expect(viewTokenBeforeTransferOutput.nftSerial?.serialNumber).toBe(
        parseInt(mintNftOutput.serialNumber, 10),
      );
      expect(viewTokenBeforeTransferOutput.nftSerial?.owner).toBe(
        createSourceAccountOutput.accountId,
      );
      expect(viewTokenBeforeTransferOutput.nftSerial?.metadata).toBe(
        'Test NFT Transfer Metadata',
      );

      const transferNftArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        from: 'account-nft-transfer-source',
        to: 'account-nft-transfer-destination',
        serials: mintNftOutput.serialNumber,
      };
      const transferNftResult = await tokenTransferNft({
        args: transferNftArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const transferNftOutput = transferNftResult.result as TransferNftOutput;
      expect(transferNftOutput.tokenId).toBe(createNftOutput.tokenId);
      expect(transferNftOutput.from).toBe(createSourceAccountOutput.accountId);
      expect(transferNftOutput.to).toBe(
        createDestinationAccountOutput.accountId,
      );
      expect(transferNftOutput.serials).toEqual([
        parseInt(mintNftOutput.serialNumber, 10),
      ]);
      expect(transferNftOutput.network).toBe(network);
      expect(transferNftOutput.transactionId).toBeDefined();

      await delay(5000);

      const viewTokenAfterTransferArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        serial: mintNftOutput.serialNumber,
      };
      const viewTokenAfterTransferResult = await tokenView({
        args: viewTokenAfterTransferArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const viewTokenAfterTransferOutput =
        viewTokenAfterTransferResult.result as ViewTokenOutput;
      expect(viewTokenAfterTransferOutput.tokenId).toBe(
        createNftOutput.tokenId,
      );
      expect(viewTokenAfterTransferOutput.nftSerial?.serialNumber).toBe(
        parseInt(mintNftOutput.serialNumber, 10),
      );
      expect(viewTokenAfterTransferOutput.nftSerial?.owner).toBe(
        createDestinationAccountOutput.accountId,
      );
      expect(viewTokenAfterTransferOutput.nftSerial?.metadata).toBe(
        'Test NFT Transfer Metadata',
      );
    }, 120000);
  });

  describe('Invalid Transfer NFT Scenarios', () => {
    it('should fail when trying to transfer NFT not owned by source account', async () => {
      const createAccountArgs: Record<string, unknown> = {
        name: 'account-nft-not-owned-test',
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
      expect(createAccountOutput.name).toBe('account-nft-not-owned-test');
      expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
      expect(createAccountOutput.network).toBe(network);

      await delay(5000);

      const createNftArgs: Record<string, unknown> = {
        tokenName: 'Test NFT Not Owned',
        symbol: 'TNNO',
        treasury: 'account-nft-not-owned-test',
        supplyType: SupplyType.FINITE,
        maxSupply: '100',
        adminKey: 'account-nft-not-owned-test',
        supplyKey: 'account-nft-not-owned-test',
        name: 'test-nft-not-owned',
      };
      const createNftResult = await tokenCreateNft({
        args: createNftArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const createNftOutput = createNftResult.result as CreateNftOutput;

      await delay(5000);

      const mintNftArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        metadata: 'Test NFT Not Owned Metadata',
        supplyKey: 'account-nft-not-owned-test',
      };
      const mintNftResult = await tokenMintNft({
        args: mintNftArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const mintNftOutput = mintNftResult.result as MintNftOutput;

      await delay(5000);

      const createAnotherAccountArgs: Record<string, unknown> = {
        name: 'account-nft-wrong-owner',
        balance: 1,
        'key-type': 'ecdsa',
        'auto-associations': 10,
      };
      await accountCreate({
        args: createAnotherAccountArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      await delay(5000);

      const transferNftArgs: Record<string, unknown> = {
        token: createNftOutput.tokenId,
        from: 'account-nft-wrong-owner',
        to: 'account-nft-not-owned-test',
        serials: mintNftOutput.serialNumber,
      };
      await expect(
        tokenTransferNft({
          args: transferNftArgs,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow('NFT not owned by sender');
    }, 90000);

    it('should fail validation when trying to transfer more than 10 serials', async () => {
      const transferNftArgs: Record<string, unknown> = {
        token: '0.0.123456',
        from: 'some-account',
        to: 'another-account',
        serials: '1,2,3,4,5,6,7,8,9,10,11',
      };

      await expect(
        tokenTransferNft({
          args: transferNftArgs,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow();
    });
  });
});
