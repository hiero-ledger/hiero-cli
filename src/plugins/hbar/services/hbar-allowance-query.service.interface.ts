import type { AccountReference } from '@/core/schemas/common-schemas';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { HbarAllowanceFetchResult } from '@/plugins/hbar/services/hbar-allowance-query.types';

export interface HbarAllowanceQueryService {
  resolveAccountId(
    account: AccountReference,
    network: SupportedNetwork,
  ): Promise<string>;
  resolveOptionalAccountId(
    account: AccountReference | undefined,
    network: SupportedNetwork,
  ): Promise<string | undefined>;
  fetchAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<HbarAllowanceFetchResult>;
}
