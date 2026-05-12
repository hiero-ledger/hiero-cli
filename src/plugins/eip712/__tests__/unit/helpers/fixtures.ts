import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';

export const mockKeyRefId = 'kr_testkey';

export const mockEcdsaPublicKey =
  '04' +
  '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' +
  '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';

export const mockEvmAddress = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';

export const mockEcdsaKmsRecord: KmsCredentialRecord = {
  keyRefId: mockKeyRefId,
  keyManager: KeyManager.local,
  publicKey: mockEcdsaPublicKey,
  keyAlgorithm: KeyAlgorithm.ECDSA,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockEd25519KmsRecord: KmsCredentialRecord = {
  ...mockEcdsaKmsRecord,
  keyAlgorithm: KeyAlgorithm.ED25519,
};

export const mockSignature65Bytes = '0x' + 'a'.repeat(130);

export const mockAltSignature65Bytes =
  '0x' + 'a'.repeat(64) + '7'.repeat(64) + '1c';
