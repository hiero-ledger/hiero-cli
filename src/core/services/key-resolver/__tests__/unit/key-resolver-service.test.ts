import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError, ValidationError } from '@/core/errors';
import { KeyResolverServiceImpl } from '@/core/services/key-resolver/key-resolver-service';
import {
  CredentialType,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';

// ── helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_ID = '0.0.12345';
const PUBLIC_KEY =
  'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const KEY_REF_ID = 'test-key-ref-id';
const EVM_ADDRESS = '0x' + 'a'.repeat(40);
const KEY_MGR = KeyManager.local;

const makeAccountResponse = (overrides?: Record<string, unknown>) => ({
  accountId: ACCOUNT_ID,
  accountPublicKey: PUBLIC_KEY,
  keyAlgorithm: KeyAlgorithm.ED25519,
  balance: { balance: 1000, timestamp: '2024-01-01T00:00:00Z' },
  ...overrides,
});

const makeKmsRecord = (overrides?: Record<string, unknown>) => ({
  keyRefId: KEY_REF_ID,
  publicKey: PUBLIC_KEY,
  keyManager: KEY_MGR,
  keyAlgorithm: KeyAlgorithm.ED25519,
  labels: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeMirrorMock = (): jest.Mocked<
  Pick<HederaMirrornodeService, 'getAccountOrThrow' | 'getAccounts'>
> => ({
  getAccountOrThrow: jest.fn().mockResolvedValue(makeAccountResponse()),
  getAccounts: jest
    .fn()
    .mockResolvedValue({ accounts: [{ accountId: ACCOUNT_ID }] }),
});

const makeKmsMock = (): jest.Mocked<
  Pick<
    KmsService,
    | 'importPrivateKey'
    | 'importPublicKey'
    | 'importAndValidatePrivateKey'
    | 'get'
    | 'findByPublicKey'
    | 'hasPrivateKey'
  >
> => ({
  importPrivateKey: jest
    .fn()
    .mockReturnValue({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY }),
  importPublicKey: jest
    .fn()
    .mockReturnValue({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY }),
  importAndValidatePrivateKey: jest
    .fn()
    .mockReturnValue({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY }),
  get: jest.fn().mockReturnValue(makeKmsRecord()),
  findByPublicKey: jest.fn().mockReturnValue(makeKmsRecord()),
  hasPrivateKey: jest.fn().mockReturnValue(true),
});

const makeAliasMock = (): jest.Mocked<Pick<AliasService, 'resolve'>> => ({
  resolve: jest.fn().mockReturnValue({
    entityId: ACCOUNT_ID,
    publicKey: PUBLIC_KEY,
    keyRefId: KEY_REF_ID,
  }),
});

const makeNetworkMock = (): jest.Mocked<
  Pick<NetworkService, 'getCurrentNetwork' | 'getCurrentOperatorOrThrow'>
> => ({
  getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
  getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
    accountId: ACCOUNT_ID,
    keyRefId: KEY_REF_ID,
  }),
});

const makeService = (overrides?: {
  mirror?: Partial<ReturnType<typeof makeMirrorMock>>;
  kms?: Partial<ReturnType<typeof makeKmsMock>>;
  alias?: Partial<ReturnType<typeof makeAliasMock>>;
  network?: Partial<ReturnType<typeof makeNetworkMock>>;
}) => {
  const mirror = { ...makeMirrorMock(), ...overrides?.mirror };
  const kms = { ...makeKmsMock(), ...overrides?.kms };
  const alias = { ...makeAliasMock(), ...overrides?.alias };
  const network = { ...makeNetworkMock(), ...overrides?.network };
  const logger = makeLogger();

  const service = new KeyResolverServiceImpl(
    mirror as unknown as HederaMirrornodeService,
    alias as unknown as AliasService,
    network as unknown as NetworkService,
    kms as unknown as KmsService,
    logger,
  );

  return { service, mirror, kms, alias, network, logger };
};

// ── resolveAccountCredentials ─────────────────────────────────────────────────

describe('resolveAccountCredentials', () => {
  test('returns operator when no credential and fallback=true', async () => {
    const { service } = makeService();

    const result = await service.resolveAccountCredentials(
      undefined,
      KEY_MGR,
      true,
    );

    expect(result).toEqual({
      keyRefId: KEY_REF_ID,
      accountId: ACCOUNT_ID,
      publicKey: PUBLIC_KEY,
    });
  });

  test('throws StateError when no credential and fallback=false', async () => {
    const { service } = makeService();

    await expect(
      service.resolveAccountCredentials(undefined, KEY_MGR, false),
    ).rejects.toThrow(StateError);
  });

  test('resolves ACCOUNT_KEY_PAIR credential via mirror + kms', async () => {
    const { service, mirror, kms } = makeService();

    const result = await service.resolveAccountCredentials(
      {
        type: CredentialType.ACCOUNT_KEY_PAIR,
        accountId: ACCOUNT_ID,
        privateKey: 'priv-key',
        rawValue: `${ACCOUNT_ID}:priv-key`,
      },
      KEY_MGR,
    );

    expect(mirror.getAccountOrThrow).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(kms.importAndValidatePrivateKey).toHaveBeenCalled();
    expect(result.accountId).toBe(ACCOUNT_ID);
    expect(result.keyRefId).toBe(KEY_REF_ID);
  });

  test('resolves ALIAS credential via alias service', async () => {
    const { service, alias } = makeService();

    const result = await service.resolveAccountCredentials(
      { type: CredentialType.ALIAS, alias: 'my-alias', rawValue: 'my-alias' },
      KEY_MGR,
    );

    expect(alias.resolve).toHaveBeenCalledWith(
      'my-alias',
      AliasType.Account,
      'testnet',
    );
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  test('resolves ACCOUNT_ID credential via mirror + kms.importPublicKey', async () => {
    const { service, mirror, kms } = makeService();

    const result = await service.resolveAccountCredentials(
      {
        type: CredentialType.ACCOUNT_ID,
        accountId: ACCOUNT_ID,
        rawValue: ACCOUNT_ID,
      },
      KEY_MGR,
    );

    expect(mirror.getAccountOrThrow).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(kms.importPublicKey).toHaveBeenCalled();
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  test('throws StateError when resolved key has no private key in KMS', async () => {
    const { service } = makeService({
      kms: { hasPrivateKey: jest.fn().mockReturnValue(false) },
    });

    await expect(
      service.resolveAccountCredentials(undefined, KEY_MGR, true),
    ).rejects.toThrow(StateError);
  });

  test('throws NotFoundError when ALIAS not found', async () => {
    const { service } = makeService({
      alias: { resolve: jest.fn().mockReturnValue(null) },
    });

    await expect(
      service.resolveAccountCredentials(
        {
          type: CredentialType.ALIAS,
          alias: 'unknown-alias',
          rawValue: 'unknown-alias',
        },
        KEY_MGR,
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getPublicKey ──────────────────────────────────────────────────────────────

describe('getPublicKey', () => {
  test('returns operator key when no credential and fallback=true', async () => {
    const { service } = makeService();

    const result = await service.getPublicKey(undefined, KEY_MGR, true);

    expect(result).toEqual({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY });
  });

  test('throws StateError when no credential and fallback=false', async () => {
    const { service } = makeService();

    await expect(
      service.getPublicKey(undefined, KEY_MGR, false),
    ).rejects.toThrow(StateError);
  });

  test('resolves PUBLIC_KEY credential', async () => {
    const { service, kms } = makeService();

    const result = await service.getPublicKey(
      {
        type: CredentialType.PUBLIC_KEY,
        keyType: KeyAlgorithm.ED25519,
        publicKey: PUBLIC_KEY,
        rawValue: PUBLIC_KEY,
      },
      KEY_MGR,
    );

    expect(kms.importPublicKey).toHaveBeenCalled();
    expect(result.publicKey).toBe(PUBLIC_KEY);
    expect(result.keyRefId).toBe(KEY_REF_ID);
  });

  test('throws StateError when resolved is missing keyRefId', async () => {
    const { service } = makeService({
      kms: {
        importPublicKey: jest
          .fn()
          .mockReturnValue({ keyRefId: undefined, publicKey: undefined }),
      },
    });

    await expect(
      service.getPublicKey(
        {
          type: CredentialType.PUBLIC_KEY,
          keyType: KeyAlgorithm.ED25519,
          publicKey: PUBLIC_KEY,
          rawValue: PUBLIC_KEY,
        },
        KEY_MGR,
      ),
    ).rejects.toThrow(StateError);
  });
});

// ── resolveSigningKey ─────────────────────────────────────────────────────────

describe('resolveSigningKey', () => {
  test('returns operator key when no credential and fallback=true', async () => {
    const { service } = makeService();

    const result = await service.resolveSigningKey(undefined, KEY_MGR, true);

    expect(result).toEqual({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY });
  });

  test('throws StateError when no credential and fallback=false', async () => {
    const { service } = makeService();

    await expect(
      service.resolveSigningKey(undefined, KEY_MGR, false),
    ).rejects.toThrow(StateError);
  });

  test('throws StateError when fallback operator has no private key', async () => {
    const { service } = makeService({
      kms: { hasPrivateKey: jest.fn().mockReturnValue(false) },
    });

    await expect(
      service.resolveSigningKey(undefined, KEY_MGR, true),
    ).rejects.toThrow(StateError);
  });

  test('resolves PRIVATE_KEY credential', async () => {
    const { service, kms } = makeService();

    const result = await service.resolveSigningKey(
      {
        type: CredentialType.PRIVATE_KEY,
        keyType: KeyAlgorithm.ED25519,
        privateKey: 'priv',
        rawValue: 'priv',
      },
      KEY_MGR,
    );

    expect(kms.importPrivateKey).toHaveBeenCalled();
    expect(result.keyRefId).toBe(KEY_REF_ID);
    expect(result.publicKey).toBe(PUBLIC_KEY);
  });

  test('throws StateError when resolved key has no private key in KMS', async () => {
    const { service } = makeService({
      kms: { hasPrivateKey: jest.fn().mockReturnValue(false) },
    });

    await expect(
      service.resolveSigningKey(
        {
          type: CredentialType.PRIVATE_KEY,
          keyType: KeyAlgorithm.ED25519,
          privateKey: 'priv',
          rawValue: 'priv',
        },
        KEY_MGR,
      ),
    ).rejects.toThrow(StateError);
  });

  test('resolves ALIAS credential to signing key', async () => {
    const { service, alias } = makeService();

    const result = await service.resolveSigningKey(
      { type: CredentialType.ALIAS, alias: 'my-alias', rawValue: 'my-alias' },
      KEY_MGR,
    );

    expect(alias.resolve).toHaveBeenCalled();
    expect(result.keyRefId).toBe(KEY_REF_ID);
  });
});

// ── resolvedPublicKeysForStoredKeyRefs ────────────────────────────────────────

describe('resolvedPublicKeysForStoredKeyRefs', () => {
  test('returns resolved public keys for found keyRefIds', () => {
    const { service } = makeService();

    const result = service.resolvedPublicKeysForStoredKeyRefs([
      KEY_REF_ID,
      'another-ref',
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ keyRefId: KEY_REF_ID, publicKey: PUBLIC_KEY });
  });

  test('throws ValidationError when keyRefId not found in KMS', () => {
    const { service } = makeService({
      kms: { get: jest.fn().mockReturnValue(undefined) },
    });

    expect(() =>
      service.resolvedPublicKeysForStoredKeyRefs(['missing-ref']),
    ).toThrow(ValidationError);
  });

  test('returns empty array for empty input', () => {
    const { service } = makeService();

    const result = service.resolvedPublicKeysForStoredKeyRefs([]);

    expect(result).toEqual([]);
  });
});

// ── resolveDestination ────────────────────────────────────────────────────────

describe('resolveDestination', () => {
  test('resolves ACCOUNT_ID credential to destination with accountId', async () => {
    const { service } = makeService();

    const result = await service.resolveDestination(
      {
        type: CredentialType.ACCOUNT_ID,
        accountId: ACCOUNT_ID,
        rawValue: ACCOUNT_ID,
      },
      KEY_MGR,
    );

    expect(result).toMatchObject({ accountId: ACCOUNT_ID });
  });

  test('resolves EVM_ADDRESS with mirror match to destination with accountId and evmAddress', async () => {
    const { service } = makeService({
      mirror: {
        getAccountOrThrow: jest.fn().mockResolvedValue({
          ...makeAccountResponse(),
          accountId: ACCOUNT_ID,
          evmAddress: EVM_ADDRESS,
        }),
      },
    });

    const result = await service.resolveDestination(
      {
        type: CredentialType.EVM_ADDRESS,
        evmAddress: EVM_ADDRESS,
        rawValue: EVM_ADDRESS,
      },
      KEY_MGR,
    );

    expect(result).toMatchObject({ evmAddress: EVM_ADDRESS });
  });

  test('resolves EVM_ADDRESS to just evmAddress when mirror returns NotFoundError', async () => {
    const { service } = makeService({
      mirror: {
        getAccountOrThrow: jest
          .fn()
          .mockRejectedValue(new NotFoundError('not found')),
      },
    });

    const result = await service.resolveDestination(
      {
        type: CredentialType.EVM_ADDRESS,
        evmAddress: EVM_ADDRESS,
        rawValue: EVM_ADDRESS,
      },
      KEY_MGR,
    );

    expect(result).toEqual({ evmAddress: EVM_ADDRESS });
  });
});

// ── resolveSigningKeys ────────────────────────────────────────────────────────

describe('resolveSigningKeys', () => {
  const baseParams = {
    explicitCredentials: [],
    keyManager: KEY_MGR,
    signingKeyLabels: ['token:admin'],
    emptyMirrorRoleKeyMessage: 'No admin key on token.',
    insufficientKmsMatchesMessage: 'Admin key not found in KMS.',
    validationErrorOptions: { context: { tokenId: '0.0.123' } },
  };

  test('throws ValidationError with emptyMirrorRoleKeyMessage when mirrorRoleKey is null', async () => {
    const { service } = makeService();

    await expect(
      service.resolveSigningKeys({ ...baseParams, mirrorRoleKey: null }),
    ).rejects.toThrow('No admin key on token.');
  });

  test('throws ValidationError with emptyMirrorRoleKeyMessage when mirrorRoleKey is undefined', async () => {
    const { service } = makeService();

    await expect(
      service.resolveSigningKeys({ ...baseParams, mirrorRoleKey: undefined }),
    ).rejects.toThrow('No admin key on token.');
  });

  test('resolves from explicit credentials when provided', async () => {
    const { service } = makeService();

    const result = await service.resolveSigningKeys({
      ...baseParams,
      mirrorRoleKey: { _type: 'ED25519', key: PUBLIC_KEY },
      explicitCredentials: [
        {
          type: CredentialType.PRIVATE_KEY,
          keyType: KeyAlgorithm.ED25519,
          privateKey: 'priv',
          rawValue: 'priv',
        },
      ],
    });

    expect(result.keyRefIds).toContain(KEY_REF_ID);
  });

  test('resolves from mirror node keys when no explicit credentials', async () => {
    const { service } = makeService({
      kms: { findByPublicKey: jest.fn().mockReturnValue(makeKmsRecord()) },
    });

    const result = await service.resolveSigningKeys({
      ...baseParams,
      mirrorRoleKey: { _type: 'ED25519', key: PUBLIC_KEY },
    });

    expect(result.keyRefIds).toContain(KEY_REF_ID);
  });

  test('throws insufficientKmsMatchesMessage when mirror keys not found in KMS', async () => {
    const { service } = makeService({
      kms: { findByPublicKey: jest.fn().mockReturnValue(undefined) },
    });

    await expect(
      service.resolveSigningKeys({
        ...baseParams,
        mirrorRoleKey: { _type: 'ED25519', key: PUBLIC_KEY },
      }),
    ).rejects.toThrow('Admin key not found in KMS.');
  });
});

// ── resolveExplicitSigningKeys ────────────────────────────────────────────────

describe('resolveExplicitSigningKeys', () => {
  test('returns keyRefIds for resolved credentials', async () => {
    const { service } = makeService();

    const result = await service.resolveExplicitSigningKeys({
      explicitCredentials: [
        {
          type: CredentialType.PRIVATE_KEY,
          keyType: KeyAlgorithm.ED25519,
          privateKey: 'priv',
          rawValue: 'priv',
        },
      ],
      keyManager: KEY_MGR,
      signingKeyLabels: ['token:admin'],
      threshold: 1,
    });

    expect(result.keyRefIds).toEqual([KEY_REF_ID]);
    expect(result.requiredSignatures).toBe(1);
  });

  test('resolves multiple credentials', async () => {
    const { service, kms } = makeService();
    kms.importPrivateKey
      .mockReturnValueOnce({ keyRefId: 'ref-1', publicKey: 'pub-1' })
      .mockReturnValueOnce({ keyRefId: 'ref-2', publicKey: 'pub-2' });

    const result = await service.resolveExplicitSigningKeys({
      explicitCredentials: [
        {
          type: CredentialType.PRIVATE_KEY,
          keyType: KeyAlgorithm.ED25519,
          privateKey: 'priv1',
          rawValue: 'priv1',
        },
        {
          type: CredentialType.PRIVATE_KEY,
          keyType: KeyAlgorithm.ED25519,
          privateKey: 'priv2',
          rawValue: 'priv2',
        },
      ],
      keyManager: KEY_MGR,
      signingKeyLabels: [],
      threshold: 2,
    });

    expect(result.keyRefIds).toEqual(['ref-1', 'ref-2']);
    expect(result.requiredSignatures).toBe(2);
  });
});

// ── resolveMirrorNodeSigningKeys ──────────────────────────────────────────────

describe('resolveMirrorNodeSigningKeys', () => {
  test('returns keyRefIds for found public keys', () => {
    const { service } = makeService({
      kms: { findByPublicKey: jest.fn().mockReturnValue(makeKmsRecord()) },
    });

    const result = service.resolveMirrorNodeSigningKeys({
      publicKeys: [PUBLIC_KEY],
      requiredSignatures: 1,
    });

    expect(result.keyRefIds).toEqual([KEY_REF_ID]);
    expect(result.requiredSignatures).toBe(1);
  });

  test('deduplicates keys with same keyRefId', () => {
    const { service } = makeService({
      kms: { findByPublicKey: jest.fn().mockReturnValue(makeKmsRecord()) },
    });

    const result = service.resolveMirrorNodeSigningKeys({
      publicKeys: [PUBLIC_KEY, PUBLIC_KEY],
      requiredSignatures: 1,
    });

    expect(result.keyRefIds).toHaveLength(1);
  });

  test('throws ValidationError when not enough keys found in KMS', () => {
    const { service } = makeService({
      kms: { findByPublicKey: jest.fn().mockReturnValue(undefined) },
    });

    expect(() =>
      service.resolveMirrorNodeSigningKeys({
        publicKeys: [PUBLIC_KEY],
        requiredSignatures: 1,
      }),
    ).toThrow(ValidationError);
  });

  test('stops collecting once threshold is met', () => {
    const { service } = makeService({
      kms: {
        findByPublicKey: jest
          .fn()
          .mockReturnValueOnce({ ...makeKmsRecord(), keyRefId: 'ref-1' })
          .mockReturnValueOnce({ ...makeKmsRecord(), keyRefId: 'ref-2' }),
      },
    });

    const result = service.resolveMirrorNodeSigningKeys({
      publicKeys: ['pub-1', 'pub-2'],
      requiredSignatures: 1,
    });

    expect(result.keyRefIds).toHaveLength(1);
    expect(result.keyRefIds[0]).toBe('ref-1');
  });
});
