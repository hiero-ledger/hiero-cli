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
} from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';

export class AllowanceServiceImpl implements AllowanceService {
  buildAllowanceApprove(
    entries: AllowanceEntry[],
  ): AccountAllowanceApproveTransaction {
    if (entries.length === 0) {
      throw new ValidationError(
        'AccountAllowanceApproveTransaction requires at least one allowance entry',
      );
    }
    if (entries.length > HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION) {
      throw new ValidationError(
        `AccountAllowanceApproveTransaction supports at most ${HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION} entries per transaction`,
      );
    }
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

    if (params.serialNumbers.length === 0) {
      throw new ValidationError(
        'AccountAllowanceDeleteTransaction requires at least one NFT serial number',
      );
    }
    if (
      params.serialNumbers.length > HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION
    ) {
      throw new ValidationError(
        `AccountAllowanceDeleteTransaction supports at most ${HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION} serial numbers per transaction`,
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
