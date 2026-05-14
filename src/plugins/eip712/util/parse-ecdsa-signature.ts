import type { EcdsaSignatureComponents } from '@/core/types/shared.types';
import type { RecoveryIdentifier } from '@/plugins/eip712/types/shared.types';

export function parseEcdsaSignature(
  signature: string,
): EcdsaSignatureComponents {
  return {
    r: `0x${signature.slice(2, 66)}`,
    s: `0x${signature.slice(66, 130)}`,
    v: parseInt(signature.slice(130, 132), 16) as RecoveryIdentifier,
  };
}
