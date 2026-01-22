import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountBalanceOutput } from '@/plugins/account/commands/balance';
import type { CreateAccountOutput } from '@/plugins/account/commands/create';
import type { ViewAccountOutput } from '@/plugins/account/commands/view';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { MintFtOutput } from '@/plugins/token/commands/mint-ft';

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

    expect(createAccountResult.status).toBe(Status.Success);
    const createAccountOutput: CreateAccountOutput = JSON.parse(
      createAccountResult.outputJson!,
    );
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
    expect(viewAccountResult.status).toBe(Status.Success);
    const viewAccountOutput: ViewAccountOutput = JSON.parse(
      viewAccountResult.outputJson!,
    );
    expect(viewAccountOutput.accountId).toBe(createAccountOutput.accountId);
    expect(viewAccountOutput.balance).toBe('100000000');
    expect(viewAccountOutput.evmAddress).toBe(createAccountOutput.evmAddress);
    expect(viewAccountOutput.publicKey).toBe(createAccountOutput.publicKey);

    const createTokenArgs: Record<string, unknown> = {
      tokenName: 'Test Token Mint',
      symbol: 'TTM',
      treasury: 'account-mint-ft',
      initialSupply: '100',
      supplyType: 'INFINITE',
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
    expect(createTokenResult.status).toBe(Status.Success);
    const createTokenOutput: CreateFungibleTokenOutput = JSON.parse(
      createTokenResult.outputJson!,
    );
    expect(createTokenOutput.network).toBe(network);
    expect(createTokenOutput.decimals).toBe(0);
    expect(createTokenOutput.initialSupply).toBe('100');
    expect(createTokenOutput.name).toBe('Test Token Mint');
    expect(createTokenOutput.alias).toBe('test-token-mint');
    expect(createTokenOutput.treasuryId).toBe(createAccountOutput.accountId);
    expect(createTokenOutput.symbol).toBe('TTM');
    expect(createTokenOutput.supplyType).toBe('INFINITE');

    await delay(5000);

    const accountBalanceBeforeMintArgs: Record<string, unknown> = {
      account: 'account-mint-ft',
      hbarOnly: false,
      token: createTokenOutput.tokenId,
    };
    const accountBalanceBeforeMintResult = await getAccountBalance({
      args: accountBalanceBeforeMintArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(accountBalanceBeforeMintResult.status).toBe(Status.Success);
    const accountBalanceBeforeMintOutput: AccountBalanceOutput = JSON.parse(
      accountBalanceBeforeMintResult.outputJson!,
    );
    expect(accountBalanceBeforeMintOutput.tokenBalances?.length).toBe(1);
    expect(accountBalanceBeforeMintOutput.tokenBalances?.at(0)?.tokenId).toBe(
      createTokenOutput.tokenId,
    );
    const balanceBeforeMint =
      accountBalanceBeforeMintOutput.tokenBalances?.at(0)?.balance;
    expect(balanceBeforeMint).toBe('100');

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
    expect(mintFtResult.status).toBe(Status.Success);
    const mintFtOutput: MintFtOutput = JSON.parse(mintFtResult.outputJson!);
    expect(mintFtOutput.tokenId).toBe(createTokenOutput.tokenId);
    expect(mintFtOutput.amount).toBe('50');
    expect(mintFtOutput.network).toBe(network);
    expect(mintFtOutput.transactionId).toBeDefined();

    await delay(5000);

    const accountBalanceAfterMintArgs: Record<string, unknown> = {
      account: 'account-mint-ft',
      hbarOnly: false,
      token: createTokenOutput.tokenId,
    };
    const accountBalanceAfterMintResult = await getAccountBalance({
      args: accountBalanceAfterMintArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(accountBalanceAfterMintResult.status).toBe(Status.Success);
    const accountBalanceAfterMintOutput: AccountBalanceOutput = JSON.parse(
      accountBalanceAfterMintResult.outputJson!,
    );
    expect(accountBalanceAfterMintOutput.tokenBalances?.length).toBe(1);
    expect(accountBalanceAfterMintOutput.tokenBalances?.at(0)?.tokenId).toBe(
      createTokenOutput.tokenId,
    );
    const balanceAfterMint =
      accountBalanceAfterMintOutput.tokenBalances?.at(0)?.balance;
    expect(balanceAfterMint).toBe('150');
  });
});
