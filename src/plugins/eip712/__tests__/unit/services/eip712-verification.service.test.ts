import {
  makeIdentityResolutionServiceMock,
  makeKeyResolverMock,
  makeKmsMock,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { Eip712VerificationServiceImpl } from '@/plugins/eip712/services/eip712-verification.service';

describe('Eip712VerificationServiceImpl', () => {
  describe('verifyEd25519', () => {
    test('throws when key reference is not found in KMS', async () => {
      const keyResolver = makeKeyResolverMock();
      keyResolver.getPublicKey = jest.fn().mockResolvedValue({
        keyRefId: 'missing',
        publicKey: 'pk',
      });
      const kms = makeKmsMock();
      kms.get = jest.fn().mockReturnValue(undefined);

      const service = new Eip712VerificationServiceImpl(
        makeIdentityResolutionServiceMock(),
        keyResolver,
        kms,
      );

      await expect(
        service.verifyEd25519({
          keyManager: KeyManager.local,
          credential: undefined,
          signature: '0x' + 'ab'.repeat(64),
          hash: '0x' + 'cd'.repeat(32),
        }),
      ).rejects.toThrow(ValidationError);
    });

    test('throws when key algorithm is not ED25519', async () => {
      const keyResolver = makeKeyResolverMock();
      keyResolver.getPublicKey = jest.fn().mockResolvedValue({
        keyRefId: 'kr-1',
        publicKey: 'pk',
      });
      const kms = makeKmsMock();
      kms.get = jest.fn().mockReturnValue({
        keyRefId: 'kr-1',
        publicKey: 'pk',
        keyAlgorithm: KeyAlgorithm.ECDSA,
      });

      const service = new Eip712VerificationServiceImpl(
        makeIdentityResolutionServiceMock(),
        keyResolver,
        kms,
      );

      await expect(
        service.verifyEd25519({
          keyManager: KeyManager.local,
          credential: undefined,
          signature: '0x' + 'ab'.repeat(64),
          hash: '0x' + 'cd'.repeat(32),
        }),
      ).rejects.toThrow(ValidationError);
    });

    test('delegates to keyResolver.getPublicKey with correct args', async () => {
      const keyResolver = makeKeyResolverMock();
      keyResolver.getPublicKey = jest.fn().mockResolvedValue({
        keyRefId: 'kr-1',
        publicKey: 'pk',
      });
      const kms = makeKmsMock();
      kms.get = jest.fn().mockReturnValue(undefined);

      const service = new Eip712VerificationServiceImpl(
        makeIdentityResolutionServiceMock(),
        keyResolver,
        kms,
      );

      await expect(
        service.verifyEd25519({
          keyManager: KeyManager.local,
          credential: undefined,
          signature: '0x' + 'ab'.repeat(64),
          hash: '0x' + 'cd'.repeat(32),
        }),
      ).rejects.toThrow();

      expect(keyResolver.getPublicKey).toHaveBeenCalledWith(
        undefined,
        KeyManager.local,
        true,
        ['eip712:verify'],
      );
    });
  });
});
