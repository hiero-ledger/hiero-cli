import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  ResolvedDestinationAccount,
  ResolvedToken,
  TokenReferenceService,
} from '@/plugins/token/services/token-reference.service.interface';

import { NotFoundError } from '@/core/errors';
import {
  AccountReferenceObjectSchema,
  TokenReferenceObjectSchema,
} from '@/core/schemas';
import { AliasType, EntityReferenceType } from '@/core/types/shared.types';

export class TokenReferenceServiceImpl implements TokenReferenceService {
  constructor(private readonly identityResolution: IdentityResolutionService) {}

  async resolveDestinationAccount(
    account: string | undefined,
    network: SupportedNetwork,
  ): Promise<ResolvedDestinationAccount | null> {
    if (!account) {
      return null;
    }

    const accountReference = AccountReferenceObjectSchema.parse(account);
    const resolved = await this.identityResolution.resolveAccount({
      accountReference: accountReference.value,
      type: accountReference.type,
      network,
    });
    return { accountId: resolved.accountId };
  }

  resolveToken(
    token: string | undefined,
    network: SupportedNetwork,
  ): ResolvedToken | null {
    if (!token) {
      return null;
    }

    const tokenReference = TokenReferenceObjectSchema.parse(token);
    const resolved =
      this.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: tokenReference.value,
        referenceType: tokenReference.type,
        network,
        aliasType: AliasType.Token,
      });
    if (!resolved) {
      if (tokenReference.type === EntityReferenceType.ENTITY_ID) {
        return { tokenId: tokenReference.value };
      }
      throw new NotFoundError(
        `Token "${tokenReference.value}" not found on ${network}`,
        {
          context: { token: tokenReference.value, network },
        },
      );
    }
    return { tokenId: resolved.entityIdOrEvmAddress };
  }
}
