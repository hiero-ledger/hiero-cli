import type {
  ResolveEntityParams,
  ResolveEntityResult,
} from '@/core/services/identifier-resolver/types';

export interface IdentifierResolverService {
  resolveEntityId(params: ResolveEntityParams): ResolveEntityResult;
}
