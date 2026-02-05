import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';

import '@/core/utils/json-serialize';

import {
  ECDSA_EVM_ADDRESS,
  ECDSA_HEX_PUBLIC_KEY,
} from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeMirrorMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { ViewAccountOutputSchema } from '@/plugins/account/commands/view';
import { viewAccount } from '@/plugins/account/commands/view/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - view command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns account details when found in state', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock({
      accountInfo: {
        accountId: '0.0.1111',
        balance: { balance: 1000, timestamp: '1234567890.123456789' },
        evmAddress: ECDSA_EVM_ADDRESS,
        accountPublicKey: ECDSA_HEX_PUBLIC_KEY,
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
    });
    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: makeStateMock(),
      alias: {
        ...makeAliasMock(),
        resolve: jest.fn().mockReturnValue({
          alias: 'acc1',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.1111',
        }),
      },
    };
    const args = makeArgs(api, logger, { account: 'acc1' });

    const result = await viewAccount(args);

    expect(logger.info).toHaveBeenCalledWith('Viewing account details: acc1');
    expect(mirrorMock.getAccount).toHaveBeenCalledWith('0.0.1111');

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = validateOutputSchema(
      result.outputJson!,
      ViewAccountOutputSchema,
    );
    expect(output.accountId).toBe('0.0.1111');
    expect(output.balance).toBe('1000');
  });

  test('returns account details when resolved via alias (not in state)', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(null),
    }));

    const mirrorMock = makeMirrorMock({
      accountInfo: {
        accountId: '0.0.2222',
        balance: { balance: 2000, timestamp: '1234567890.123456789' },
        evmAddress: ECDSA_EVM_ADDRESS,
        accountPublicKey: ECDSA_HEX_PUBLIC_KEY,
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
    });
    const alias = makeAliasMock();
    (alias.resolve as jest.Mock).mockReturnValue({
      alias: 'acc2',
      type: 'account',
      network: 'testnet',
      entityId: '0.0.2222',
      createdAt: new Date().toISOString(),
    });
    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: makeStateMock(),
      alias,
    };
    const args = makeArgs(api, logger, { account: 'acc2' });

    const result = await viewAccount(args);

    expect(logger.info).toHaveBeenCalledWith('Viewing account details: acc2');
    expect(mirrorMock.getAccount).toHaveBeenCalledWith('0.0.2222');

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = validateOutputSchema(
      result.outputJson!,
      ViewAccountOutputSchema,
    );
    expect(output.accountId).toBe('0.0.2222');
  });

  test('returns failure when mirror.getAccount throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockResolvedValue(null),
    }));

    const mirrorMock = makeMirrorMock({
      getAccountImpl: jest.fn().mockRejectedValue(new Error('mirror down')),
    });
    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: makeStateMock(),
    };
    const args = makeArgs(api, logger, { account: '0.0.3333' });

    const result = await viewAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to view account');
    expect(result.errorMessage).toContain('mirror down');
  });

  test('returns failure when loadAccount throws', async () => {
    const logger = makeLogger();

    const mirrorMock = makeMirrorMock();
    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      logger,
      state: makeStateMock(),
    };
    const account = 'broken';
    const args = makeArgs(api, logger, { account });

    const result = await viewAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Account not found with ID or alias');
    expect(result.errorMessage).toContain(account);
  });
});
