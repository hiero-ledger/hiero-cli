import { getAccountBalance } from '../../commands/balance/handler';
import type { AccountBalanceOutput } from '../../commands/balance';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import type { HederaMirrornodeService } from '../../../../core/services/mirrornode/hedera-mirrornode-service.interface';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
  makeMirrorMock,
  makeAliasMock,
} from '../../../../__tests__/mocks/mocks';
import type { AliasService } from '../../../../core/services/alias/alias-service.interface';
import '../../../../core/utils/json-serialize';

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
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'token-account',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.1234',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'token-account',
      token: '0.0.7777',
    });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).not.toHaveBeenCalled();
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.1234',
      '0.0.7777',
    );
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.1234');
    expect(output.hbarBalance).toBeUndefined();
    expect(output.tokenOnly).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.7777',
      balance: '500',
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
      state: {} as any,
      alias: {
        resolve: jest
          .fn()
          .mockReturnValueOnce({
            alias: 'token-account',
            type: 'account',
            network: 'testnet',
            entityId: '0.0.1234',
          })
          .mockReturnValueOnce({
            alias: 'token-alias',
            type: 'token',
            network: 'testnet',
            entityId: '0.0.7777',
          }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'token-account',
      token: 'token-alias',
    });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).not.toHaveBeenCalled();
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.1234',
      '0.0.7777',
    );
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.1234');
    expect(output.hbarBalance).toBeUndefined();
    expect(output.tokenOnly).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.7777',
      balance: '500',
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
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-account',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.1001',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-account',
      hbarOnly: true,
    });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).toHaveBeenCalledWith('0.0.1001');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.1001');
    expect(output.hbarBalance).toBe('123456');
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
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc2',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc2' });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).toHaveBeenCalledWith('0.0.2002');
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith(
      '0.0.2002',
      undefined,
    );
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe('5000');
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toHaveLength(2);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      balance: '100',
    });
    expect(output.tokenBalances![0].name).toBeDefined();
    expect(output.tokenBalances![0].symbol).toBeDefined();
    expect(output.tokenBalances![1]).toMatchObject({
      tokenId: '0.0.4004',
      balance: '200',
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
      type: 'account',
      network: 'testnet',
      entityId: '0.0.7777',
      createdAt: new Date().toISOString(),
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: {} as any,
      alias,
    };
    const args = makeArgs(api, logger, { account: 'acc777' });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).toHaveBeenCalledWith('0.0.7777');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.7777');
    expect(output.hbarBalance).toBe('999');
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toBeUndefined();
  });

  test('returns HBAR balance without token balances when none found', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({ hbarBalance: 42n, tokenBalances: [] });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc3',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.5005',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc3' });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.5005');
    expect(output.hbarBalance).toBe('42');
    expect(output.hbarBalanceDisplay).toBeDefined();
    expect(output.tokenBalances).toBeUndefined();
  });

  test('returns failure when token balances fetch fails', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      hbarBalance: 77n,
      tokenError: new Error('mirror error'),
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'acc4',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.6006',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, { account: 'acc4' });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Could not fetch token balances');
    expect(result.errorMessage).toContain('mirror error');
  });

  test('returns failure when main try-catch fails', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockImplementation(() => {
        throw new Error('state failure');
      }),
    }));

    const mirrorMock: Pick<HederaMirrornodeService, 'getAccountHBarBalance'> = {
      getAccountHBarBalance: jest.fn(),
    };

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: {} as any,
    };
    const account = 'broken';
    const args = makeArgs(api, logger, { account });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      'Account not found with ID or alias:',
    );
    expect(result.errorMessage).toContain(account);
  });

  test('returns failure when both hbar-only and token flags are used', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({ hbarBalance: 100n });
    mirrorMock.getAccountHBarBalance = jest.fn().mockImplementation(() => {
      throw new Error('Mirror service error');
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.1111',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
      hbarOnly: true,
    });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
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
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
    });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe('100000000');
    expect(output.hbarBalanceDisplay).toBe('1');
    expect(output.raw).toBe(false);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      name: 'Test Token',
      symbol: 'TEST',
      balance: '100000000',
      balanceDisplay: '1',
    });
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
      state: {} as any,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'test-acc',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.2002',
        }),
      } as unknown as AliasService,
    };
    const args = makeArgs(api, logger, {
      account: 'test-acc',
      raw: true,
    });

    const result = await getAccountBalance(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe('100000000');
    expect(output.hbarBalanceDisplay).toBeUndefined();
    expect(output.raw).toBe(true);
    expect(output.tokenBalances).toHaveLength(1);
    expect(output.tokenBalances![0]).toMatchObject({
      tokenId: '0.0.3003',
      name: 'Test Token',
      symbol: 'TEST',
      balance: '100000000',
    });
    expect(output.tokenBalances![0].balanceDisplay).toBeUndefined();
  });
});
