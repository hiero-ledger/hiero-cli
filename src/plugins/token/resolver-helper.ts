import type { CoreApi } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';

export interface ResolvedDestinationAccount {
  accountId: string;
}

export function resolveDestinationAccountParameter(
  account: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
): ResolvedDestinationAccount | null {
  if (!account) {
    return null;
  }

  const accountIdResult = EntityIdSchema.safeParse(account);
  if (accountIdResult.success) {
    return { accountId: account };
  }

  const aliasRecord = api.alias.resolve(account, 'account', network);
  if (!aliasRecord) {
    throw new NotFoundError(`Account "${account}" not found on ${network}`, {
      context: { account, network },
    });
  }

  if (!aliasRecord.entityId) {
    throw new NotFoundError(
      `Account "${account}" has no associated account ID`,
    );
  }

  return { accountId: aliasRecord.entityId };
}

export interface ResolvedToken {
  tokenId: string;
}

export function resolveTokenParameter(
  tokenIdOrName: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
): ResolvedToken | null {
  if (!tokenIdOrName) {
    return null;
  }

  const tokenIdResult = EntityIdSchema.safeParse(tokenIdOrName);
  if (tokenIdResult.success) {
    return { tokenId: tokenIdOrName };
  }

  const aliasRecord = api.alias.resolve(tokenIdOrName, 'token', network);
  if (!aliasRecord) {
    throw new NotFoundError(
      `Token "${tokenIdOrName}" not found on ${network}`,
      { context: { token: tokenIdOrName, network } },
    );
  }

  if (!aliasRecord.entityId) {
    throw new NotFoundError(
      `Token "${tokenIdOrName}" has no associated token ID`,
    );
  }

  return { tokenId: aliasRecord.entityId };
}
