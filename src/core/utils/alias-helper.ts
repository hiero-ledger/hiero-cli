import type { CoreApi } from '@/core';
import type {
  AliasRecord,
  AliasType,
} from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

/**
 * Finds the alias for a given token ID from the alias service
 * @param api - Core API instance
 * @param entityId - Entity ID to find alias for
 * @param network - Network the token is on
 * @param type - Alias type to find
 * @returns The alias if found, undefined otherwise
 */
export function findAlias(
  api: CoreApi,
  entityId: string,
  network: SupportedNetwork,
  type: AliasType,
): string | undefined {
  try {
    const aliases = api.alias.list({ network, type });
    const aliasRecord = aliases.find(
      (alias: AliasRecord) => alias.entityId === entityId,
    );
    return aliasRecord ? aliasRecord.alias : undefined;
  } catch {
    return undefined;
  }
}
