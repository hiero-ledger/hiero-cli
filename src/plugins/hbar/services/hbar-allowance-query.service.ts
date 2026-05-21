import type { AccountReference } from '@/core/schemas/common-schemas';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  HbarAllowanceFetchResult,
  HbarAllowanceQueryService,
} from './hbar-allowance-query.service.interface';

export class HbarAllowanceQueryServiceImpl implements HbarAllowanceQueryService {
  constructor(
    private readonly identityResolution: IdentityResolutionService,
    private readonly mirror: HederaMirrornodeService,
  ) {}

  async resolveAccountId(
    account: AccountReference,
    network: SupportedNetwork,
  ): Promise<string> {
    const resolved = await this.identityResolution.resolveAccount({
      accountReference: account.value,
      type: account.type,
      network,
    });
    return resolved.accountId;
  }

  async resolveOptionalAccountId(
    account: AccountReference | undefined,
    network: SupportedNetwork,
  ): Promise<string | undefined> {
    if (account === undefined) return undefined;
    return this.resolveAccountId(account, network);
  }

  async fetchAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<HbarAllowanceFetchResult> {
    if (!showAll) {
      const response = await this.mirror.getHbarAllowances(accountId);
      return {
        allowances: response.allowances,
        hasMore:
          response.links?.next !== undefined && response.links.next !== null,
      };
    }
    const response = await this.mirror.getAllHbarAllowances(accountId);
    return { allowances: response.allowances, hasMore: false };
  }
}
