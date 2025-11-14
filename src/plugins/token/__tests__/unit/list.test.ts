import { listTokens } from '../../commands/list';
import type { ListTokensOutput } from '../../commands/list';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeApiMocks,
  setupZustandHelperMock,
} from './helpers/mocks';
import {
  makeTokenData,
  makeTokenStats,
  mockListTokens,
  mockTokenStats,
} from './helpers/fixtures';
import { makeArgs } from '../../../../core/shared/__tests__/helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('token plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs message when no tokens exist', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.empty,
      stats: mockTokenStats.empty,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    // ADR-003 compliance: check CommandExecutionResult
    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    // Parse and verify output JSON
    const output = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(0);
    expect(output.count).toBe(0);
    expect(output.network).toBe('testnet');
  });

  test('lists tokens without keys', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.twoTokens,
      stats: mockTokenStats.twoTokens,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    // ADR-003 compliance: check CommandExecutionResult
    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    // Parse and verify output JSON
    const output = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(2);
    expect(output.count).toBe(2);
    expect(output.network).toBe('testnet');
    expect(output.tokens[0].name).toBe('Token 1');
    expect(output.tokens[0].symbol).toBe('TK1');
    expect(output.tokens[0].tokenId).toBe('0.0.1111');
  });

  test('lists tokens with keys when flag is set', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.withKeys,
      stats: mockTokenStats.withKeys,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, { keys: true });

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(1);
    expect(output.count).toBe(1);
    expect(output.tokens[0].name).toBe('Token 3');
    expect(output.tokens[0].symbol).toBe('TK3');
    expect(output.tokens[0].tokenId).toBe('0.0.3333');
    expect(output.tokens[0].keys).toBeDefined();
    expect(output.tokens[0].keys?.adminKey).toBe('admin-key-123');
    expect(output.tokens[0].keys?.supplyKey).toBe('supply-key-123');
  });

  test('filters tokens by current network', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.multiNetwork,
      stats: mockTokenStats.multiNetwork,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(1);
    expect(output.count).toBe(1);
    expect(output.network).toBe('testnet');
    expect(output.tokens[0].name).toBe('Testnet Token');
    expect(output.tokens[0].symbol).toBe('TST');
    expect(output.tokens[0].tokenId).toBe('0.0.4444');
    expect(output.tokens[0].network).toBe('testnet');
  });

  test('filters tokens by specified network', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.multiNetwork,
      stats: mockTokenStats.multiNetwork,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, { network: 'mainnet' });

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(1);
    expect(output.count).toBe(1);
    expect(output.network).toBe('mainnet');
    expect(output.tokens[0].name).toBe('Mainnet Token');
    expect(output.tokens[0].symbol).toBe('MNT');
    expect(output.tokens[0].tokenId).toBe('0.0.5555');
    expect(output.tokens[0].network).toBe('mainnet');
  });

  test('returns empty list when no tokens match network filter', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: [
        makeTokenData({
          tokenId: '0.0.5555',
          name: 'Testnet Token',
          symbol: 'TST',
          network: 'testnet',
        }),
      ],
      stats: makeTokenStats({
        total: 1,
        byNetwork: { testnet: 1 },
        bySupplyType: { INFINITE: 1 },
      }),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, { network: 'mainnet' });

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(0);
    expect(output.count).toBe(0);
    expect(output.network).toBe('mainnet');
  });

  test('displays token aliases when available', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: [
        makeTokenData({
          tokenId: '0.0.1111',
          name: 'My Token',
          symbol: 'MTK',
          network: 'testnet',
        }),
      ],
      stats: makeTokenStats({
        total: 1,
        byNetwork: { testnet: 1 },
        bySupplyType: { INFINITE: 1 },
      }),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([
          {
            alias: 'my-token',
            type: 'token',
            network: 'testnet',
            entityId: '0.0.1111',
          },
        ]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(1);
    expect(output.tokens[0].alias).toBe('my-token');
    expect(output.tokens[0].name).toBe('My Token');
    expect(output.tokens[0].symbol).toBe('MTK');
    expect(output.tokens[0].tokenId).toBe('0.0.1111');
  });

  test('displays statistics correctly', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.withAssociations,
      stats: mockTokenStats.withAssociations,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.stats).toBeDefined();
    expect(output.stats?.total).toBe(2);
    expect(output.stats?.bySupplyType).toEqual({
      INFINITE: 1,
      FINITE: 1,
    });
    expect(output.stats?.withAssociations).toBe(1);
    expect(output.stats?.totalAssociations).toBe(1);
  });

  test('displays max supply for FINITE tokens', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: mockListTokens.finiteSupply,
      stats: mockTokenStats.finiteSupply,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: ListTokensOutput = JSON.parse(result.outputJson!);
    expect(output.tokens).toHaveLength(1);
    expect(output.tokens[0].supplyType).toBe('FINITE');
    expect(output.tokens[0].name).toBe('Finite Token');
    expect(output.tokens[0].symbol).toBe('FNT');
  });

  test('logs error and exits when listTokens throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTokens: jest.fn().mockImplementation(() => {
        throw new Error('database error');
      }),
    }));

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    // ADR-003 compliance: check CommandExecutionResult
    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to list tokens');
    expect(result.outputJson).toBeUndefined();
  });
});
