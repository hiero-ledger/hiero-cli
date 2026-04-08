import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TransactionDetailItem } from '@/core/services/mirrornode/types';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { createMockTransactionDetailsResponse } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  MirrorTransactionResult,
  SupportedNetwork,
} from '@/core/types/shared.types';
import {
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { AccountUpdateScheduleStateHook } from '@/plugins/account/hooks/schedule-update/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedZustandHelper = ZustandAccountStateHelper as jest.Mock;

const scheduledDetailItem = (
  overrides: Partial<TransactionDetailItem> = {},
): TransactionDetailItem => ({
  transaction_id: '0.0.1@1700000000.000000000',
  consensus_timestamp: '1700000000.000000000',
  valid_start_timestamp: '1700000000.000000000',
  charged_tx_fee: 100000,
  result: MirrorTransactionResult.SUCCESS,
  transaction_hash: 'abc123',
  name: 'CRYPTOUPDATEACCOUNT',
  node: '0.0.3',
  scheduled: true,
  entity_id: MOCK_ACCOUNT_ID,
  transfers: [],
  ...overrides,
});

const validUpdateParamsWithKeys = {
  accountId: MOCK_ACCOUNT_ID,
  network: SupportedNetwork.TESTNET,
  accountStateKey: `testnet:${MOCK_ACCOUNT_ID}`,
  newPublicKey: 'new-pub-key',
  newKeyRefId: 'kr_new',
  newKeyType: KeyAlgorithm.ECDSA,
};

const innerTxId = '0.0.7900086@1775577354.363164462';
const expectedDashId = '0.0.7900086-1775577354-363164462';

const existingAccountData = {
  name: 'test-account',
  accountId: MOCK_ACCOUNT_ID,
  type: KeyAlgorithm.ED25519,
  publicKey: 'old-pk',
  evmAddress: '0x0000000000000000000000000000000000000000',
  keyRefId: 'kr_old',
  network: SupportedNetwork.TESTNET,
};

describe('AccountUpdateScheduleStateHook', () => {
  let hook: AccountUpdateScheduleStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new AccountUpdateScheduleStateHook();
    MockedZustandHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: jest.fn(),
    }));
  });

  test('returns success when command is not account_update', async () => {
    const logger = makeLogger();
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: 'account_create',
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(MockedZustandHelper).not.toHaveBeenCalled();
  });

  test('warns and does not call mirror when normalizedParams fail schema parse', async () => {
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: { invalid: true },
        },
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('parsing account update data schema'),
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: '',
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'No transaction ID found for scheduled transaction',
    );
    expect(result.result).toEqual({ message: 'success' });
    expect(getTransactionRecord).not.toHaveBeenCalled();
  });

  test('returns error result and logs when mirror scheduled result is not SUCCESS', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [
          scheduledDetailItem({ result: 'INVALID_SIGNATURE', scheduled: true }),
        ],
      }),
    );
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(getTransactionRecord).toHaveBeenCalledWith(expectedDashId);
    expect(result.result).toEqual({ message: 'error' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Scheduled transaction result is not SUCCESS'),
    );
  });

  test('returns error result when no scheduled row in mirror response', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem({ scheduled: false })],
      }),
    );
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(result.result).toEqual({ message: 'error' });
    expect(logger.error).toHaveBeenCalled();
  });

  test('returns error result when entity_id does not match accountId', async () => {
    const logger = makeLogger();
    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [
          scheduledDetailItem({ entity_id: '0.0.1111', result: 'SUCCESS' }),
        ],
      }),
    );
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(result.result).toEqual({ message: 'error' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Account ID mismatch'),
    );
  });

  test('returns success without saving when new key fields are absent', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedZustandHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: saveAccountMock,
    }));

    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem()],
      }),
    );
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: {
            accountId: MOCK_ACCOUNT_ID,
            network: SupportedNetwork.TESTNET,
            accountStateKey: `testnet:${MOCK_ACCOUNT_ID}`,
          },
        },
      },
    });

    expect(result.result).toEqual({ message: 'success' });
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  test('warns and skips save when account not found in state', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedZustandHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(null),
      saveAccount: saveAccountMock,
    }));

    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem()],
      }),
    );
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
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(result.result).toEqual({ message: 'success' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found in state after scheduled execution'),
    );
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  test('updates account state and refreshes aliases for matching records', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedZustandHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: saveAccountMock,
    }));

    const getTransactionRecord = jest.fn().mockResolvedValue(
      createMockTransactionDetailsResponse({
        transactions: [scheduledDetailItem()],
      }),
    );
    const remove = jest.fn();
    const register = jest.fn();
    const aliasRec = {
      alias: 'my-alias',
      type: AliasType.Account,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_ACCOUNT_ID,
      publicKey: 'old',
      keyRefId: 'kr_old',
    };
    const api = {
      mirror: { getTransactionRecord },
      logger,
      alias: {
        list: jest.fn().mockReturnValue([aliasRec]),
        remove,
        register,
        resolveOrThrow: jest.fn(),
        clear: jest.fn(),
      },
      state: {},
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const result = await hook.customHandlerHook(args, {
      customHandlerParams: {
        scheduledData: {
          name: 'sched',
          executed: true,
          success: true,
          command: ACCOUNT_UPDATE_COMMAND_NAME,
          transactionId: innerTxId,
          normalizedParams: validUpdateParamsWithKeys,
        },
      },
    });

    expect(result.result).toEqual({ message: 'success' });
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID}`,
      expect.objectContaining({
        keyRefId: validUpdateParamsWithKeys.newKeyRefId,
        publicKey: validUpdateParamsWithKeys.newPublicKey,
        type: validUpdateParamsWithKeys.newKeyType,
      }),
    );
    expect(remove).toHaveBeenCalledWith('my-alias', SupportedNetwork.TESTNET);
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: validUpdateParamsWithKeys.newPublicKey,
        keyRefId: validUpdateParamsWithKeys.newKeyRefId,
      }),
    );
  });
});
