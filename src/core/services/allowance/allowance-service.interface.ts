import type {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
} from '@hiero-ledger/sdk';
import type { AllowanceEntry } from './allowance-entries/allowance-entry.interface';
import type { NftAllowanceDeleteParams } from './types';

export interface AllowanceService {
  buildAllowanceApprove(
    entries: AllowanceEntry[],
  ): AccountAllowanceApproveTransaction;
  buildNftAllowanceDelete(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction;
}
