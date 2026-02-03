import { makeArgs } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { HederaTokenType, Status } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import {
  listTokens,
  type ListTokensOutput,
  ListTokensOutputSchema,
  type TokenListItem,
} from '@/plugins/token/commands/list';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeTokenData,
  makeTokenStats,
  mockListTokens,
  mockTokenStats,
} from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  setupZustandHelperMock,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const NETWORK_TESTNET = SupportedNetwork.TESTNET;
const NETWORK_MAINNET = SupportedNetwork.MAINNET;

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
    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(0);
    expect(output.totalCount).toBe(0);
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
    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(2);
    expect(output.totalCount).toBe(2);
    expect(output.tokens[0].name).toBe('Token 1');
    expect(output.tokens[0].symbol).toBe('TK1');
    expect(output.tokens[0].tokenId).toBe('0.0.1111');

    // Verify stats contain withKeys count
    expect(output.stats?.withKeys).toBe(2);
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

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(1);
    expect(output.totalCount).toBe(1);
    expect(output.tokens[0].name).toBe('Token 3');
    expect(output.tokens[0].symbol).toBe('TK3');
    expect(output.tokens[0].tokenId).toBe('0.0.3333');

    // Verify stats contain withKeys count
    expect(output.stats?.withKeys).toBe(1);

    // Verify keys are included in output when showKeys is true
    expect(output.tokens[0].keys).toBeDefined();
    expect(output.tokens[0].keys?.adminKey).toBe('admin-key-123');
  });

  test('lists tokens from all networks', async () => {
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

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(2);
    expect(output.totalCount).toBe(2);

    const testnetToken = output.tokens.find(
      (t: TokenListItem) => t.network === NETWORK_TESTNET,
    );
    const mainnetToken = output.tokens.find(
      (t: TokenListItem) => t.network === NETWORK_MAINNET,
    );

    expect(testnetToken).toBeDefined();
    expect(testnetToken!.name).toBe('Testnet Token');
    expect(testnetToken!.symbol).toBe('TST');
    expect(testnetToken!.tokenId).toBe('0.0.4444');
    expect(testnetToken!.network).toBe('testnet');

    expect(mainnetToken).toBeDefined();
    expect(mainnetToken!.name).toBe('Mainnet Token');
    expect(mainnetToken!.symbol).toBe('MNT');
    expect(mainnetToken!.tokenId).toBe('0.0.5555');
    expect(mainnetToken!.network).toBe('mainnet');
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
        bySupplyType: { [SupplyType.INFINITE]: 1 },
      }),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'my-token',
          type: 'token',
          network: 'testnet',
          entityId: '0.0.1111',
        }),
      },
    });
    const args = makeArgs(api, logger, {});

    const result = await listTokens(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
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

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
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

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(1);
    expect(output.tokens[0].supplyType).toBe(SupplyType.FINITE);
    expect(output.tokens[0].name).toBe('Finite Token');
    expect(output.tokens[0].symbol).toBe('FNT');
  });

  test('displays token type for fungible and non-fungible tokens', async () => {
    const logger = makeLogger();
    setupZustandHelperMock(MockedHelper, {
      tokens: [
        makeTokenData({
          tokenId: '0.0.1111',
          name: 'Fungible Token',
          symbol: 'FT',
          network: 'testnet',
          tokenType: HederaTokenType.FUNGIBLE_COMMON,
        }),
        makeTokenData({
          tokenId: '0.0.2222',
          name: 'Non-Fungible Token',
          symbol: 'NFT',
          network: 'testnet',
          decimals: 0,
          tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
        }),
      ],
      stats: makeTokenStats({
        total: 2,
        byNetwork: { testnet: 2 },
        bySupplyType: { [SupplyType.INFINITE]: 2 },
        withKeys: 2,
      }),
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

    const output = validateOutputSchema<ListTokensOutput>(
      result.outputJson!,
      ListTokensOutputSchema,
    );
    expect(output.tokens).toHaveLength(2);

    const fungibleToken = output.tokens.find((t) => t.tokenId === '0.0.1111');
    expect(fungibleToken).toBeDefined();
    expect(fungibleToken!.tokenType).toBe(HederaTokenType.FUNGIBLE_COMMON);
    expect(fungibleToken!.name).toBe('Fungible Token');

    const nftToken = output.tokens.find((t) => t.tokenId === '0.0.2222');
    expect(nftToken).toBeDefined();
    expect(nftToken!.tokenType).toBe(HederaTokenType.NON_FUNGIBLE_TOKEN);
    expect(nftToken!.name).toBe('Non-Fungible Token');
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
