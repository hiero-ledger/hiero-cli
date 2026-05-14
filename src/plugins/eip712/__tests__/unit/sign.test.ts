import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { eip712Sign } from '@/plugins/eip712/commands/sign/handler';

import {
  mockEcdsaKmsRecord,
  mockEcdsaPublicKey,
  mockEd25519KmsRecord,
  mockKeyRefId,
  mockPrecomputedHash,
  mockSignature64Bytes,
  mockSignature65Bytes,
} from './helpers/fixtures';
import {
  makeApiMock,
  makeEip712SignArgs,
  makeKeyResolverMock,
  makeKmsMock,
  makeSignerMock,
} from './helpers/mocks';

describe('EIP-712 sign command', () => {
  describe('ECDSA path', () => {
    let api: jest.Mocked<CoreApi>;

    beforeEach(() => {
      api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
          getSignerHandle: jest.fn().mockReturnValue(
            makeSignerMock({
              signHashWithEcdsaKey: jest
                .fn()
                .mockReturnValue(mockSignature65Bytes),
            }),
          ),
        }),
      });
    });

    it('returns signature components for ECDSA key and typed data', async () => {
      const args = makeEip712SignArgs({ api });

      const result = await eip712Sign(args);

      expect(result.result).toMatchObject({
        signature: mockSignature65Bytes,
        r: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
        s: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
        v: expect.any(Number),
        signerEvm: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      });
    });

    it('returns signature components for ECDSA key and pre-computed hash', async () => {
      const args = makeEip712SignArgs({
        api,
        args: {
          hash: mockPrecomputedHash,
          domain: undefined,
          types: undefined,
          message: undefined,
        },
      });

      const result = await eip712Sign(args);

      expect(result.result).toMatchObject({
        signature: mockSignature65Bytes,
        r: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
        s: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
        v: expect.any(Number),
        signerEvm: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      });
    });
  });

  describe('ED25519 path', () => {
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

    it('returns signature for ED25519 key and typed data', async () => {
      const args = makeEip712SignArgs({ api });

      const result = await eip712Sign(args);

      expect(result.result).toMatchObject({
        signature: mockSignature64Bytes,
        signerPublicKey: `0x${mockEcdsaPublicKey}`,
      });
    });

    it('returns signature for ED25519 key and pre-computed hash', async () => {
      const args = makeEip712SignArgs({
        api,
        args: {
          hash: mockPrecomputedHash,
          domain: undefined,
          types: undefined,
          message: undefined,
        },
      });

      const result = await eip712Sign(args);

      expect(result.result).toMatchObject({
        signature: mockSignature64Bytes,
        signerPublicKey: `0x${mockEcdsaPublicKey}`,
      });
    });
  });

  describe('error cases', () => {
    it('throws ValidationError when key reference is not found in KMS', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({ get: jest.fn().mockReturnValue(undefined) }),
      });
      const args = makeEip712SignArgs({ api });

      await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for unsupported key algorithm', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue({
            ...mockEcdsaKmsRecord,
            keyAlgorithm: 'RSA' as never,
          }),
        }),
      });
      const args = makeEip712SignArgs({ api });

      await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when domain is invalid JSON and not a file path', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
        }),
      });
      const args = makeEip712SignArgs({
        api,
        args: { domain: '{ broken :::' },
      });

      await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when domain file does not exist', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
        }),
      });
      const args = makeEip712SignArgs({
        api,
        args: { domain: '/tmp/nonexistent-eip712-domain.json' },
      });

      await expect(eip712Sign(args)).rejects.toThrow(ValidationError);
    });

    it('throws when both hash and typed data are provided', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
        }),
      });
      const args = makeEip712SignArgs({
        api,
        args: { hash: mockPrecomputedHash },
      });

      await expect(eip712Sign(args)).rejects.toThrow();
    });

    it('throws when neither hash nor typed data is provided', async () => {
      const api = makeApiMock({
        kms: makeKmsMock({
          get: jest.fn().mockReturnValue(mockEcdsaKmsRecord),
        }),
      });
      const args = makeEip712SignArgs({
        api,
        args: {
          domain: undefined,
          types: undefined,
          message: undefined,
        },
      });

      await expect(eip712Sign(args)).rejects.toThrow();
    });
  });
});
