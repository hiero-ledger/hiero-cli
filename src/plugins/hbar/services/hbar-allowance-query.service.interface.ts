import type { AccountReference } from '@/core/schemas/common-schemas';
import type { HbarAllowanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface HbarAllowanceFetchResult {
  allowances: HbarAllowanceInfo[];
  hasMore: boolean;
}

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
