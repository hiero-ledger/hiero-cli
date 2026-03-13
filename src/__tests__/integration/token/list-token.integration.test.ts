import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { ListTokensOutput } from '@/plugins/token/commands/list';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { SupplyType } from '@/core/types/shared.types';
import { tokenCreateFt, tokenList } from '@/plugins/token';

describe('List Token Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a token and check it with list', async () => {
    const createTokenArgs: Record<string, unknown> = {
      tokenName: 'Test Token List',
      symbol: 'TTL',
      initialSupply: '10',
      supplyType: SupplyType.INFINITE,
      name: 'test-token-list',
    };
    const createTokenResult = await tokenCreateFt({
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
    expect(createTokenOutput.initialSupply).toBe('10');
    expect(createTokenOutput.name).toBe('Test Token List');
    expect(createTokenOutput.alias).toBe('test-token-list');
    expect(createTokenOutput.treasuryId).toBe(process.env.OPERATOR_ID);
    expect(createTokenOutput.symbol).toBe('TTL');
    expect(createTokenOutput.supplyType).toBe(SupplyType.INFINITE);

    const listTokenArgs: Record<string, unknown> = {
      keys: true,
    };
    const listTokenResult = await tokenList({
      args: listTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listTokenOutput = listTokenResult.result as ListTokensOutput;
    const tokenNames = listTokenOutput.tokens.map((token) => token.tokenId);
    expect(tokenNames).toContain(createTokenOutput.tokenId);
  });
});
