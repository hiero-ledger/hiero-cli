import type { AccountAllowanceApproveTransaction } from '@hashgraph/sdk';
import type { AllowanceEntry } from './allowance-entry.interface';

import { AccountId, Long, TokenId } from '@hashgraph/sdk';

export class FtAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly tokenId: string,
    public readonly amount: bigint,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    tx.approveTokenAllowance(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.ownerAccountId),
      AccountId.fromString(this.spenderAccountId),
      Long.fromString(this.amount.toString()),
    );
  }
}
