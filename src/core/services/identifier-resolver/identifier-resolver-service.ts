import type { AliasService } from '@/core';
import type { IdentifierResolverService } from '@/core/services/identifier-resolver/identifier-resolver-service.interface';
import type {
  ResolveEntityParams,
  ResolveEntityResult,
} from '@/core/services/identifier-resolver/types';

export class IdentifierResolverServiceImpl implements IdentifierResolverService {
  private readonly aliasService: AliasService;
  constructor(aliasService: AliasService) {
    this.aliasService = aliasService;
  }
  resolveEntityId(params: ResolveEntityParams): ResolveEntityResult {
    const aliasRecord = this.aliasService.resolve(
      params.entityIdOrAlias,
      params.type,
      params.network,
    );

    if (!aliasRecord) {
      throw new Error(
        `Alias "${params.entityIdOrAlias}" not found for network ${params.network}. Please provide either a valid contract alias or contract ID.`,
      );
    }

    if (!aliasRecord.entityId) {
      throw new Error(
        `Alias "${aliasRecord.alias}" for type ${aliasRecord.type} does not have an associated entity ID.`,
      );
    }

    return { entityId: aliasRecord.entityId };
  }
}
