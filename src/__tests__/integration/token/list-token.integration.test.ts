import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import { Status } from '../../../core/shared/constants';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import '../../../core/utils/json-serialize';
import { createToken, listTokens } from '../../../plugins/token';
import { CreateTokenOutput } from '../../../plugins/token/commands/create';
import { ListTokensOutput } from '../../../plugins/token/commands/list';

describe('List Token Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    await setDefaultOperatorForNetwork(coreApi);
  });
  it('should create a token and check it with list', async () => {
    const createTokenArgs: Record<string, unknown> = {
      tokenName: 'Test Token List',
      symbol: 'TTL',
      initialSupply: '10',
      supplyType: 'INFINITE',
      name: 'test-token-list',
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
    expect(createTokenOutput.network).toBe('testnet');
    expect(createTokenOutput.decimals).toBe(0);
    expect(createTokenOutput.initialSupply).toBe('10');
    expect(createTokenOutput.name).toBe('Test Token List');
    expect(createTokenOutput.alias).toBe('test-token-list');
    expect(createTokenOutput.treasuryId).toBe(process.env.OPERATOR_ID);
    expect(createTokenOutput.symbol).toBe('TTL');
    expect(createTokenOutput.supplyType).toBe('INFINITE');

    const listTokenArgs: Record<string, unknown> = {
      keys: true,
      network: 'testnet',
    };
    const listTokenResult = await listTokens({
      args: listTokenArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(listTokenResult.status).toBe(Status.Success);
    const listTokenOutput: ListTokensOutput = JSON.parse(
      listTokenResult.outputJson!,
    );
    expect(listTokenOutput.network).toBe('testnet');
    const tokenNames = listTokenOutput.tokens.map((token) => token.tokenId);
    expect(tokenNames).toContain(createTokenOutput.tokenId);
  });
});
