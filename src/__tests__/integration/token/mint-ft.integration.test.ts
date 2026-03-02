import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { MintFtOutput } from '@/plugins/token/commands/mint-ft';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay, waitFor } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  createAccount,
  getAccountBalance,
  viewAccount,
} from '@/plugins/account';
import { createToken, mintFt } from '@/plugins/token';

describe('Mint FT Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  it('should create a token with supply key, mint tokens to treasury and verify with account balance method', async () => {
    const createAccountArgs: Record<string, unknown> = {
      name: 'account-mint-ft',
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

    const createAccountOutput =
      createAccountResult.result as CreateAccountOutput;
    expect(createAccountOutput.name).toBe('account-mint-ft');
    expect(createAccountOutput.type).toBe(KeyAlgorithm.ECDSA);
    expect(createAccountOutput.network).toBe(network);

    await delay(5000);

    const viewAccountArgs: Record<string, unknown> = {
      account: 'account-mint-ft',
    };
    const viewAccountResult = await viewAccount({
      args: viewAccountArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewAccountOutput = viewAccountResult.result as ViewAccountOutput;
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe(100000000n);
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

    const createTokenArgs: Record<string, unknown> = {
      tokenName: 'Test Token Mint',
      symbol: 'TTM',
      treasury: 'account-mint-ft',
      initialSupply: '100',
      supplyType: SupplyType.INFINITE,
      supplyKey: `${process.env.OPERATOR_ID}:${process.env.OPERATOR_KEY}`,
      name: 'test-token-mint',
    };
    const createTokenResult = await createToken({
      args: createTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const createTokenOutput =
      createTokenResult.result as CreateFungibleTokenOutput;
    expect(createTokenOutput.network).toBe(network);
    expect(createTokenOutput.decimals).toBe(0);
    expect(createTokenOutput.initialSupply).toBe('100');
    expect(createTokenOutput.name).toBe('Test Token Mint');
    expect(createTokenOutput.alias).toBe('test-token-mint');
    expect(createTokenOutput.treasuryId).toBe(createAccountOutput.accountId);
    expect(createTokenOutput.symbol).toBe('TTM');
    expect(createTokenOutput.supplyType).toBe(SupplyType.INFINITE);

    const accountBalanceBeforeMintArgs: Record<string, unknown> = {
      account: 'account-mint-ft',
      hbarOnly: false,
      token: createTokenOutput.tokenId,
    };
    const accountBalanceBeforeMintOutput = await waitFor(
      () =>
        getAccountBalance({
          args: accountBalanceBeforeMintArgs,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }).then((r) => r.result as AccountBalanceOutput),
      (output) => (output.tokenBalances?.length ?? 0) > 0,
    );
    expect(accountBalanceBeforeMintOutput.tokenBalances?.length).toBe(1);
    expect(accountBalanceBeforeMintOutput.tokenBalances?.at(0)?.tokenId).toBe(
      createTokenOutput.tokenId,
    );
    expect(accountBalanceBeforeMintOutput.tokenBalances?.at(0)?.balance).toBe(
      100n,
    );

    await delay(5000);

    const mintFtArgs: Record<string, unknown> = {
      token: createTokenOutput.tokenId,
      amount: '50',
      supplyKey: `${process.env.OPERATOR_ID}:${process.env.OPERATOR_KEY}`,
    };
    const mintFtResult = await mintFt({
      args: mintFtArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const mintFtOutput = mintFtResult.result as MintFtOutput;
    expect(mintFtOutput.tokenId).toBe(createTokenOutput.tokenId);
    expect(mintFtOutput.amount).toBe(50n);
    expect(mintFtOutput.network).toBe(network);
    expect(mintFtOutput.transactionId).toBeDefined();

    const accountBalanceAfterMintArgs: Record<string, unknown> = {
      account: 'account-mint-ft',
      hbarOnly: false,
      token: createTokenOutput.tokenId,
    };
    const accountBalanceAfterMintOutput = await waitFor(
      () =>
        getAccountBalance({
          args: accountBalanceAfterMintArgs,
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }).then((r) => r.result as AccountBalanceOutput),
      (output) => output.tokenBalances?.at(0)?.balance === 150n,
    );
    expect(accountBalanceAfterMintOutput.tokenBalances?.length).toBe(1);
    expect(accountBalanceAfterMintOutput.tokenBalances?.at(0)?.tokenId).toBe(
      createTokenOutput.tokenId,
    );
    expect(accountBalanceAfterMintOutput.tokenBalances?.at(0)?.balance).toBe(
      150n,
    );
  });
});
