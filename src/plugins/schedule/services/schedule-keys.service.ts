import type { KeyResolverService } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { MirrorNodeKey } from '@/core/services/mirrornode/types';
import type { ScheduleKeysService } from '@/plugins/schedule/services/schedule-keys.service.interface';
import type { ResolvedSchedule } from '@/plugins/schedule/shared/types';

import { KeyAlgorithm, ValidationError } from '@/core';
import { CredentialType } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';

export class ScheduleKeysServiceImpl implements ScheduleKeysService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly mirror: HederaMirrornodeService,
  ) {}

  async resolveCreatePayer(
    payer: Credential | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedAccountCredential | undefined> {
    if (!payer) {
      return undefined;
    }

    return this.keyResolver.resolveAccountCredentials(payer, keyManager, true);
  }

  async resolveCreateAdminKeys(
    adminKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey[]> {
    const resolvedKeys: ResolvedPublicKey[] = [];

    for (const credential of adminKeys) {
      const resolved = await this.keyResolver.resolveSigningKey(
        credential,
        keyManager,
        false,
        ['schedule:admin'],
      );
      resolvedKeys.push(resolved);
    }

    return resolvedKeys;
  }

  async resolveDeleteAdminKeyRefs(
    schedule: ResolvedSchedule,
    explicitAdminKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<string[]> {
    if (!schedule.scheduleId) {
      throw new ValidationError('Could not resolve schedule ID');
    }

    const mirrorScheduleInfo = await this.mirror.getScheduled(
      schedule.scheduleId,
    );
    const { keyRefIds } = await this.keyResolver.resolveSigningKeys({
      mirrorRoleKey: mirrorScheduleInfo.admin_key ?? null,
      explicitCredentials: explicitAdminKeys,
      keyManager,
      signingKeyLabels: ['schedule:admin'],
      emptyMirrorRoleKeyMessage:
        'Schedule has no admin key on the network; it cannot be deleted with ScheduleDeleteTransaction.',
      insufficientKmsMatchesMessage:
        'Not enough admin key(s) found in key manager for this schedule. Provide --admin-key.',
      validationErrorOptions: {
        context: { scheduleId: schedule.scheduleId },
      },
    });

    return keyRefIds;
  }

  async resolveSignKeyRefs(
    scheduleId: string,
    explicitKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<string[]> {
    if (explicitKeys.length > 0) {
      const keyRefIds: string[] = [];
      for (const credential of explicitKeys) {
        const signer = await this.keyResolver.resolveSigningKey(
          credential,
          keyManager,
          false,
          ['schedule:signer'],
        );
        keyRefIds.push(signer.keyRefId);
      }
      return keyRefIds;
    }

    const mirrorScheduleInfo = await this.mirror.getScheduled(scheduleId);
    const { keyRefIds } = await this.keyResolver.resolveSigningKeys({
      mirrorRoleKey: mirrorScheduleInfo.admin_key,
      explicitCredentials: [],
      keyManager,
      signingKeyLabels: ['schedule:signer'],
      emptyMirrorRoleKeyMessage:
        'Schedule has no admin key on the network. Provide --key to specify the signing key.',
      insufficientKmsMatchesMessage:
        'No matching signer key found in key manager for this schedule. Provide --key.',
      validationErrorOptions: { context: { scheduleId } },
    });

    return keyRefIds;
  }

  async resolveMirrorPayerPublicKey(
    accountId: string | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey | undefined> {
    if (!accountId) {
      return undefined;
    }

    return this.keyResolver.getPublicKey(
      {
        type: CredentialType.ACCOUNT_ID,
        accountId,
        rawValue: accountId,
      },
      keyManager,
      false,
      ['schedule:payer'],
    );
  }

  async resolveMirrorAdminPublicKey(
    adminKey: MirrorNodeKey | null | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey | undefined> {
    if (!adminKey?.key || !adminKey._type) {
      return undefined;
    }

    return this.keyResolver.getPublicKey(
      {
        type: CredentialType.PUBLIC_KEY,
        publicKey: adminKey.key,
        keyType: this.toKeyAlgorithm(adminKey._type),
        rawValue: adminKey.key,
      },
      keyManager,
      false,
      ['schedule:admin'],
    );
  }

  private toKeyAlgorithm(keyType: string): KeyAlgorithm {
    if (keyType === MirrorNodeKeyType.ED25519.toString()) {
      return KeyAlgorithm.ED25519;
    }

    return KeyAlgorithm.ECDSA;
  }
}
