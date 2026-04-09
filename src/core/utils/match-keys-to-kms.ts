type FindByPublicKey = (pk: string) => { keyRefId: string } | undefined;

export function matchPublicKeysToKmsRefIds(
  publicKeys: string[],
  findByPublicKey: FindByPublicKey,
): string[] {
  const keyRefIds: string[] = [];
  for (const publicKey of publicKeys) {
    const record = findByPublicKey(publicKey);
    if (record) {
      keyRefIds.push(record.keyRefId);
    }
  }
  return keyRefIds;
}
