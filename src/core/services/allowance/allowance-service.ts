import type { AllowanceEntry } from './allowance-entries/allowance-entry.interface';
import type { AllowanceService } from './allowance-service.interface';
import type { NftAllowanceDeleteParams } from './types';

import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  Long,
  NftId,
  TokenId,
} from '@hashgraph/sdk';

export class AllowanceServiceImpl implements AllowanceService {
  buildAllowanceApprove(
    entries: AllowanceEntry[],
  ): AccountAllowanceApproveTransaction {
    const tx = new AccountAllowanceApproveTransaction();
    for (const entry of entries) {
      entry.apply(tx);
    }
    return tx;
  }

  buildNftAllowanceDelete(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction {
    const tokenId = TokenId.fromString(params.tokenId);
    const owner = AccountId.fromString(params.ownerAccountId);

    if (params.allSerials) {
      return new AccountAllowanceApproveTransaction().deleteTokenNftAllowanceAllSerials(
        tokenId,
        owner,
        AccountId.fromString(params.spenderAccountId),
      );
    }

    const tx = new AccountAllowanceDeleteTransaction();
    for (const serial of params.serialNumbers) {
      tx.deleteAllTokenNftAllowances(
        new NftId(tokenId, Long.fromString(serial.toString())),
        owner,
      );
    }
    return tx;
  }
}
