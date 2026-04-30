import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { AccountNftInfo } from '@/core/services/mirrornode/types';

import '@/core/utils/json-serialize';

import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeMirrorMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError, StateError } from '@/core/errors';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { AliasType } from '@/core/types/shared.types';
import { AccountBalanceOutputSchema } from '@/plugins/account/commands/balance';
import { accountBalance } from '@/plugins/account/commands/balance/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - balance command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns specific token balance only when token flag is set for tokenId', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 100000n,
      tokenBalances: [{ token_id: '0.0.7777', balance: 500 }],
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'token-account',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1234',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'token-account',
      token: '0.0.7777',
    });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(mirrorMock.getAccountOrThrow).not.toHaveBeenCalled();
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.1234',
      '0.0.7777',
    );

    expect(output.accountId).toBe('0.0.1234');
    expect(output.hbarBalance).toBeUndefined();
    expect(output.tokenOnly).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.7777',
      balance: 500n,
    });
    expect(output.tokenBalances![0].name).toBeDefined();
    expect(output.tokenBalances![0].symbol).toBeDefined();
    expect(output.tokenBalances![0].balanceDisplay).toBeDefined();
  });

  test('returns specific token balance only when token flag is set with alias present in state', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 100000n,
      tokenBalances: [{ token_id: '0.0.7777', balance: 500 }],
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest
          .fn()
          .mockReturnValueOnce({
            alias: 'token-account',
            type: AliasType.Account,
            network: 'testnet',
            entityId: '0.0.1234',
          })
          .mockReturnValueOnce({
            alias: 'token-alias',
            type: AliasType.Token,
            network: 'testnet',
            entityId: '0.0.7777',
          }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'token-account',
      token: 'token-alias',
    });

    const result = await accountBalance(args);

    expect(mirrorMock.getAccountOrThrow).not.toHaveBeenCalled();
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.1234',
      '0.0.7777',
    );
    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.1234');
    expect(output.hbarBalance).toBeUndefined();
    expect(output.tokenOnly).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.7777',
      balance: 500n,
    });
    expect(output.tokenBalances![0].name).toBeDefined();
    expect(output.tokenBalances![0].symbol).toBeDefined();
    expect(output.tokenBalances![0].balanceDisplay).toBeDefined();
  });

  test('returns HBAR balance only when hbar-only flag is set', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({ hbarBalance: 123456n });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-account',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1001',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-account',
      hbarOnly: true,
    });

    const result = await accountBalance(args);

    expect(mirrorMock.getAccountOrThrow).toHaveBeenCalledWith('0.0.1001');
    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.1001');
    expect(output.hbarBalance).toBe(123456n);
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.hbarOnly).toBe(true);
    expect(output.tokenBalances).toBeUndefined();
  });

  test('returns HBAR and token balances', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 5000n,
      tokenBalances: [
        { token_id: '0.0.3003', balance: 100 },
        { token_id: '0.0.4004', balance: 200 },
      ],
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc2',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc2' });

    const result = await accountBalance(args);

    expect(mirrorMock.getAccountOrThrow).toHaveBeenCalledWith('0.0.2002');
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.2002',
      undefined,
    );
    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe(5000n);
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toHaveLength(2);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      balance: 100n,
    });
    expect(output.tokenBalances![0].name).toBeDefined();
    expect(output.tokenBalances![0].symbol).toBeDefined();
    expect(output.tokenBalances![1]).toMatchObject({
      tokenId: '0.0.4004',
      balance: 200n,
    });
    expect(output.tokenBalances![1].name).toBeDefined();
    expect(output.tokenBalances![1].symbol).toBeDefined();
    expect(output.tokenBalances![1].balanceDisplay).toBeDefined();
  });

  test('returns HBAR balance when resolved via alias (not in state)', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(null),
    }));

    const mirrorMock = makeMirrorMock({ hbarBalance: 999n });

    const alias = makeAliasMock();
    (alias.resolve as jest.Mock).mockReturnValue({
      alias: 'acc777',
      type: AliasType.Account,
      network: 'testnet',
      entityId: '0.0.7777',
      createdAt: new Date().toISOString(),
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias,
    };
    const args = makeArgs(api, logger, { account: 'acc777' });

    const result = await accountBalance(args);

    expect(mirrorMock.getAccountOrThrow).toHaveBeenCalledWith('0.0.7777');
    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.7777');
    expect(output.hbarBalance).toBe(999n);
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toBeUndefined();
  });

  test('returns HBAR balance without token balances when none found', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({ hbarBalance: 42n, tokenBalances: [] });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc3',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.5005',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc3' });

    const result = await accountBalance(args);

    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.5005');
    expect(output.hbarBalance).toBe(42n);
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toBeUndefined();
  });

  test('throws error when token balances fetch fails', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 77n,
      tokenError: new Error('mirror error'),
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc4',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.6006',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc4' });

    await expect(accountBalance(args)).rejects.toThrow();
  });

  test('throws NotFoundError when account not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockImplementation(() => {
        throw new StateError('state failure');
      }),
    }));

    const mirrorMock: Pick<HederaMirrornodeService, 'getAccountOrThrow'> = {
      getAccountOrThrow: jest.fn(),
    };

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
    };
    const account = 'broken';
    const args = makeArgs(api, logger, { account });

    await expect(accountBalance(args)).rejects.toThrow(NotFoundError);
  });

  test('throws error when mirror service fails', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({ hbarBalance: 100n });
    mirrorMock.getAccountOrThrow = jest.fn().mockImplementation(() => {
      throw new InternalError('Mirror service error');
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1111',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
      hbarOnly: true,
    });

    await expect(accountBalance(args)).rejects.toThrow();
  });

  test('returns display units by default', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 100000000n,
      tokenBalances: [{ token_id: '0.0.3003', balance: 100000000 }],
      tokenInfo: {
        '0.0.3003': {
          name: 'Test Token',
          symbol: 'TEST',
          decimals: '8',
        },
      },
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
    });

    const result = await accountBalance(args);

    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe(100000000n);
    expect(output.hbarBalanceDisplay).toBe('1');
    expect(output.raw).toBe(false);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      name: 'Test Token',
      symbol: 'TEST',
      balance: 100000000n,
      balanceDisplay: '1',
    });
  });

  test('returns NFT balances grouped by collection', async () => {
    const logger = makeLogger();
    const nfts: AccountNftInfo[] = [
      {
        token_id: '0.0.9000',
        serial_number: 1,
        account_id: '0.0.1234',
        deleted: false,
      },
      {
        token_id: '0.0.9000',
        serial_number: 2,
        account_id: '0.0.1234',
        deleted: false,
      },
      {
        token_id: '0.0.9001',
        serial_number: 5,
        account_id: '0.0.1234',
        deleted: false,
      },
    ];

    const mirrorMock = makeMirrorMock({ hbarBalance: 1000n, nfts });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-nft',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1234',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc-nft' });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.nftBalances).toBeDefined();
    expect(output.nftBalances!.totalCount).toBe(3);
    expect(output.nftBalances!.truncated).toBe(false);
    expect(output.nftBalances!.collections).toHaveLength(2);

    const col9000 = output.nftBalances!.collections.find(
      (c) => c.tokenId === '0.0.9000',
    );
    expect(col9000).toBeDefined();
    expect(col9000!.serialNumbers).toEqual(expect.arrayContaining([1, 2]));
    expect(col9000!.count).toBe(2);

    const col9001 = output.nftBalances!.collections.find(
      (c) => c.tokenId === '0.0.9001',
    );
    expect(col9001).toBeDefined();
    expect(col9001!.serialNumbers).toEqual([5]);
    expect(col9001!.count).toBe(1);
  });

  test('filters NFTs from fungible token balances', async () => {
    const logger = makeLogger();
    const mirrorMock = makeMirrorMock({
      hbarBalance: 1000n,
      tokenBalances: [
        { token_id: '0.0.3003', balance: 100 },
        { token_id: '0.0.9000', balance: 2 },
      ],
      tokenInfo: {
        '0.0.3003': { name: 'Fungible', symbol: 'FNG', decimals: '6' },
        '0.0.9000': {
          name: 'NFT Collection',
          symbol: 'NFT',
          decimals: '0',
          type: MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE,
        },
      },
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-mixed',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.5005',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc-mixed' });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0].tokenId).toBe('0.0.3003');
  });

  test('filters NFTs to specific collection when --token flag is set to NFT collection', async () => {
    const logger = makeLogger();
    const nfts: AccountNftInfo[] = [
      {
        token_id: '0.0.9000',
        serial_number: 1,
        account_id: '0.0.1234',
        deleted: false,
      },
      {
        token_id: '0.0.9001',
        serial_number: 5,
        account_id: '0.0.1234',
        deleted: false,
      },
    ];

    const mirrorMock = makeMirrorMock({ hbarBalance: 1000n, nfts });
    mirrorMock.getAccountNfts = jest.fn().mockResolvedValue({
      nfts,
      links: { next: null },
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-nft',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1234',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'acc-nft',
      token: '0.0.9000',
    });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.nftBalances).toBeDefined();
    expect(output.nftBalances!.collections).toHaveLength(1);
    expect(output.nftBalances!.collections[0].tokenId).toBe('0.0.9000');
  });

  test('returns undefined nftBalances when account has no NFTs', async () => {
    const logger = makeLogger();
    const mirrorMock = makeMirrorMock({ hbarBalance: 100n, nfts: [] });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-empty',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1001',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc-empty' });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.nftBalances).toBeUndefined();
  });

  test('nftBalances is undefined when --hbarOnly flag is set', async () => {
    const logger = makeLogger();
    const mirrorMock = makeMirrorMock({ hbarBalance: 500n });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-hbar',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1001',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc-hbar', hbarOnly: true });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.nftBalances).toBeUndefined();
    expect(mirrorMock.getAccountNfts).not.toHaveBeenCalled();
  });

  test('marks truncated as true when mirror node has more NFTs', async () => {
    const logger = makeLogger();
    const nfts: AccountNftInfo[] = [
      {
        token_id: '0.0.9000',
        serial_number: 1,
        account_id: '0.0.1234',
        deleted: false,
      },
    ];
    const mirrorMock = makeMirrorMock({ hbarBalance: 100n });
    mirrorMock.getAccountNfts = jest.fn().mockResolvedValue({
      nfts,
      links: { next: '/api/v1/accounts/0.0.1234/nfts?limit=100&cursor=next' },
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc-many',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.1234',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc-many' });

    const result = await accountBalance(args);
    const output = assertOutput(result.result, AccountBalanceOutputSchema);

    expect(output.nftBalances!.truncated).toBe(true);
  });

  test('returns raw units when raw flag is set', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 100000000n,
      tokenBalances: [{ token_id: '0.0.3003', balance: 100000000 }],
      tokenInfo: {
        '0.0.3003': {
          name: 'Test Token',
          symbol: 'TEST',
          decimals: '8',
        },
      },
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: AliasType.Account,
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
      raw: true,
    });

    const result = await accountBalance(args);

    const output = assertOutput(result.result, AccountBalanceOutputSchema);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe(100000000n);
    expect(output.hbarBalanceDisplay).toBeUndefined();
    expect(output.raw).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      name: 'Test Token',
      symbol: 'TEST',
      balance: 100000000n,
    });
    expect(output.tokenBalances![0].balanceDisplay).toBeUndefined();
  });
});
