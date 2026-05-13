import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { ed25519Sign } from '@/plugins/eip712/commands/sign-ed25519/handler';

import {
  mockEcdsaKmsRecord,
  mockEcdsaPublicKey,
  mockEd25519KmsRecord,
  mockKeyRefId,
  mockPrecomputedHash,
  mockSignature64Bytes,
} from './helpers/fixtures';
import {
  makeApiMock,
  makeEip712SignEd25519Args,
  makeKeyResolverMock,
  makeKmsMock,
  makeSignerMock,
} from './helpers/mocks';

describe('EIP-712 sign-ed25519 command', () => {
  let api: jest.Mocked<CoreApi>;

  beforeEach(() => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEd25519KmsRecord),
        getSignerHandle: jest.fn().mockReturnValue(
          makeSignerMock({
            sign: jest.fn().mockReturnValue(new Uint8Array(64)),
          }),
        ),
      }),
      keyResolver: makeKeyResolverMock({
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
  });

  it('returns signature for valid ED25519 key and typed data', async () => {
    const args = makeEip712SignEd25519Args({ api });

    const result = await ed25519Sign(args);

    expect(result.result).toMatchObject({
      signature: mockSignature64Bytes,
      signerPublicKey: `0x${mockEcdsaPublicKey}`,
    });
  });

  it('returns signature for valid ED25519 key and pre-computed hash', async () => {
    const args = makeEip712SignEd25519Args({
      api,
      args: {
        hash: mockPrecomputedHash,
        domain: undefined,
        types: undefined,
        message: undefined,
      },
    });

    const result = await ed25519Sign(args);

    expect(result.result).toMatchObject({
      signature: mockSignature64Bytes,
      signerPublicKey: `0x${mockEcdsaPublicKey}`,
    });
  });

  it('throws ValidationError when KMS record not found', async () => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(undefined),
      }),
      keyResolver: makeKeyResolverMock({
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
    const args = makeEip712SignEd25519Args({ api });

    await expect(ed25519Sign(args)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when key algorithm is not ED25519', async () => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
      }),
      keyResolver: makeKeyResolverMock({
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
    const args = makeEip712SignEd25519Args({ api });

    await expect(ed25519Sign(args)).rejects.toThrow(ValidationError);
  });

  it('throws ZodError when both hash and typed data are provided', async () => {
    const args = makeEip712SignEd25519Args({
      api,
      args: { hash: mockPrecomputedHash },
    });

    await expect(ed25519Sign(args)).rejects.toThrow();
  });

  it('throws ZodError when neither hash nor typed data is provided', async () => {
    const args = makeEip712SignEd25519Args({
      api,
      args: {
        domain: undefined,
        types: undefined,
        message: undefined,
      },
    });

    await expect(ed25519Sign(args)).rejects.toThrow();
  });

  it('throws ValidationError when domain is invalid JSON', async () => {
    const args = makeEip712SignEd25519Args({
      api,
      args: { domain: '{ broken :::' },
    });

    await expect(ed25519Sign(args)).rejects.toThrow(ValidationError);
  });
});
