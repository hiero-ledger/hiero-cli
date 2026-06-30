/**
 * Unit tests for KmsServiceImpl
 * Verifies key creation, import, signer handling, removal, and signing logic
 */
import type {
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { Signer } from '@/core/services/kms/signers/signer.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { AccountId, Client, PrivateKey, PublicKey } from '@hiero-ledger/sdk';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { ConfigurationError, NotFoundError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KmsServiceImpl } from '@/core/services/kms/kms-service';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

import {
  ECDSA_PUBLIC_KEY,
  ED25519_PUBLIC_KEY,
  EXISTING_PUBLIC,
  KR_DELETE,
  KR_EXISTING,
  KR_GENERATED,
  KR_MISSING,
  KR_ONE,
  KR_OPERATOR,
  KR_SIGN,
  KR_SIGN_FLOW,
  KR_TEST,
  LABEL_ACCOUNT_CREATE,
  NEW_PUBLIC,
  NEW_PUBLIC_KEY,
  OPERATOR_PRIVATE_KEY,
  OPERATOR_PUBLIC,
  PK,
  PRIVATE_KEY_RAW,
  PUB_ONE,
  PUBLIC_KEY_OBJ,
  SIGN_FLOW_PUBLIC,
  SIGN_PUBLIC,
  TIMESTAMP_2024,
} from './fixtures';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('0011223344556677', 'hex')),
}));

const createCredentialStorageMock = () => ({
  set: jest.fn(),
  get: jest.fn(),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),
});

let credentialStorageMockInstance = createCredentialStorageMock();

jest.mock('../../credential-storage', () => ({
  CredentialStorage: jest.fn(() => credentialStorageMockInstance),
}));

const localKeyManagerInstances: Array<{
  generateKey: jest.Mock;
  writeSecret: jest.Mock;
  readSecret: jest.Mock;
  createSigner: jest.Mock;
  removeSecret: jest.Mock;
}> = [];
jest.mock('../../key-managers/local-key-manager', () => ({
  LocalKeyManager: jest.fn(() => {
    const instance = {
      generateKey: jest.fn(),
      writeSecret: jest.fn(),
      readSecret: jest.fn(),
      createSigner: jest.fn(),
      removeSecret: jest.fn(),
    };
    localKeyManagerInstances.push(instance);
    return instance;
  }),
}));

jest.mock('../../storage/local-secret-storage', () => ({
  LocalSecretStorage: jest.fn(() => ({})),
}));
jest.mock('../../storage/encrypted-secret-storage', () => ({
  EncryptedSecretStorage: jest.fn(() => ({})),
}));
jest.mock('../../encryption/encryption-service-impl', () => ({
  EncryptionServiceImpl: jest.fn(() => ({})),
}));

const buildClient = () => ({
  setOperator: jest.fn(),
  setMirrorNetwork: jest.fn(),
  setDefaultMaxTransactionFee: jest.fn(),
});

jest.mock('@hiero-ledger/sdk', () => ({
  PrivateKey: {
    fromStringECDSA: jest.fn(() => ({
      publicKey: {
        toStringRaw: jest.fn().mockReturnValue(ECDSA_PUBLIC_KEY),
      },
    })),
    fromStringED25519: jest.fn(() => ({
      publicKey: {
        toStringRaw: jest.fn().mockReturnValue(ED25519_PUBLIC_KEY),
      },
    })),
  },
  PublicKey: {
    fromString: jest.fn(() => ({ key: PUBLIC_KEY_OBJ })),
  },
  AccountId: {
    fromString: jest.fn((id: string) => ({ toString: () => id })),
  },
  Client: {
    forMainnet: jest.fn(() => buildClient()),
    forTestnet: jest.fn(() => buildClient()),
    forPreviewnet: jest.fn(() => buildClient()),
    forNetwork: jest.fn(() => buildClient()),
  },
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
  Hbar: {
    fromTinybars: jest.fn((tinybars: string) => ({ tinybars })),
  },
}));

