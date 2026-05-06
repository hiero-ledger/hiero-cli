import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { MirrorNodeKey } from '@/core/services/mirrornode/types';
import type { TokenData } from '@/plugins/token/schema';
import type { TokenImportOutput } from './output';
import type { ImportTokenNormalizedParams } from './types';

import { NotFoundError, ValidationError } from '@/core/errors';
import { MirrorTokenTypeToHederaTokenType } from '@/core/shared/constants';
import { AliasType, SupplyType } from '@/core/types/shared.types';
import {
  extractPublicKeysFromMirrorNodeKey,
  getEffectiveKeyRequirement,
} from '@/core/utils/extract-public-keys';
import { composeKey } from '@/core/utils/key-composer';
import { matchPublicKeysToKmsRefIds } from '@/core/utils/match-keys-to-kms';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenImportInputSchema } from './input';

export class TokenImportCommand implements Command {
  private importKeyRole(
    mirrorKey: MirrorNodeKey | undefined | null,
    findByPublicKey: (pk: string) => { keyRefId: string } | undefined,
  ): { keyRefIds: string[]; threshold: number } {
    if (!mirrorKey) {
      return { keyRefIds: [], threshold: 0 };
    }
    const extracted = extractPublicKeysFromMirrorNodeKey(mirrorKey);
    const requirement = getEffectiveKeyRequirement(extracted);
    const keyRefIds = matchPublicKeysToKmsRefIds(
      requirement.publicKeys,
      findByPublicKey,
    );
    return { keyRefIds, threshold: requirement.requiredSignatures };
  }

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

    const findByPublicKey = (pk: string) => api.kms.findByPublicKey(pk);

    const admin = this.importKeyRole(tokenInfo.admin_key, findByPublicKey);
    const supply = this.importKeyRole(tokenInfo.supply_key, findByPublicKey);
    const wipe = this.importKeyRole(tokenInfo.wipe_key, findByPublicKey);
    const kyc = this.importKeyRole(tokenInfo.kyc_key, findByPublicKey);
    const freeze = this.importKeyRole(tokenInfo.freeze_key, findByPublicKey);
    const pause = this.importKeyRole(tokenInfo.pause_key, findByPublicKey);
    const feeSchedule = this.importKeyRole(
      tokenInfo.fee_schedule_key,
      findByPublicKey,
    );
    const metadata = this.importKeyRole(
      tokenInfo.metadata_key,
      findByPublicKey,
    );

    const tokenData: TokenData = {
      tokenId: validArgs.tokenId,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      treasuryId: tokenInfo.treasury_account_id,
      adminKeyRefIds: admin.keyRefIds,
      adminKeyThreshold: admin.threshold,
      supplyKeyRefIds: supply.keyRefIds,
      supplyKeyThreshold: supply.threshold,
      wipeKeyRefIds: wipe.keyRefIds,
      wipeKeyThreshold: wipe.threshold,
      kycKeyRefIds: kyc.keyRefIds,
      kycKeyThreshold: kyc.threshold,
      freezeKeyRefIds: freeze.keyRefIds,
      freezeKeyThreshold: freeze.threshold,
      pauseKeyRefIds: pause.keyRefIds,
      pauseKeyThreshold: pause.threshold,
      feeScheduleKeyRefIds: feeSchedule.keyRefIds,
      feeScheduleKeyThreshold: feeSchedule.threshold,
      metadataKeyRefIds: metadata.keyRefIds,
      metadataKeyThreshold: metadata.threshold,
      decimals: parseInt(tokenInfo.decimals, 10) || 0,
      initialSupply: BigInt(tokenInfo.total_supply),
      tokenType,
      supplyType,
      maxSupply: BigInt(tokenInfo.max_supply),
      network,
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
