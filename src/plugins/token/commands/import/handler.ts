import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TokenData } from '@/plugins/token/schema';
import type { TokenImportOutput } from './output';
import type { ImportTokenNormalizedParams } from './types';

import { NotFoundError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { MirrorTokenTypeToHederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenImportInputSchema } from './input';

export class TokenImportCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const parsedArgs = TokenImportInputSchema.parse(args.args);
    const validArgs: ImportTokenNormalizedParams = {
      tokenId: parsedArgs.token,
      alias: parsedArgs.name,
    };
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, validArgs.tokenId);

    if (validArgs.alias) {
      api.alias.availableOrThrow(validArgs.alias, network);
    }
    if (tokenState.getToken(key)) {
      throw new ValidationError(
        `Token with ID '${validArgs.tokenId}' already exists in state`,
      );
    }

    const tokenInfo = await api.mirror.getTokenInfo(validArgs.tokenId);
    const tokenType = MirrorTokenTypeToHederaTokenType[tokenInfo.type];
    if (!tokenType) {
      throw new NotFoundError(
        `Unsupported token type: ${tokenInfo.type}. Only FUNGIBLE_COMMON and NON_FUNGIBLE_UNIQUE are supported.`,
      );
    }

    if (validArgs.alias) {
      api.alias.register({
        alias: validArgs.alias,
        type: AliasType.Token,
        network,
        entityId: validArgs.tokenId,
        createdAt: new Date().toISOString(),
      });
    }

    const supplyType: SupplyType =
      tokenInfo.max_supply === '0' ? SupplyType.INFINITE : SupplyType.FINITE;

    const tokenData: TokenData = {
      tokenId: validArgs.tokenId,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      treasuryId: tokenInfo.treasury_account_id,
      adminPublicKey: tokenInfo.admin_key?.key,
      supplyPublicKey: tokenInfo.supply_key?.key,
      wipePublicKey: tokenInfo.wipe_key?.key,
      kycPublicKey: tokenInfo.kyc_key?.key,
      freezePublicKey: tokenInfo.freeze_key?.key,
      pausePublicKey: tokenInfo.pause_key?.key,
      feeSchedulePublicKey: tokenInfo.fee_schedule_key?.key,
      metadataPublicKey: tokenInfo.metadata_key?.key,
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

    tokenState.saveToken(key, tokenData);

    const result: TokenImportOutput = {
      tokenId: validArgs.tokenId,
      name: tokenData.name,
      symbol: tokenData.symbol,
      type: tokenInfo.type,
      network,
      memo: tokenInfo.memo || undefined,
      adminKeyPresent: Boolean(tokenInfo.admin_key),
      supplyKeyPresent: Boolean(tokenInfo.supply_key),
      alias: validArgs.alias,
    };

    return { result };
  }
}

export async function tokenImport(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenImportCommand().execute(args);
}
