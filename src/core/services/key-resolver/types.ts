export type ResolvedKey = {
  publicKey?: string;
  accountId?: string;
  evmAddress?: string;
  keyRefId?: string;
};

export type SigningKey = {
  keyRefId: string;
  accountId: string;
  publicKey: string;
};

export type Destination =
  | { accountId: string; evmAddress?: string }
  | { accountId?: string; evmAddress: string };
