import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { ImportTokenOutput } from '@/plugins/token/commands/import';
import type { ListTokensOutput } from '@/plugins/token/commands/list';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { SupplyType } from '@/core/types/shared.types';
import {
  createToken,
  deleteToken,
  importToken,
  listTokens,
} from '@/plugins/token';
import { TOKEN_NAMESPACE } from '@/plugins/token/manifest';

describe('Import Token Integration Tests', () => {
  const TOKEN_NAME = 'TokenImport';

  let coreApi: CoreApi;
  let network: SupportedNetwork;
  let tokenId: string;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();

    const createTokenArgs: Record<string, unknown> = {
      tokenName: TOKEN_NAME,
      symbol: 'TIMP',
      initialSupply: '10',
      supplyType: SupplyType.INFINITE,
      name: `token-import-${Date.now()}`,
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
    tokenId = createTokenOutput.tokenId;
    coreApi.state.delete(
      TOKEN_NAMESPACE,
      `${coreApi.network.getCurrentNetwork()}:${tokenId}`,
    );

    await delay(5000);
  });

  afterEach(async () => {
    const deleteTokenArgs: Record<string, unknown> = {
      token: tokenId,
    };
    await deleteToken({
      args: deleteTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
  });

  it('should import a token by ID and verify with list', async () => {
    const importTokenArgs: Record<string, unknown> = {
      token: tokenId,
    };
    const importTokenResult = await importToken({
      args: importTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const importTokenOutput = importTokenResult.result as ImportTokenOutput;
    expect(importTokenOutput.tokenId).toBe(tokenId);
    expect(importTokenOutput.name).toBe(TOKEN_NAME);
    expect(importTokenOutput.network).toBe(network);
    expect(importTokenOutput.alias).toBeUndefined();

    const listTokenArgs: Record<string, unknown> = {};
    const listTokenResult = await listTokens({
      args: listTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listTokenOutput = listTokenResult.result as ListTokensOutput;
    const token = listTokenOutput.tokens.find((t) => t.tokenId === tokenId);
    expect(token).not.toBeNull();
    expect(token?.tokenId).toBe(tokenId);
    expect(token?.network).toBe(network);
  });

  it('should import a token with alias and verify with list', async () => {
    const alias = `imported-token-${Date.now()}`;
    const importTokenArgs: Record<string, unknown> = {
      token: tokenId,
      name: alias,
    };
    const importTokenResult = await importToken({
      args: importTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const importTokenOutput = importTokenResult.result as ImportTokenOutput;
    expect(importTokenOutput.tokenId).toBe(tokenId);
    expect(importTokenOutput.name).toBe(TOKEN_NAME);
    expect(importTokenOutput.alias).toBe(alias);
    expect(importTokenOutput.network).toBe(network);

    const listTokenArgs: Record<string, unknown> = {};
    const listTokenResult = await listTokens({
      args: listTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listTokenOutput = listTokenResult.result as ListTokensOutput;
    const token = listTokenOutput.tokens.find((t) => t.tokenId === tokenId);
    expect(token).not.toBeNull();
    expect(token?.name).toBe(TOKEN_NAME);
  });
});
