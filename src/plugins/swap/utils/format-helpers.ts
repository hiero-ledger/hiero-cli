export function formatAccount(input: string, accountId: string): string {
  return input !== accountId ? `${input} (${accountId})` : accountId;
}

export function formatToken(input: string, tokenId: string): string {
  return input !== tokenId ? `${input} (${tokenId})` : tokenId;
}
