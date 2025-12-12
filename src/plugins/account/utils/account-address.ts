import { AccountId, PublicKey } from '@hashgraph/sdk';

import type { KeyAlgorithmType } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';

interface BuildAccountEvmAddressParams {
  accountId: string;
  publicKey: string;
  keyType: KeyAlgorithmType;
  existingEvmAddress?: string | null;
}

const ensureHexAddressPrefix = (address: string): string => {
  if (!address) {
    return address;
  }
  return address.startsWith('0x') ? address : `0x${address}`;
};

export function buildAccountEvmAddress({
  accountId,
  publicKey,
  keyType,
  existingEvmAddress,
}: BuildAccountEvmAddressParams): string {
  if (!accountId) {
    throw new Error('accountId is required to derive account addresses');
  }

  const solidityAddress = AccountId.fromString(accountId).toSolidityAddress();
  const solidityAddressFull = `0x${solidityAddress}`;

  const evmAddress: string | undefined =
    existingEvmAddress && existingEvmAddress !== ''
      ? ensureHexAddressPrefix(existingEvmAddress)
      : undefined;

  if (evmAddress) {
    return evmAddress;
  }

  if (keyType === KeyAlgorithm.ECDSA) {
    if (!publicKey) {
      throw new Error(
        'publicKey is required to derive EVM address for ECDSA keys',
      );
    }
    const ecdsaPublicKey = PublicKey.fromStringECDSA(publicKey);
    const alias = ecdsaPublicKey.toEvmAddress();
    return ensureHexAddressPrefix(alias);
  }

  return solidityAddressFull;
}
