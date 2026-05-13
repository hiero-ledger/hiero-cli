import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { ed25519Verify } from '@/plugins/eip712/commands/verify-ed25519/handler';

import {
  mockEcdsaKmsRecord,
  mockEcdsaPublicKey,
  mockEd25519KmsRecord,
  mockKeyRefId,
  mockPrecomputedHash,
} from './helpers/fixtures';
import {
  makeApiMock,
  makeEip712VerifyEd25519Args,
  makeKeyResolverMock,
  makeKmsMock,
} from './helpers/mocks';

jest.mock('@hiero-ledger/sdk', () => ({
  ...jest.requireActual('@hiero-ledger/sdk'),
  PublicKey: {
    fromStringED25519: jest.fn().mockReturnValue({
      verify: jest.fn().mockReturnValue(true),
    }),
  },
}));

describe('EIP-712 verify-ed25519 command', () => {
  let api: jest.Mocked<CoreApi>;

  beforeEach(() => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEd25519KmsRecord),
      }),
      keyResolver: makeKeyResolverMock({
        getPublicKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
  });

  it('returns verified=true when signature is valid', async () => {
    const args = makeEip712VerifyEd25519Args({ api });

    const result = await ed25519Verify(args);

    expect((result.result as { verified: boolean }).verified).toBe(true);
  });

  it('returns verified=false when signature is invalid', async () => {
    const { PublicKey } = jest.requireMock('@hiero-ledger/sdk');
    PublicKey.fromStringED25519.mockReturnValueOnce({
      verify: jest.fn().mockReturnValue(false),
    });

    const args = makeEip712VerifyEd25519Args({ api });

    const result = await ed25519Verify(args);

    expect((result.result as { verified: boolean }).verified).toBe(false);
  });

  it('throws ValidationError when KMS record not found', async () => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(undefined),
      }),
      keyResolver: makeKeyResolverMock({
        getPublicKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
    const args = makeEip712VerifyEd25519Args({ api });

    await expect(ed25519Verify(args)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when key algorithm is not ED25519', async () => {
    api = makeApiMock({
      kms: makeKmsMock({
        get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
      }),
      keyResolver: makeKeyResolverMock({
        getPublicKey: jest.fn().mockResolvedValue({
          keyRefId: mockKeyRefId,
          publicKey: mockEcdsaPublicKey,
        }),
      }),
    });
    const args = makeEip712VerifyEd25519Args({ api });

    await expect(ed25519Verify(args)).rejects.toThrow(ValidationError);
  });

  it('throws ZodError when neither hash nor typed data is provided', async () => {
    const args = makeEip712VerifyEd25519Args({
      api,
      args: {
        domain: undefined,
        types: undefined,
        message: undefined,
      },
    });

    await expect(ed25519Verify(args)).rejects.toThrow();
  });

  it('throws ZodError when both hash and typed data are provided', async () => {
    const args = makeEip712VerifyEd25519Args({
      api,
      args: { hash: mockPrecomputedHash },
    });

    await expect(ed25519Verify(args)).rejects.toThrow();
  });

  it('throws ValidationError when domain is invalid JSON', async () => {
    const args = makeEip712VerifyEd25519Args({
      api,
      args: { domain: '{ broken :::' },
    });

    await expect(ed25519Verify(args)).rejects.toThrow(ValidationError);
  });
});