const getLocalKeyManager = (name: KeyManager = KeyManager.local) => {
  const index = name === KeyManager.local ? 0 : 1;
  return localKeyManagerInstances[index];
};

const setupService = (options?: {
  ed25519Enabled?: boolean;
  defaultMaxTransactionFee?: string;
}) => {
  const logger = makeLogger();
  const state = makeStateMock() as StateService;
  const configService = {
    getOption: jest.fn((name: string) => {
      if (name === (ConfigOptionKey.ed25519_support as string)) {
        return options?.ed25519Enabled ?? false;
      }
      if (name === (ConfigOptionKey.default_max_transaction_fee as string)) {
        return options?.defaultMaxTransactionFee ?? '';
      }
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;
  const networkService = {
    getOperator: jest.fn(),
    getLocalnetConfig: jest.fn(),
  } as unknown as jest.Mocked<NetworkService>;

  const service = new KmsServiceImpl(
    logger,
    state,
    networkService,
    configService,
  );
  return { service, logger, configService, networkService };
};

beforeEach(() => {
  jest.clearAllMocks();
  credentialStorageMockInstance = createCredentialStorageMock();
  localKeyManagerInstances.length = 0;
  (PublicKey.fromString as jest.Mock).mockImplementation(() => ({
    key: PUBLIC_KEY_OBJ,
  }));
  (PrivateKey.fromStringECDSA as jest.Mock).mockImplementation(() => ({
    publicKey: { toStringRaw: jest.fn().mockReturnValue(ECDSA_PUBLIC_KEY) },
  }));
  (PrivateKey.fromStringED25519 as jest.Mock).mockImplementation(() => ({
    publicKey: { toStringRaw: jest.fn().mockReturnValue(ED25519_PUBLIC_KEY) },
  }));
});

describe('KmsServiceImpl', () => {
  it('throws when ed25519 is disabled for createLocalPrivateKey', () => {
    const { service } = setupService({ ed25519Enabled: false });

    expect(() => service.createLocalPrivateKey(KeyAlgorithm.ED25519)).toThrow(
      ConfigurationError,
    );
  });

  it('creates ed25519 key when enabled and persists metadata', () => {
    const { service } = setupService({ ed25519Enabled: true });
    const localManager = getLocalKeyManager(KeyManager.local);
    localManager.generateKey.mockReturnValue(NEW_PUBLIC_KEY);

    const result = service.createLocalPrivateKey(
      KeyAlgorithm.ED25519,
      KeyManager.local,
      [LABEL_ACCOUNT_CREATE],
    );

    expect(localManager.generateKey).toHaveBeenCalledWith(
      KR_GENERATED,
      KeyAlgorithm.ED25519,
    );
    expect(credentialStorageMockInstance.set).toHaveBeenCalledWith(
      KR_GENERATED,
      expect.objectContaining({
        keyManager: KeyManager.local,
        publicKey: NEW_PUBLIC_KEY,
        labels: [LABEL_ACCOUNT_CREATE],
        keyAlgorithm: KeyAlgorithm.ED25519,
      }),
    );
    expect(result).toEqual({
      keyRefId: KR_GENERATED,
      publicKey: NEW_PUBLIC_KEY,
    });
  });

  it('returns existing key when importing duplicate public key', () => {
    const { service, logger } = setupService({ ed25519Enabled: true });
    credentialStorageMockInstance.list.mockReturnValue([
      {
        keyRefId: KR_EXISTING,
        keyManager: KeyManager.local,
        publicKey: EXISTING_PUBLIC,
      },
    ]);
    (PrivateKey.fromStringECDSA as jest.Mock).mockReturnValue({
      publicKey: { toStringRaw: jest.fn().mockReturnValue(EXISTING_PUBLIC) },
    });

    const result = service.importPrivateKey(
      KeyAlgorithm.ECDSA,
      'private-key',
      KeyManager.local,
    );

    expect(logger.debug).toHaveBeenCalledWith(
      `[CRED] Passed key already exists, updating it with new private key, keyRefId: ${KR_EXISTING}`,
    );
    expect(result).toEqual({
      keyRefId: KR_EXISTING,
      publicKey: EXISTING_PUBLIC,
    });
  });

  it('imports new private key and stores secret and metadata', () => {
    const { service } = setupService({ ed25519Enabled: true });
    credentialStorageMockInstance.list.mockReturnValue([]);
    (PrivateKey.fromStringECDSA as jest.Mock).mockReturnValue({
      publicKey: { toStringRaw: jest.fn().mockReturnValue(NEW_PUBLIC) },
    });
    const localManager = getLocalKeyManager(KeyManager.local);

    const result = service.importPrivateKey(
      KeyAlgorithm.ECDSA,
      PRIVATE_KEY_RAW,
      KeyManager.local,
      ['imported'],
    );

    expect(localManager.writeSecret).toHaveBeenCalledWith(
      KR_GENERATED,
      expect.objectContaining({
        keyAlgorithm: KeyAlgorithm.ECDSA,
        privateKey: PRIVATE_KEY_RAW,
      }),
    );
    expect(credentialStorageMockInstance.set).toHaveBeenCalledWith(
      KR_GENERATED,
      expect.objectContaining({
        publicKey: NEW_PUBLIC,
        labels: ['imported'],
        keyAlgorithm: KeyAlgorithm.ECDSA,
      }),
    );
    expect(result).toEqual({
      keyRefId: KR_GENERATED,
      publicKey: NEW_PUBLIC,
    });
  });

  it('getSignerHandle throws when record is missing', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue(undefined);

    expect(() => service.getSignerHandle(KR_MISSING)).toThrow(NotFoundError);
  });

  it('getSignerHandle creates signer using correct manager', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_TEST,
      keyManager: KeyManager.local,
      publicKey: PK,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    const localManager = getLocalKeyManager(KeyManager.local);
    const signer = {
      sign: jest.fn(),
      signWithWallet: jest.fn(),
      getPublicKey: jest.fn(),
    } as unknown as Signer;
    localManager.createSigner.mockReturnValue(signer);

    const result = service.getSignerHandle(KR_TEST);

    expect(localManager.createSigner).toHaveBeenCalledWith(
      KR_TEST,
      PK,
      KeyAlgorithm.ECDSA,
    );
    expect(result).toBe(signer);
  });

  it('remove logs debug when record does not exist', () => {
    const { service, logger } = setupService();
    credentialStorageMockInstance.get.mockReturnValue(undefined);

    service.remove(KR_MISSING);

    expect(logger.debug).toHaveBeenCalledWith(
      `[CRED] KeyRefId not found: ${KR_MISSING}`,
    );
    expect(
      getLocalKeyManager(KeyManager.local).removeSecret,
    ).not.toHaveBeenCalled();
  });

  it('remove deletes secret and metadata when record exists', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_DELETE,
      keyManager: KeyManager.local,
      publicKey: PK,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });

    service.remove(KR_DELETE);

    expect(
      getLocalKeyManager(KeyManager.local).removeSecret,
    ).toHaveBeenCalledWith(KR_DELETE);
    expect(credentialStorageMockInstance.remove).toHaveBeenCalledWith(
      KR_DELETE,
    );
  });

  it('signTransaction delegates to signer handle', async () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_SIGN,
      keyManager: KeyManager.local,
      publicKey: SIGN_PUBLIC,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    const signerHandle = {
      getPublicKey: jest.fn().mockReturnValue(SIGN_PUBLIC),
      sign: jest.fn().mockResolvedValue(new Uint8Array([9])),
      signHashWithEcdsaKey: jest.fn(),
    };
    getLocalKeyManager(KeyManager.local).createSigner.mockReturnValue(
      signerHandle,
    );
    const transaction = {
      signWith: jest.fn(
        async (
          _: unknown,
          signer: (msg: Uint8Array) => Promise<Uint8Array>,
        ) => {
          await signer(new Uint8Array([1]));
        },
      ),
    };

    await service.signTransaction(
      transaction as unknown as HederaTransaction,
      KR_SIGN,
    );

    expect(PublicKey.fromString).toHaveBeenCalledWith(SIGN_PUBLIC);
    expect(transaction.signWith).toHaveBeenCalled();
    expect(signerHandle.sign).toHaveBeenCalledWith(new Uint8Array([1]));
  });

  it('signContractCreateFlow delegates to signer handle', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_SIGN_FLOW,
      keyManager: KeyManager.local,
      publicKey: SIGN_FLOW_PUBLIC,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    const signerHandle = {
      getPublicKey: jest.fn().mockReturnValue(SIGN_FLOW_PUBLIC),
      sign: jest.fn().mockResolvedValue(new Uint8Array([42])),
      signHashWithEcdsaKey: jest.fn(),
    };
    getLocalKeyManager(KeyManager.local).createSigner.mockReturnValue(
      signerHandle,
    );
    const contractCreateFlow = {
      signWith: jest.fn(
        async (
          _: unknown,
          signer: (msg: Uint8Array) => Promise<Uint8Array>,
        ) => {
          await signer(new Uint8Array([7]));
        },
      ),
    };

    service.signContractCreateFlow(
      contractCreateFlow as unknown as ContractCreateFlow,
      KR_SIGN_FLOW,
    );

    expect(PublicKey.fromString).toHaveBeenCalledWith(SIGN_FLOW_PUBLIC);
    expect(contractCreateFlow.signWith).toHaveBeenCalled();
    expect(signerHandle.sign).toHaveBeenCalledWith(new Uint8Array([7]));
  });

  it('createClient builds Hedera client using operator credentials', () => {
    const { service, networkService } = setupService();
    networkService.getOperator.mockReturnValue({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: KR_OPERATOR,
    });
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_OPERATOR,
      keyManager: KeyManager.local,
      publicKey: OPERATOR_PUBLIC,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    getLocalKeyManager(KeyManager.local).readSecret.mockReturnValue({
      privateKey: OPERATOR_PRIVATE_KEY,
    });

    const client = service.createClient(SupportedNetwork.TESTNET);

    expect(networkService.getOperator).toHaveBeenCalledWith(
      SupportedNetwork.TESTNET,
    );
    expect(Client.forTestnet).toHaveBeenCalled();
    expect(AccountId.fromString).toHaveBeenCalledWith(MOCK_ACCOUNT_ID);
    expect(client.setOperator).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.any(Object),
    );
    // No fee configured (default '') => client default fee left untouched.
    expect(client.setDefaultMaxTransactionFee).not.toHaveBeenCalled();
  });

  it('createClient applies the configured default max transaction fee', () => {
    const { service, networkService } = setupService({
      defaultMaxTransactionFee: '20',
    });
    networkService.getOperator.mockReturnValue({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: KR_OPERATOR,
    });
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: KR_OPERATOR,
      keyManager: KeyManager.local,
      publicKey: OPERATOR_PUBLIC,
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    getLocalKeyManager(KeyManager.local).readSecret.mockReturnValue({
      privateKey: OPERATOR_PRIVATE_KEY,
    });

    const client = service.createClient(SupportedNetwork.TESTNET);

    // 20 HBAR => 2_000_000_000 tinybars passed to Hbar.fromTinybars.
    expect(client.setDefaultMaxTransactionFee).toHaveBeenCalledWith({
      tinybars: '2000000000',
    });
  });

  it('list() includes keyAlgorithm for each credential', () => {
    const { service } = setupService();
    credentialStorageMockInstance.list.mockReturnValue([
      {
        keyRefId: KR_ONE,
        keyManager: KeyManager.local,
        publicKey: PUB_ONE,
        labels: [LABEL_ACCOUNT_CREATE],
        keyAlgorithm: KeyAlgorithm.ECDSA,
        createdAt: TIMESTAMP_2024,
        updatedAt: TIMESTAMP_2024,
      },
    ]);

    const result = service.list();

    expect(result).toEqual([
      {
        keyRefId: KR_ONE,
        keyManager: KeyManager.local,
        publicKey: PUB_ONE,
        labels: [LABEL_ACCOUNT_CREATE],
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
    ]);
  });
});
