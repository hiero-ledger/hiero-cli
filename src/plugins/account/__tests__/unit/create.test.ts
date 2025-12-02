import '../../../../core/utils/json-serialize';
import { createAccount } from '../../commands/create/handler';
import type { CreateAccountOutput } from '../../commands/create';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import { Status, KeyAlgorithm } from '../../../../core/shared/constants';
import { makeLogger, makeArgs } from '../../../../__tests__/mocks/mocks';
import { makeApiMocksForAccountCreate } from './helpers/mocks';
import '../../../../core/utils/json-serialize';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

const MOCK_ECDSA_PUBLIC_KEY =
  '026e876ad28d7d8f79013ed83272b9bc89162d657f6cd912ef047e651407144c1c';
const MOCK_ED25519_PUBLIC_KEY =
  '4cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';
const MOCK_ECDSA_EVM_ADDRESS = '0xee48e473011fb564a4afbd19bc9db9ab46187c11';

describe('account plugin - create command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates account successfully (happy path)', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, signing, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockResolvedValue({
          transaction: {},
          publicKey: MOCK_ECDSA_PUBLIC_KEY,
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-123',
          success: true,
          accountId: '0.0.9999',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      account,
      txExecution: signing,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '5000',
      autoAssociations: 3,
      name: 'myAccount',
    });

    const result = await createAccount(args);

    expect(kms.createLocalPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      'local',
      ['account:create', 'account:myAccount'],
    );
    expect(account.createAccount).toHaveBeenCalledWith({
      balanceRaw: 500000000000n,
      maxAutoAssociations: 3,
      publicKey: 'pub-key-test',
      keyType: KeyAlgorithm.ECDSA,
    });
    expect(signing.signAndExecute).toHaveBeenCalled();
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'myAccount',
        type: 'account',
        network: 'testnet',
        entityId: '0.0.9999',
        publicKey: 'pub-key-test',
        keyRefId: 'kr_test123',
      }),
    );
    expect(saveAccountMock).toHaveBeenCalledWith(
      'myAccount',
      expect.objectContaining({
        name: 'myAccount',
        accountId: '0.0.9999',
        type: KeyAlgorithm.ECDSA,
        network: 'testnet',
        keyRefId: 'kr_test123',
        evmAddress: MOCK_ECDSA_EVM_ADDRESS,
      }),
    );

    // Verify ADR-003 result
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: CreateAccountOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.9999');
    expect(output.name).toBe('myAccount');
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.network).toBe('testnet');
    expect(output.transactionId).toBe('tx-123');
    expect(output.evmAddress).toBe(MOCK_ECDSA_EVM_ADDRESS);
    expect(output.publicKey).toBe(MOCK_ECDSA_PUBLIC_KEY);
  });

  test('returns failure when signAndExecute returns failure', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveAccount: jest.fn() }));

    const { account, signing, networkMock, kms, mirror, alias } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockResolvedValue({
          transaction: {},
          privateKey: 'priv',
          publicKey: MOCK_ECDSA_PUBLIC_KEY,
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-123',
          success: false,
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      account,
      txExecution: signing,
      network: networkMock,
      kms,
      mirror: mirror as any,
      alias,
      logger,
    };

    const args = makeArgs(api, logger, { name: 'failAccount', balance: '100' });

    const result = await createAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe('Failed to create account');
  });

  test('returns failure when createAccount throws', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveAccount: jest.fn() }));

    const { account, signing, networkMock, kms, mirror, alias } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest
          .fn()
          .mockRejectedValue(new Error('network error')),
      });

    const api: Partial<CoreApi> = {
      account,
      txExecution: signing,
      network: networkMock,
      kms,
      mirror: mirror as any,
      alias,
      logger,
    };

    const args = makeArgs(api, logger, {
      name: 'errorAccount',
      balance: '100',
    });

    const result = await createAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to create account');
  });

  test('creates account with ECDSA key type', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, signing, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockResolvedValue({
          transaction: {},
          publicKey: MOCK_ECDSA_PUBLIC_KEY,
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-ecdsa',
          success: true,
          accountId: '0.0.8888',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      account,
      txExecution: signing,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '1000',
      'key-type': KeyAlgorithm.ECDSA,
      name: 'ecdsaAccount',
    });

    const result = await createAccount(args);

    expect(kms.createLocalPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      'local',
      ['account:create', 'account:ecdsaAccount'],
    );
    expect(account.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        keyType: KeyAlgorithm.ECDSA,
      }),
    );

    expect(result.status).toBe(Status.Success);
    const output: CreateAccountOutput = JSON.parse(result.outputJson!);
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.evmAddress).toBe(MOCK_ECDSA_EVM_ADDRESS);
    expect(output.publicKey).toBe(MOCK_ECDSA_PUBLIC_KEY);
  });

  test('creates account with ED25519 key type', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, signing, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockResolvedValue({
          transaction: {},
          publicKey: MOCK_ED25519_PUBLIC_KEY,
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-ed25519',
          success: true,
          accountId: '0.0.7777',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      account,
      txExecution: signing,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '1000',
      keyType: KeyAlgorithm.ED25519,
      name: 'ed25519Account',
    });

    const result = await createAccount(args);

    expect(kms.createLocalPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ED25519,
      'local',
      ['account:create', 'account:ed25519Account'],
    );
    expect(account.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        keyType: KeyAlgorithm.ED25519,
      }),
    );

    expect(result.status).toBe(Status.Success);
    const output: CreateAccountOutput = JSON.parse(result.outputJson!);
    expect(output.type).toBe(KeyAlgorithm.ED25519);
    expect(output.evmAddress).toBe(
      '0x0000000000000000000000000000000000001e61',
    );
    expect(output.publicKey).toBe(MOCK_ED25519_PUBLIC_KEY);
  });
});
