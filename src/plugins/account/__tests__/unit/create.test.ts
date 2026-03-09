import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';

import '@/core/utils/json-serialize';

import {
  ACCOUNT_ID_EVM_ADDRESS_8888,
  ACCOUNT_ID_EVM_ADDRESS_9999,
  ECDSA_HEX_PRIVATE_KEY,
  ECDSA_HEX_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
} from '@/__tests__/mocks/fixtures';
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError, SupportedNetwork } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { CreateAccountOutputSchema } from '@/plugins/account/commands/create';
import { createAccount } from '@/plugins/account/commands/create/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { makeApiMocksForAccountCreate } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - create command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates account successfully (happy path)', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, txSign, txExecute, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockReturnValue({
          transaction: {},
          publicKey: ECDSA_HEX_PUBLIC_KEY,
        }),
        executeBytesImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.1234@1234567890.000000000',
          success: true,
          accountId: '0.0.9999',
          receipt: { status: { status: 'success' } },
        } as Partial<TransactionResult>),
      });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
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
    });
    expect(txExecute.executeBytes).toHaveBeenCalled();
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'myAccount',
        type: AliasType.Account,
        network: 'testnet',
        entityId: '0.0.9999',
        publicKey: 'pub-key-test',
        keyRefId: 'kr_test123',
      }),
    );
    expect(saveAccountMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.9999`,
      expect.objectContaining({
        name: 'myAccount',
        accountId: '0.0.9999',
        type: KeyAlgorithm.ECDSA,
        network: 'testnet',
        keyRefId: 'kr_test123',
        evmAddress: ACCOUNT_ID_EVM_ADDRESS_9999,
      }),
    );

    // Verify ADR-003 result
    const output = assertOutput(result.result, CreateAccountOutputSchema);
    expect(output.accountId).toBe('0.0.9999');
    expect(output.name).toBe('myAccount');
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.network).toBe('testnet');
    expect(output.transactionId).toBe('0.0.1234@1234567890.000000000');
    expect(output.evmAddress).toBe(ACCOUNT_ID_EVM_ADDRESS_9999);
    expect(output.publicKey).toBe(ECDSA_HEX_PUBLIC_KEY);
  });

  test('returns failure when executeBytes returns failure', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveAccount: jest.fn() }));

    const { account, txSign, txExecute, networkMock, kms, mirror, alias } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockReturnValue({
          transaction: {},
          publicKey: ECDSA_HEX_PUBLIC_KEY,
        }),
        executeBytesImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.1234@1234567890.000000000',
          success: false,
          receipt: { status: { status: 'failed' } },
        } as Partial<TransactionResult>),
      });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      mirror: mirror as HederaMirrornodeService,
      alias,
      logger,
    };

    const args = makeArgs(api, logger, { name: 'failAccount', balance: '100' });

    await expect(createAccount(args)).rejects.toThrow();
  });

  test('throws error when createAccount fails', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveAccount: jest.fn() }));

    const { account, txSign, txExecute, networkMock, kms, mirror, alias } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockImplementation(() => {
          throw new NetworkError('network error');
        }),
      });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      mirror: mirror as HederaMirrornodeService,
      alias,
      logger,
    };

    const args = makeArgs(api, logger, {
      name: 'errorAccount',
      balance: '100',
    });

    await expect(createAccount(args)).rejects.toThrow();
  });

  test('creates account with ECDSA key type', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, txSign, txExecute, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockReturnValue({
          transaction: {},
          publicKey: ECDSA_HEX_PUBLIC_KEY,
        }),
        executeBytesImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.1234@1234567890.000000002',
          success: true,
          accountId: '0.0.8888',
          receipt: { status: { status: 'success' } },
        } as Partial<TransactionResult>),
      });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
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
        publicKey: 'pub-key-test',
      }),
    );

    const output = assertOutput(result.result, CreateAccountOutputSchema);
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.evmAddress).toBe(ACCOUNT_ID_EVM_ADDRESS_8888);
    expect(output.publicKey).toBe(ECDSA_HEX_PUBLIC_KEY);
  });

  test('creates account with provided private key (--key ecdsa:private:xxx)', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const {
      account,
      txSign,
      txExecute,
      networkMock,
      kms,
      alias,
      mirror,
      keyResolver,
    } = makeApiMocksForAccountCreate({
      createAccountImpl: jest.fn().mockReturnValue({
        transaction: {},
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
      executeBytesImpl: jest.fn().mockResolvedValue({
        transactionId: '0.0.1234@1234567890.000000004',
        success: true,
        accountId: '0.0.6666',
        receipt: { status: { status: 'success' } },
      }),
      keyResolverGetPublicKeyImpl: jest.fn().mockResolvedValue({
        keyRefId: 'kr_provided123',
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    });

    kms.get = jest.fn().mockReturnValue({
      keyRefId: 'kr_provided123',
      publicKey: ECDSA_HEX_PUBLIC_KEY,
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      labels: [],
      createdAt: '',
      updatedAt: '',
    });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
      keyResolver: keyResolver as KeyResolverService,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '1000',
      key: `ecdsa:private:${ECDSA_HEX_PRIVATE_KEY}`,
    });

    const result = await createAccount(args);

    expect(kms.createLocalPrivateKey).not.toHaveBeenCalled();
    expect(keyResolver.getPublicKey).toHaveBeenCalled();
    expect(account.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    );

    const output = assertOutput(result.result, CreateAccountOutputSchema);
    expect(output.accountId).toBe('0.0.6666');
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.publicKey).toBe(ECDSA_HEX_PUBLIC_KEY);
  });

  test('creates account with key reference (--key kr_xxx)', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const {
      account,
      txSign,
      txExecute,
      networkMock,
      kms,
      alias,
      mirror,
      keyResolver,
    } = makeApiMocksForAccountCreate({
      createAccountImpl: jest.fn().mockReturnValue({
        transaction: {},
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
      executeBytesImpl: jest.fn().mockResolvedValue({
        transactionId: '0.0.1234@1234567890.000000005',
        success: true,
        accountId: '0.0.5555',
        receipt: { status: { status: 'success' } },
      }),
      keyResolverGetPublicKeyImpl: jest.fn().mockResolvedValue({
        keyRefId: 'kr_test123',
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    });

    kms.get = jest.fn().mockReturnValue({
      keyRefId: 'kr_test123',
      publicKey: ECDSA_HEX_PUBLIC_KEY,
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      labels: [],
      createdAt: '',
      updatedAt: '',
    });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
      keyResolver: keyResolver as KeyResolverService,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '1000',
      key: 'kr_test123',
    });

    const result = await createAccount(args);

    expect(kms.createLocalPrivateKey).not.toHaveBeenCalled();
    expect(keyResolver.getPublicKey).toHaveBeenCalled();
    expect(account.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    );

    const output = assertOutput(result.result, CreateAccountOutputSchema);
    expect(output.accountId).toBe('0.0.5555');
  });

  test('throws ValidationError when both --key and --key-type are provided', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveAccount: jest.fn() }));

    const {
      account,
      txSign,
      txExecute,
      networkMock,
      kms,
      alias,
      mirror,
      keyResolver,
    } = makeApiMocksForAccountCreate({});

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
      keyResolver: keyResolver as KeyResolverService,
      logger,
    };

    const args = makeArgs(api, logger, {
      balance: '1000',
      key: `ecdsa:private:${ECDSA_HEX_PRIVATE_KEY}`,
      keyType: KeyAlgorithm.ECDSA,
    });

    await expect(createAccount(args)).rejects.toThrow();
  });

  test('creates account with ED25519 key type', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const { account, txSign, txExecute, networkMock, kms, alias, mirror } =
      makeApiMocksForAccountCreate({
        createAccountImpl: jest.fn().mockReturnValue({
          transaction: {},
          publicKey: ED25519_HEX_PUBLIC_KEY,
        }),
        executeBytesImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.1234@1234567890.000000003',
          success: true,
          accountId: '0.0.7777',
          receipt: { status: { status: 'success' } },
        } as Partial<TransactionResult>),
      });

    const api: Partial<CoreApi> = {
      account,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias,
      mirror: mirror as HederaMirrornodeService,
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
        publicKey: 'pub-key-test',
      }),
    );

    const output = assertOutput(result.result, CreateAccountOutputSchema);
    expect(output.type).toBe(KeyAlgorithm.ED25519);
    expect(output.evmAddress).toBe(
      '0x0000000000000000000000000000000000001e61',
    );
    expect(output.publicKey).toBe(ED25519_HEX_PUBLIC_KEY);
  });
});
