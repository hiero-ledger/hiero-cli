import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TokenCreateFtInput } from '@/plugins/token/commands/create-ft/input';
import type { FungibleTokenFileDefinition } from '@/plugins/token/schema';
import type { TokenKeysService } from '@/plugins/token/services/token-keys.service.interface';
import type {
  TokenCreateFtFromFileKeys,
  TokenCreateFtKeys,
  TokenUpdatedTreasuryParams,
} from '@/plugins/token/services/token-keys.types';

import { ValidationError } from '@/core/errors';

export class TokenKeysServiceImpl implements TokenKeysService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly mirror?: HederaMirrornodeService,
    private readonly kms?: KmsService,
  ) {}

  async resolveOptionalKeys(
    credentials: Credential[],
    keyManager: KeyManager,
    tag: string,
  ): Promise<ResolvedPublicKey[]> {
    const results: ResolvedPublicKey[] = [];
    for (const credential of credentials) {
      const resolved = await this.keyResolver.resolveSigningKey(
        credential,
        keyManager,
        false,
        [tag],
      );
      results.push(resolved);
    }
    return results;
  }

  async resolveOptionalKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    tag: string,
  ): Promise<ResolvedPublicKey | undefined> {
    if (!credential) {
      return undefined;
    }
    return this.keyResolver.getPublicKey(credential, keyManager, false, [tag]);
  }

  async resolveCreateFtKeys(
    input: TokenCreateFtInput,
    keyManager: KeyManager,
  ): Promise<TokenCreateFtKeys> {
    const treasury = await this.keyResolver.resolveAccountCredentials(
      input.treasury,
      keyManager,
      true,
      ['token:treasury'],
    );

    const admin = await this.resolveOptionalKeys(
      input.adminKey,
      keyManager,
      'token:admin',
    );
    const supply = await this.resolveOptionalKeys(
      input.supplyKey,
      keyManager,
      'token:supply',
    );
    const freeze = await this.resolveOptionalKeys(
      input.freezeKey,
      keyManager,
      'token:freeze',
    );
    const wipe = await this.resolveOptionalKeys(
      input.wipeKey,
      keyManager,
      'token:wipe',
    );
    const kyc = await this.resolveOptionalKeys(
      input.kycKey,
      keyManager,
      'token:kyc',
    );
    const pause = await this.resolveOptionalKeys(
      input.pauseKey,
      keyManager,
      'token:pause',
    );
    const feeSchedule = await this.resolveOptionalKeys(
      input.feeScheduleKey,
      keyManager,
      'token:feeSchedule',
    );
    const metadata = await this.resolveOptionalKeys(
      input.metadataKey,
      keyManager,
      'token:metadata',
    );

    return {
      treasury,
      admin,
      supply,
      freeze,
      wipe,
      kyc,
      pause,
      feeSchedule,
      metadata,
    };
  }

  async resolveCreateFtFromFileKeys(
    tokenDefinition: FungibleTokenFileDefinition,
    keyManager: KeyManager,
  ): Promise<TokenCreateFtFromFileKeys> {
    const treasury = await this.keyResolver.resolveAccountCredentials(
      tokenDefinition.treasuryKey,
      keyManager,
      false,
      ['token:treasury'],
    );

    const adminKeys = await this.resolveOptionalKeys(
      tokenDefinition.adminKey,
      keyManager,
      'token:admin',
    );
    const keyRefIds = [
      treasury.keyRefId,
      ...adminKeys.map((key) => key.keyRefId),
    ];

    const supplyKeys = await this.resolveOptionalKeys(
      tokenDefinition.supplyKey,
      keyManager,
      'token:supply',
    );
    const wipeKeys = await this.resolveOptionalKeys(
      tokenDefinition.wipeKey,
      keyManager,
      'token:wipe',
    );
    const kycKeys = await this.resolveOptionalKeys(
      tokenDefinition.kycKey,
      keyManager,
      'token:kyc',
    );
    const freezeKeys = await this.resolveOptionalKeys(
      tokenDefinition.freezeKey,
      keyManager,
      'token:freeze',
    );
    const pauseKeys = await this.resolveOptionalKeys(
      tokenDefinition.pauseKey,
      keyManager,
      'token:pause',
    );
    const feeScheduleKeys = await this.resolveOptionalKeys(
      tokenDefinition.feeScheduleKey,
      keyManager,
      'token:feeSchedule',
    );
    const metadataKeys = await this.resolveOptionalKeys(
      tokenDefinition.metadataKey,
      keyManager,
      'token:metadata',
    );

    return {
      treasury,
      adminKeys,
      supplyKeys,
      wipeKeys,
      kycKeys,
      freezeKeys,
      pauseKeys,
      feeScheduleKeys,
      metadataKeys,
      keyRefIds,
    };
  }

  async resolveUpdatedTreasury(
    params: TokenUpdatedTreasuryParams,
  ): Promise<ResolvedAccountCredential> {
    if (params.explicitKey) {
      return this.keyResolver.resolveAccountCredentials(
        params.explicitKey,
        params.keyManager,
        false,
        ['token:treasury'],
      );
    }

    if (!this.mirror || !this.kms) {
      throw new ValidationError(
        'Mirror node and KMS services are required to resolve treasury key',
        { context: { treasuryAccountId: params.treasuryAccountId } },
      );
    }

    const treasuryAccountInfo = await this.mirror.getAccount(
      params.treasuryAccountId,
    );
    if (!treasuryAccountInfo) {
      throw new ValidationError(
        `Account ${params.treasuryAccountId} not found on mirror node`,
        { context: { treasuryAccountId: params.treasuryAccountId } },
      );
    }

    const kmsRecord = this.kms.findByPublicKey(
      treasuryAccountInfo.accountPublicKey,
    );
    if (!kmsRecord) {
      throw new ValidationError(
        'Treasury key not found in key manager. Provide --current-treasury-key.',
        { context: { treasuryAccountId: params.treasuryAccountId } },
      );
    }

    return {
      accountId: treasuryAccountInfo.accountId,
      keyRefId: kmsRecord.keyRefId,
      publicKey: kmsRecord.publicKey,
    };
  }
}
