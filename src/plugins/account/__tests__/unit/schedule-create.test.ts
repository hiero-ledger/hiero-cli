import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TransactionDetailItem } from '@/core/services/mirrornode/types';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { StateError } from '@/core/errors';
import { createMockTransactionDetailsResponse } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create/handler';
import { AccountCreateScheduleStateHook } from '@/plugins/account/hooks/schedule-create/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedZustandHelper = ZustandAccountStateHelper as jest.Mock;

const scheduledDetailItem = (
  entityId: string,
  overrides: Partial<TransactionDetailItem> = {},
): TransactionDetailItem => ({
  transaction_id: '0.0.1@1700000000.000000000',
  consensus_timestamp: '1700000000.000000000',
  valid_start_timestamp: '1700000000.000000000',
  charged_tx_fee: 100000,
  result: 'SUCCESS',
  transaction_hash: 'abc123',
  name: 'CRYPTOCREATEACCOUNT',
  node: '0.0.3',
  scheduled: true,
  entity_id: entityId,
  transfers: [],
  ...overrides,
});

const validNormalizedParams = {
  maxAutoAssociations: 0,
  name: 'saved-name',
  publicKey: '302e020100300506032b657004220420',
  keyRefId: 'kr_test',
  keyType: KeyAlgorithm.ED25519,
  network: SupportedNetwork.TESTNET,
};

const innerTxId = '0.0.7900086@1775577354.363164462';
const expectedDashId = '0.0.7900086-1775577354-363164462';

describe('AccountCreateScheduleStateHook', () => {
  let hook: AccountCreateScheduleStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new AccountCreateScheduleStateHook();
    MockedZustandHelper.mockImplementation(() => ({
      saveAccount: jest.fn(),
    }));
  });

  test('returns success when command is not account_create', async () => {
    const logger = makeLogger();
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: 'token_create',
          transactionId: innerTxId,
          normalizedParams: {},
        },
      },
    });

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(MockedZustandHelper).not.toHaveBeenCalled();
  });

  test('warns and does not save when normalizedParams fail schema parse', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn();
    const api = {
      mirror: { getTransactionRecord },
      logger,
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: ACCOUNT_CREATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: { invalid: true },
        },
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('parsing data schema'),
    );
    expect(result.result).toEqual({ message: 'success' });
    expect(getTransactionRecord).not.toHaveBeenCalled();
  });

  test('warns when transactionId is missing', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn();
    const api = {
      mirror: { getTransactionRecord },
      logger,
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: ACCOUNT_CREATE_COMMAND_NAME,
          transactionId: '',
          normalizedParams: validNormalizedParams,
        },
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'No transaction ID found for scheduled transaction',
    );
    expect(result.result).toEqual({ message: 'success' });
    expect(getTransactionRecord).not.toHaveBeenCalled();
  });

  test('throws StateError when scheduled transaction has no entity_id', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [
          scheduledDetailItem(MOCK_ACCOUNT_ID, { entity_id: undefined }),
        ],
      }),
    );
    const api = {
      mirror: { getTransactionRecord },
      receipt: {
        getReceipt: jest.fn(),
      },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    await expect(
      hook.customHandlerHook(args, {
        customHandlerParams: {
          scheduledData: {
            name: 'sched',
            executed: true,
            success: true,
            command: ACCOUNT_CREATE_COMMAND_NAME,
            transactionId: innerTxId,
            normalizedParams: validNormalizedParams,
          },
        },
      }),
    ).rejects.toThrow(StateError);

    expect(getTransactionRecord).toHaveBeenCalledWith(expectedDashId);
  });

  test('throws StateError when no scheduled row exists in mirror response', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [
          scheduledDetailItem(MOCK_ACCOUNT_ID, { scheduled: false }),
        ],
      }),
    );
    const api = {
      mirror: { getTransactionRecord },
      receipt: { getReceipt: jest.fn() },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    await expect(
      hook.customHandlerHook(args, {
        customHandlerParams: {
          scheduledData: {
            name: 'sched',
            executed: true,
            success: true,
            command: ACCOUNT_CREATE_COMMAND_NAME,
            transactionId: innerTxId,
            normalizedParams: validNormalizedParams,
          },
        },
      }),
    ).rejects.toThrow(/Could not resolve account ID/);
  });

  test('saves account and registers alias when alias is set', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedZustandHelper.mockImplementation(() => ({
      saveAccount: saveAccountMock,
    }));

    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem(MOCK_ACCOUNT_ID)],
      }),
    );
    const register = jest.fn();
    const getReceipt = jest.fn().mockResolvedValue({
      transactionId: innerTxId,
      success: true,
      receipt: {},
      consensusTimestamp: '1700000000.000000000',
    });

    const api = {
      mirror: { getTransactionRecord },
      receipt: { getReceipt },
      alias: {
        register,
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        resolveOrThrow: jest.fn(),
        clear: jest.fn(),
      },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const paramsWithAlias = {
      ...validNormalizedParams,
      alias: 'my-alias',
    };

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: ACCOUNT_CREATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: paramsWithAlias,
        },
      },
    });

    expect(result.breakFlow).toBe(false);
    expect(getTransactionRecord).toHaveBeenCalledWith(expectedDashId);
    expect(getReceipt).toHaveBeenCalledWith({ transactionId: innerTxId });
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'my-alias',
        entityId: MOCK_ACCOUNT_ID,
        publicKey: paramsWithAlias.publicKey,
        keyRefId: paramsWithAlias.keyRefId,
      }),
    );
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID}`,
      expect.objectContaining({
        accountId: MOCK_ACCOUNT_ID,
        name: paramsWithAlias.name,
        publicKey: paramsWithAlias.publicKey,
        keyRefId: paramsWithAlias.keyRefId,
        network: SupportedNetwork.TESTNET,
      }),
    );
  });

  test('saves account without alias.register when alias omitted', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedZustandHelper.mockImplementation(() => ({
      saveAccount: saveAccountMock,
    }));

    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem(MOCK_ACCOUNT_ID)],
      }),
    );
    const register = jest.fn();
    const api = {
      mirror: { getTransactionRecord },
      receipt: {
        getReceipt: jest.fn().mockResolvedValue({
          transactionId: innerTxId,
          success: true,
          receipt: {},
          consensusTimestamp: '1700000000.000000000',
        }),
      },
      alias: {
        register,
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        resolveOrThrow: jest.fn(),
        clear: jest.fn(),
      },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: ACCOUNT_CREATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validNormalizedParams,
        },
      },
    });

    expect(register).not.toHaveBeenCalled();
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID}`,
      expect.objectContaining({
        accountId: MOCK_ACCOUNT_ID,
      }),
    );
  });
});
