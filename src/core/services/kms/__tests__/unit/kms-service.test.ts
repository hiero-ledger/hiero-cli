/**
 * Unit tests for KmsServiceImpl
 * Verifies key creation, import, signer handling, removal, and signing logic
 */
import type { Transaction as HederaTransaction } from '@hashgraph/sdk';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { Signer } from '@/core/services/kms/signers/signer.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { AccountId, Client, PrivateKey, PublicKey } from '@hashgraph/sdk';

import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { KmsServiceImpl } from '@/core/services/kms/kms-service';
import { KEY_MANAGERS } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

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
});

jest.mock('@hashgraph/sdk', () => ({
  PrivateKey: {
    fromStringECDSA: jest.fn(() => ({
      publicKey: { toStringRaw: jest.fn().mockReturnValue('ecdsa-public-key') },
    })),
    fromStringED25519: jest.fn(() => ({
      publicKey: {
        toStringRaw: jest.fn().mockReturnValue('ed25519-public-key'),
      },
    })),
  },
  PublicKey: {
    fromString: jest.fn(() => ({ key: 'public-key-obj' })),
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
}));

const getLocalKeyManager = (name: KeyManagerName = KEY_MANAGERS.local) => {
  const index = name === KEY_MANAGERS.local ? 0 : 1;
  return localKeyManagerInstances[index];
};

const setupService = (options?: { ed25519Enabled?: boolean }) => {
  const logger = makeLogger();
  const state = makeStateMock() as StateService;
  const configService = {
    getOption: jest.fn((name: string) => {
      if (name === 'ed25519_support_enabled') {
        return options?.ed25519Enabled ?? false;
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
    key: 'public-key-obj',
  }));
  (PrivateKey.fromStringECDSA as jest.Mock).mockImplementation(() => ({
    publicKey: { toStringRaw: jest.fn().mockReturnValue('ecdsa-public-key') },
  }));
  (PrivateKey.fromStringED25519 as jest.Mock).mockImplementation(() => ({
    publicKey: { toStringRaw: jest.fn().mockReturnValue('ed25519-public-key') },
  }));
});

describe('KmsServiceImpl', () => {
  it('throws when ed25519 is disabled for createLocalPrivateKey', () => {
    const { service } = setupService({ ed25519Enabled: false });

    expect(() => service.createLocalPrivateKey(KeyAlgorithm.ED25519)).toThrow(
      'ED25519 key type is not enabled. Please enable it by setting the config option ed25519_support_enabled to true.',
    );
  });

  it('creates ed25519 key when enabled and persists metadata', () => {
    const { service } = setupService({ ed25519Enabled: true });
    const localManager = getLocalKeyManager(KEY_MANAGERS.local);
    localManager.generateKey.mockReturnValue('new-public-key');

    const result = service.createLocalPrivateKey(
      KeyAlgorithm.ED25519,
      KEY_MANAGERS.local,
      ['account:create'],
    );

    expect(localManager.generateKey).toHaveBeenCalledWith(
      'kr_0011223344556677',
      KeyAlgorithm.ED25519,
    );
    expect(credentialStorageMockInstance.set).toHaveBeenCalledWith(
      'kr_0011223344556677',
      expect.objectContaining({
        keyManager: KEY_MANAGERS.local,
        publicKey: 'new-public-key',
        labels: ['account:create'],
        keyAlgorithm: KeyAlgorithm.ED25519,
      }),
    );
    expect(result).toEqual({
      keyRefId: 'kr_0011223344556677',
      publicKey: 'new-public-key',
    });
  });

  it('returns existing key when importing duplicate public key', () => {
    const { service, logger } = setupService({ ed25519Enabled: true });
    credentialStorageMockInstance.list.mockReturnValue([
      {
        keyRefId: 'kr_existing',
        keyManager: KEY_MANAGERS.local,
        publicKey: 'existing-public',
      },
    ]);
    (PrivateKey.fromStringECDSA as jest.Mock).mockReturnValue({
      publicKey: { toStringRaw: jest.fn().mockReturnValue('existing-public') },
    });

    const result = service.importPrivateKey(
      KeyAlgorithm.ECDSA,
      'private-key',
      KEY_MANAGERS.local,
    );

    expect(logger.debug).toHaveBeenCalledWith(
      '[CRED] Passed key already exists, keyRefId: kr_existing',
    );
    expect(result).toEqual({
      keyRefId: 'kr_existing',
      publicKey: 'existing-public',
    });
    expect(
      getLocalKeyManager(KEY_MANAGERS.local).writeSecret,
    ).not.toHaveBeenCalled();
  });

  it('imports new private key and stores secret and metadata', () => {
    const { service } = setupService({ ed25519Enabled: true });
    credentialStorageMockInstance.list.mockReturnValue([]);
    (PrivateKey.fromStringECDSA as jest.Mock).mockReturnValue({
      publicKey: { toStringRaw: jest.fn().mockReturnValue('new-public') },
    });
    const localManager = getLocalKeyManager(KEY_MANAGERS.local);

    const result = service.importPrivateKey(
      KeyAlgorithm.ECDSA,
      'private-key-raw',
      KEY_MANAGERS.local,
      ['imported'],
    );

    expect(localManager.writeSecret).toHaveBeenCalledWith(
      'kr_0011223344556677',
      expect.objectContaining({
        keyAlgorithm: KeyAlgorithm.ECDSA,
        privateKey: 'private-key-raw',
      }),
    );
    expect(credentialStorageMockInstance.set).toHaveBeenCalledWith(
      'kr_0011223344556677',
      expect.objectContaining({
        publicKey: 'new-public',
        labels: ['imported'],
        keyAlgorithm: KeyAlgorithm.ECDSA,
      }),
    );
    expect(result).toEqual({
      keyRefId: 'kr_0011223344556677',
      publicKey: 'new-public',
    });
  });

  it('getSignerHandle throws when record is missing', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue(undefined);

    expect(() => service.getSignerHandle('kr_missing')).toThrow(
      'Credential not found: kr_missing',
    );
  });

  it('getSignerHandle creates signer using correct manager', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: 'kr_test',
      keyManager: KEY_MANAGERS.local,
      publicKey: 'pk',
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    const localManager = getLocalKeyManager(KEY_MANAGERS.local);
    const signer = {
      sign: jest.fn(),
      getPublicKey: jest.fn(),
    } as unknown as Signer;
    localManager.createSigner.mockReturnValue(signer);

    const result = service.getSignerHandle('kr_test');

    expect(localManager.createSigner).toHaveBeenCalledWith(
      'kr_test',
      'pk',
      KeyAlgorithm.ECDSA,
    );
    expect(result).toBe(signer);
  });

  it('remove logs debug when record does not exist', () => {
    const { service, logger } = setupService();
    credentialStorageMockInstance.get.mockReturnValue(undefined);

    service.remove('kr_missing');

    expect(logger.debug).toHaveBeenCalledWith(
      '[CRED] KeyRefId not found: kr_missing',
    );
    expect(
      getLocalKeyManager(KEY_MANAGERS.local).removeSecret,
    ).not.toHaveBeenCalled();
  });

  it('remove deletes secret and metadata when record exists', () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: 'kr_delete',
      keyManager: KEY_MANAGERS.local,
      publicKey: 'pk',
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });

    service.remove('kr_delete');

    expect(
      getLocalKeyManager(KEY_MANAGERS.local).removeSecret,
    ).toHaveBeenCalledWith('kr_delete');
    expect(credentialStorageMockInstance.remove).toHaveBeenCalledWith(
      'kr_delete',
    );
  });

  it('signTransaction delegates to signer handle', async () => {
    const { service } = setupService();
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: 'kr_sign',
      keyManager: KEY_MANAGERS.local,
      publicKey: 'sign-public',
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    const signerHandle = {
      getPublicKey: jest.fn().mockReturnValue('sign-public'),
      sign: jest.fn().mockResolvedValue(new Uint8Array([9])),
    };
    getLocalKeyManager(KEY_MANAGERS.local).createSigner.mockReturnValue(
      signerHandle as Signer,
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
      'kr_sign',
    );

    expect(PublicKey.fromString).toHaveBeenCalledWith('sign-public');
    expect(transaction.signWith).toHaveBeenCalled();
    expect(signerHandle.sign).toHaveBeenCalledWith(new Uint8Array([1]));
  });

  it('createClient builds Hedera client using operator credentials', () => {
    const { service, networkService } = setupService();
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.1001',
      keyRefId: 'kr_operator',
    });
    credentialStorageMockInstance.get.mockReturnValue({
      keyRefId: 'kr_operator',
      keyManager: KEY_MANAGERS.local,
      publicKey: 'operator-public',
      keyAlgorithm: KeyAlgorithm.ECDSA,
    });
    getLocalKeyManager(KEY_MANAGERS.local).readSecret.mockReturnValue({
      privateKey: 'operator-private-key',
    });

    const client = service.createClient(SupportedNetwork.TESTNET);

    expect(networkService.getOperator).toHaveBeenCalledWith(
      SupportedNetwork.TESTNET,
    );
    expect(Client.forTestnet).toHaveBeenCalled();
    expect(AccountId.fromString).toHaveBeenCalledWith('0.0.1001');
    expect(client.setOperator).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.any(Object),
    );
  });
});
