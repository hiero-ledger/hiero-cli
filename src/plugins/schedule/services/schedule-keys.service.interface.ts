import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { MirrorNodeKey } from '@/core/services/mirrornode/types';
import type { ResolvedSchedule } from '@/plugins/schedule/shared/types';

export interface ScheduleKeysService {
  resolveCreatePayer(
    payer: Credential | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedAccountCredential | undefined>;
  resolveCreateAdminKeys(
    adminKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey[]>;
  resolveDeleteAdminKeyRefs(
    schedule: ResolvedSchedule,
    explicitAdminKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<string[]>;
  resolveSignKeyRefs(
    scheduleId: string,
    explicitKeys: Credential[],
    keyManager: KeyManager,
  ): Promise<string[]>;
  resolveMirrorPayerPublicKey(
    accountId: string | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey | undefined>;
  resolveMirrorAdminPublicKey(
    adminKey: MirrorNodeKey | null | undefined,
    keyManager: KeyManager,
  ): Promise<ResolvedPublicKey | undefined>;
}
