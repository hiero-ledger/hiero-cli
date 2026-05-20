const ECDSA_SIG_REGEX = /^0x[0-9a-fA-F]{130}$/;
const ED25519_SIG_REGEX = /^0x[0-9a-fA-F]{128}$/;

export function isEcdsaSignature(signature: string): boolean {
  return ECDSA_SIG_REGEX.test(signature);
}

export function isEd25519Signature(signature: string): boolean {
  return ED25519_SIG_REGEX.test(signature);
}
