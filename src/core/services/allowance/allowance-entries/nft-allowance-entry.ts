import type { AccountAllowanceApproveTransaction } from '@hashgraph/sdk';
import type { AllowanceEntry } from './allowance-entry.interface';

import { AccountId, Long, NftId, TokenId } from '@hashgraph/sdk';

export class NftAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly tokenId: string,
    public readonly serialNumbers?: number[],
    public readonly approveForAll?: boolean,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    const tokenId = TokenId.fromString(this.tokenId);
    const owner = AccountId.fromString(this.ownerAccountId);
    const spender = AccountId.fromString(this.spenderAccountId);
    if (this.approveForAll === true) {
      tx.approveTokenNftAllowanceAllSerials(tokenId, owner, spender);
    } else {
      for (const serial of this.serialNumbers!) {
        tx.approveTokenNftAllowance(
          new NftId(tokenId, Long.fromNumber(serial)),
          owner,
          spender,
        );
      }
    }
  }
}
