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
} from '../../../../../__tests__/helpers/plugin';
import { AliasService } from 'core';
import '../../../../core/utils/json-serialize';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - balance command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns HBAR balance only when only-hbar flag is set', async () => {
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
      'only-hbar': true,
    });

    const result = await getAccountBalance(args);

    expect(mirrorMock.getAccountHBarBalance).toHaveBeenCalledWith('0.0.1001');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.1001');
    expect(output.hbarBalance).toBe('123456');
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
    expect(mirrorMock.getAccountTokenBalances).toHaveBeenCalledWith('0.0.2002');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: AccountBalanceOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.2002');
    expect(output.hbarBalance).toBe('5000');
    expect(output.tokenBalances).toHaveLength(2);
    expect(output.tokenBalances![0]).toEqual({
      tokenId: '0.0.3003',
      balance: '100',
    });
    expect(output.tokenBalances![1]).toEqual({
      tokenId: '0.0.4004',
      balance: '200',
    });
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
});
