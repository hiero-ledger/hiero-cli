import type { AccountInfoQuery } from '@hashgraph/sdk';
export type * from './types';
import type {
  AccountCreateResult,
  AccountDeleteResult,
  AccountUpdateResult,
  CreateAccountParams,
  DeleteAccountParams,
  UpdateAccountParams,
} from './types';

export interface AccountService {
  createAccount(params: CreateAccountParams): AccountCreateResult;
  deleteAccount(params: DeleteAccountParams): AccountDeleteResult;
  updateAccount(params: UpdateAccountParams): AccountUpdateResult;
  getAccountInfo(accountId: string): AccountInfoQuery;
}
