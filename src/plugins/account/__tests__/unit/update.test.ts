import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';

import '@/core/utils/json-serialize';

import {
  ECDSA_HEX_PUBLIC_KEY,
  MOCK_ACCOUNT_ID,
} from '@/__tests__/mocks/fixtures';
import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { AccountUpdateOutputSchema } from '@/plugins/account/commands/update';
import { accountUpdate } from '@/plugins/account/commands/update/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import {
  mockAccountData,
  mockAliasRecords,
  mockTransactionResults,
} from './helpers/fixtures';
import {
  makeAccountData,
  makeAccountTransactionServiceMock,
  makeAliasServiceMock,
  makeArgs,
  makeLogger,
  makeNetworkServiceMock,
  makeTxExecuteServiceMock,
  makeTxSignServiceMock,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

const NEW_KEY_REF_ID = 'kr_new123';
const EXISTING_KEY_REF_ID = mockAccountData.default.keyRefId;

const makeKmsMock = (hasPrivateKey = true) => ({
  hasPrivateKey: jest.fn().mockReturnValue(hasPrivateKey),
  get: jest.fn().mockReturnValue({ keyAlgorithm: KeyAlgorithm.ECDSA }),
});

const makeKeyResolverMock = (
  keyRefId = NEW_KEY_REF_ID,
  publicKey = ECDSA_HEX_PUBLIC_KEY,
) => ({
  getPublicKey: jest.fn().mockResolvedValue({ keyRefId, publicKey }),
});

const buildApi = (overrides: Partial<CoreApi> = {}): Partial<CoreApi> => ({
  account: makeAccountTransactionServiceMock({
    updateAccount: jest.fn().mockReturnValue({ transaction: {} }),
  }),
  txSign: makeTxSignServiceMock(),
  txExecute: makeTxExecuteServiceMock({
    execute: jest.fn().mockResolvedValue(mockTransactionResults.success),
  }),
  network: makeNetworkServiceMock(SupportedNetwork.TESTNET),
  alias: makeAliasServiceMock(),
  kms: makeKmsMock() as unknown as KmsService,
  keyResolver: makeKeyResolverMock() as unknown as KeyResolverService,
  config: makeConfigMock(),
  state: makeStateMock(),
  ...overrides,
});

describe('account plugin - update command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates account memo successfully by account ID', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: saveAccountMock,
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const executeMock = jest
      .fn()
      .mockResolvedValue(mockTransactionResults.success);
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
      txExecute: makeTxExecuteServiceMock({ execute: executeMock }),
    });

    const result = await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, memo: 'new memo' }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: MOCK_ACCOUNT_ID, memo: 'new memo' }),
    );
    expect(executeMock).toHaveBeenCalled();
    const output = assertOutput(result.result, AccountUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
  });

  test('updates account by alias', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow = jest
      .fn()
      .mockReturnValue({ alias: 'myAlias', entityId: MOCK_ACCOUNT_ID });

    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
      alias,
    });

    await accountUpdate(
      makeArgs(api, logger, { account: 'myAlias', memo: 'updated' }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: MOCK_ACCOUNT_ID }),
    );
  });

  test('throws NotFoundError when account not in state', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(null),
      saveAccount: jest.fn(),
    }));

    const api = buildApi();

    await expect(
      accountUpdate(
        makeArgs(api, logger, { account: '0.0.9999', memo: 'test' }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  test('throws TransactionError when execute returns success: false', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const api = buildApi({
      txExecute: makeTxExecuteServiceMock({
        execute: jest
          .fn()
          .mockResolvedValue({ success: false, transactionId: 'tx123' }),
      }),
    });

    await expect(
      accountUpdate(
        makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, memo: 'test' }),
      ),
    ).rejects.toThrow(TransactionError);
  });

  test('throws ZodError when no update field provided', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(null),
      saveAccount: jest.fn(),
    }));

    const api = buildApi();

    await expect(
      accountUpdate(makeArgs(api, logger, { account: MOCK_ACCOUNT_ID })),
    ).rejects.toThrow();
  });

  test('throws ZodError when both staked-account-id and staked-node-id provided', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(null),
      saveAccount: jest.fn(),
    }));

    const api = buildApi();

    await expect(
      accountUpdate(
        makeArgs(api, logger, {
          account: MOCK_ACCOUNT_ID,
          stakedAccountId: '0.0.5',
          stakedNodeId: 3,
        }),
      ),
    ).rejects.toThrow();
  });

  test('clears memo when "null" string passed', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
    });

    const result = await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, memo: 'null' }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: MOCK_ACCOUNT_ID, memo: null }),
    );
    const output = assertOutput(result.result, AccountUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
  });

  test('clears memo when empty string passed', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
    });

    await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, memo: '' }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ memo: null }),
    );
  });

  test('clears stakedAccountId when "null" string passed', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
    });

    await accountUpdate(
      makeArgs(api, logger, {
        account: MOCK_ACCOUNT_ID,
        stakedAccountId: 'null',
      }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ stakedAccountId: null }),
    );
  });

  test('clears stakedNodeId when "null" string passed', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
    });

    await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, stakedNodeId: 'null' }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ stakedNodeId: null }),
    );
  });

  test('allows clearing both staking fields simultaneously', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const updateAccountMock = jest.fn().mockReturnValue({ transaction: {} });
    const api = buildApi({
      account: makeAccountTransactionServiceMock({
        updateAccount: updateAccountMock,
      }),
    });

    const result = await accountUpdate(
      makeArgs(api, logger, {
        account: MOCK_ACCOUNT_ID,
        stakedAccountId: 'null',
        stakedNodeId: 'null',
      }),
    );

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ stakedAccountId: null, stakedNodeId: null }),
    );
    const output = assertOutput(result.result, AccountUpdateOutputSchema);
    expect(output.updatedFields).toContain('stakedAccountId');
    expect(output.updatedFields).toContain('stakedNodeId');
  });

  test('key rotation — signs with both old and new key', async () => {
    const logger = makeLogger();
    const account = makeAccountData({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: EXISTING_KEY_REF_ID,
    });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const signMock = jest.fn().mockResolvedValue({});
    const api = buildApi({
      txSign: makeTxSignServiceMock({ sign: signMock }),
      txExecute: makeTxExecuteServiceMock({
        execute: jest.fn().mockResolvedValue(mockTransactionResults.success),
      }),
    });

    await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, key: NEW_KEY_REF_ID }),
    );

    expect(signMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([EXISTING_KEY_REF_ID, NEW_KEY_REF_ID]),
    );
  });

  test('key rotation — updates state and aliases after success', async () => {
    const logger = makeLogger();
    const account = makeAccountData({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: EXISTING_KEY_REF_ID,
    });
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: saveAccountMock,
    }));

    const aliasRecord = {
      ...mockAliasRecords.accountTestnet,
      entityId: MOCK_ACCOUNT_ID,
    };
    const alias = makeAliasServiceMock();
    alias.list = jest.fn().mockReturnValue([aliasRecord]);

    const api = buildApi({ alias });

    await accountUpdate(
      makeArgs(api, logger, { account: MOCK_ACCOUNT_ID, key: NEW_KEY_REF_ID }),
    );

    expect(saveAccountMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        keyRefId: NEW_KEY_REF_ID,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    );
    expect(alias.remove).toHaveBeenCalledWith(
      aliasRecord.alias,
      SupportedNetwork.TESTNET,
    );
    expect(alias.register).toHaveBeenCalled();
  });

  test('key rotation — throws ValidationError when new key has no private key', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const api = buildApi({
      kms: makeKmsMock(false) as unknown as KmsService,
    });

    await expect(
      accountUpdate(
        makeArgs(api, logger, {
          account: MOCK_ACCOUNT_ID,
          key: NEW_KEY_REF_ID,
        }),
      ),
    ).rejects.toThrow(ValidationError);
  });

  test('output schema valid — updatedFields tracks all changed fields', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ accountId: MOCK_ACCOUNT_ID });
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      saveAccount: jest.fn(),
    }));

    const api = buildApi();

    const result = await accountUpdate(
      makeArgs(api, logger, {
        account: MOCK_ACCOUNT_ID,
        memo: 'x',
        maxAutoAssociations: 5,
        declineStakingReward: true,
      }),
    );

    const output = assertOutput(result.result, AccountUpdateOutputSchema);
    expect(output.updatedFields).toEqual(
      expect.arrayContaining([
        'memo',
        'maxAutoAssociations',
        'declineStakingReward',
      ]),
    );
    expect(output.updatedFields).toHaveLength(3);
  });
});
