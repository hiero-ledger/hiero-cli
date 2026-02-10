import type {
  AccountResolutionParams,
  AccountResolutionResult,
  AutoResolveEntityReferenceParams,
  AutoResolveEntityReferenceResult,
  ContractResolutionParams,
  ContractResolutionResult,
  ReferenceResolutionParams,
  ReferenceResolutionResult,
} from '@/core/services/identity-resolution/types';

export interface IdentityResolutionService {
  resolveAccount(
    params: AccountResolutionParams,
  ): Promise<AccountResolutionResult>;

  resolveContract(
    params: ContractResolutionParams,
  ): Promise<ContractResolutionResult>;

  resolveReferenceToEntityOrEvmAddress(
    params: ReferenceResolutionParams,
  ): ReferenceResolutionResult;

  resolveEntityReference(
    params: AutoResolveEntityReferenceParams,
  ): AutoResolveEntityReferenceResult;
}
