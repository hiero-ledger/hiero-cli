import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { TokenData } from '@/plugins/token/schema';
import type { ImportTokenOutput } from './output';

import { NotFoundError, ValidationError } from '@/core/errors';
import { MirrorTokenTypeToHederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { entityIdToAliasSafeFormat } from '@/core/utils/entity-id-to-alias-format';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { ImportTokenInputSchema } from './input';

export async function importToken(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = ImportTokenInputSchema.parse(args.args);

  const tokenId = validArgs.token;
  const alias = validArgs.name;

  const network = api.network.getCurrentNetwork();

  if (alias) {
    api.alias.availableOrThrow(alias, network);
  }

  if (tokenState.getToken(tokenId)) {
    throw new ValidationError(
      `Token with ID '${tokenId}' already exists in state`,
    );
  }

  const tokenInfo = await api.mirror.getTokenInfo(tokenId);

  const tokenType = MirrorTokenTypeToHederaTokenType[tokenInfo.type];
  if (!tokenType) {
    throw new NotFoundError(
      `Unsupported token type: ${tokenInfo.type}. Only FUNGIBLE_COMMON and NON_FUNGIBLE_UNIQUE are supported.`,
    );
  }

  const name =
    alias || tokenInfo.name || `imported-${entityIdToAliasSafeFormat(tokenId)}`;
  logger.info(`Importing token: ${name} (${tokenId})`);

  if (alias) {
    api.alias.register({
      alias,
      type: 'token',
      network,
      entityId: tokenId,
      createdAt: new Date().toISOString(),
    });
  }

  const supplyType: SupplyType =
    tokenInfo.max_supply === '0' ? SupplyType.INFINITE : SupplyType.FINITE;

  const tokenData: TokenData = {
    tokenId,
    name,
    symbol: tokenInfo.symbol,
    treasuryId: tokenInfo.treasury,
    adminPublicKey: tokenInfo.admin_key?.key,
    supplyPublicKey: tokenInfo.supply_key?.key,
    wipePublicKey: tokenInfo.wipe_key?.key,
    kycPublicKey: tokenInfo.kyc_key?.key,
    freezePublicKey: tokenInfo.freeze_key?.key,
    pausePublicKey: tokenInfo.pause_key?.key,
    feeSchedulePublicKey: tokenInfo.fee_schedule_key?.key,
    decimals: parseInt(tokenInfo.decimals, 10) || 0,
    initialSupply: BigInt(tokenInfo.total_supply),
    tokenType,
    supplyType,
    maxSupply: BigInt(tokenInfo.max_supply),
    network,
    associations: [],
    customFees: [],
    memo: tokenInfo.memo || undefined,
  };

  tokenState.saveToken(tokenId, tokenData);

  const result: ImportTokenOutput = {
    tokenId,
    name: tokenData.name,
    symbol: tokenData.symbol,
    type: tokenInfo.type,
    network,
    memo: tokenInfo.memo || undefined,
    adminKeyPresent: Boolean(tokenInfo.admin_key),
    supplyKeyPresent: Boolean(tokenInfo.supply_key),
    alias,
  };

  return { result };
}
