import type { CoreApi } from '@/core/core-api/core-api.interface';

import { ValidationError } from '@/core/errors';
import { eip712Verify } from '@/plugins/eip712/commands/verify/handler';

import {
  mockAltSignature65Bytes,
  mockEcdsaKmsRecord,
  mockEcdsaPublicKey,
  mockEd25519KmsRecord,
  mockEvmAddress,
  mockKeyRefId,
  mockPrecomputedHash,
  mockSignature64Bytes,
  mockSignature65Bytes,
} from './helpers/fixtures';
import {
  makeApiMock,
  makeEip712VerifyArgs,
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

describe('EIP-712 verify command', () => {
  describe('ECDSA path (65-byte signature)', () => {
    let api: jest.Mocked<CoreApi>;

    beforeEach(() => {
      api = makeApiMock();
    });

    it('recovers signer address from typed data', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockAltSignature65Bytes },
      });

      const result = await eip712Verify(args);

      expect(
        (result.result as { recoveredSigner: string }).recoveredSigner,
      ).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('recovers signer address from pre-computed hash', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: {
          hash: mockPrecomputedHash,
          signature: mockAltSignature65Bytes,
          domain: undefined,
          types: undefined,
          message: undefined,
        },
      });

      const result = await eip712Verify(args);

      expect(
        (result.result as { recoveredSigner: string }).recoveredSigner,
      ).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('sets match=false when recovered signer does not equal expected signer', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: {
          signature: mockAltSignature65Bytes,
          expectedSigner: mockEvmAddress,
        },
      });

      const result = await eip712Verify(args);

      expect((result.result as { match: boolean }).match).toBe(false);
    });

    it('throws when signature is not a valid hex string', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: 'not-a-valid-sig' },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws when expected-signer is not a valid account reference', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { expectedSigner: 'invalid@reference!' },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws ValidationError when domain is invalid JSON', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { domain: '{ broken :::' },
      });

      await expect(eip712Verify(args)).rejects.toThrow(ValidationError);
    });

    it('throws when --key is passed with a 65-byte signature', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature65Bytes, key: 'kr_testkey' },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws when both hash and typed data are provided', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { hash: mockPrecomputedHash },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws when neither hash nor typed data is provided', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { domain: undefined, types: undefined, message: undefined },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });
  });

  describe('ED25519 path (64-byte signature)', () => {
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
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, key: 'kr_testkey' },
      });

      const result = await eip712Verify(args);

      expect((result.result as { verified: boolean }).verified).toBe(true);
    });

    it('returns verified=false when signature is invalid', async () => {
      const { PublicKey } = jest.requireMock('@hiero-ledger/sdk');
      PublicKey.fromStringED25519.mockReturnValueOnce({
        verify: jest.fn().mockReturnValue(false),
      });

      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, key: 'kr_testkey' },
      });

      const result = await eip712Verify(args);

      expect((result.result as { verified: boolean }).verified).toBe(false);
    });

    it('throws ValidationError when KMS record not found', async () => {
      api = makeApiMock({
        kms: makeKmsMock({ get: jest.fn().mockReturnValue(undefined) }),
        keyResolver: makeKeyResolverMock({
          getPublicKey: jest.fn().mockResolvedValue({
            keyRefId: mockKeyRefId,
            publicKey: mockEcdsaPublicKey,
          }),
        }),
      });
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, key: 'kr_testkey' },
      });

      await expect(eip712Verify(args)).rejects.toThrow(ValidationError);
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
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, key: 'kr_testkey' },
      });

      await expect(eip712Verify(args)).rejects.toThrow(ValidationError);
    });

    it('throws when --expected-signer is passed with a 64-byte signature', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: {
          signature: mockSignature64Bytes,
          expectedSigner: mockEvmAddress,
        },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws ValidationError when domain is invalid JSON', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, domain: '{ broken :::' },
      });

      await expect(eip712Verify(args)).rejects.toThrow(ValidationError);
    });

    it('throws when both hash and typed data are provided', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: { signature: mockSignature64Bytes, hash: mockPrecomputedHash },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });

    it('throws when neither hash nor typed data is provided', async () => {
      const args = makeEip712VerifyArgs({
        api,
        args: {
          signature: mockSignature64Bytes,
          domain: undefined,
          types: undefined,
          message: undefined,
        },
      });

      await expect(eip712Verify(args)).rejects.toThrow();
    });
  });
});
