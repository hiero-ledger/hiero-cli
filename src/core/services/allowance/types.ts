export interface NftAllowanceDeleteSpecificParams {
  tokenId: string;
  ownerAccountId: string;
  serialNumbers: number[];
  allSerials?: false;
}

export interface NftAllowanceDeleteAllSerialsParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  allSerials: true;
}

export type NftAllowanceDeleteParams =
  | NftAllowanceDeleteSpecificParams
  | NftAllowanceDeleteAllSerialsParams;
