/**
 * Contract Resolver Utilities
 * Utilities for resolving contract IDs from aliases or validating contract IDs
 */
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';

/**
 * Resolve contract ID from alias or validate contract ID
 * @param contractIdOrAlias - Contract ID (e.g., "0.0.123") or alias
 * @param aliasService - Alias service instance
 * @param currentNetwork - Current network name
 * @returns Contract ID string
 * @throws Error if contract alias not found or invalid
 */
export function resolveContractId(
  contractIdOrAlias: string,
  aliasService: AliasService,
  currentNetwork: SupportedNetwork,
): string {
  const contractIdParseResult = EntityIdSchema.safeParse(contractIdOrAlias);

  if (contractIdParseResult.success) {
    return contractIdParseResult.data;
  }

  const contractAliasResult = aliasService.resolve(
    contractIdOrAlias,
    ALIAS_TYPE.Contract,
    currentNetwork,
  );

  if (!contractAliasResult) {
    throw new Error(
      `Contract alias "${contractIdOrAlias}" not found for network ${currentNetwork}. Please provide either a valid contract alias or contract ID.`,
    );
  }

  if (!contractAliasResult.entityId) {
    throw new Error(
      `Contract alias "${contractIdOrAlias}" does not have an associated contract ID.`,
    );
  }

  return contractAliasResult.entityId;
}
