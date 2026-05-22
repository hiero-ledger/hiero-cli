import type { HederaMirrornodeService } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';
import type { ScheduleKeysService } from '@/plugins/schedule/services/schedule-keys.service.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type { ScheduleSyncService } from '@/plugins/schedule/services/schedule-sync.service.interface';

import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';

export class ScheduleSyncServiceImpl implements ScheduleSyncService {
  constructor(
    private readonly scheduleState: ScheduleStateService,
    private readonly mirror: HederaMirrornodeService,
    private readonly scheduleKeys: ScheduleKeysService,
  ) {}

  async markExecutionStatusFromMirror(
    scheduleId: string,
    scheduleName: string | undefined,
    network: SupportedNetwork,
  ): Promise<ScheduledTransactionData | undefined> {
    const scheduleResponse = await this.mirror.getScheduled(scheduleId);

    if (!scheduleName) {
      return undefined;
    }

    const scheduleRecord = this.scheduleState.getScheduled(
      composeKey(network, scheduleName),
    );

    if (!scheduleRecord || scheduleRecord.executed) {
      return undefined;
    }

    const updatedScheduledRecord: ScheduledTransactionData = {
      ...scheduleRecord,
      scheduled: true,
      executed: Boolean(scheduleResponse.executed_timestamp),
    };
    this.scheduleState.saveScheduled(
      composeKey(network, scheduleRecord.name),
      updatedScheduledRecord,
    );

    return updatedScheduledRecord;
  }

  async upsertNamedScheduleFromMirror(
    scheduleName: string,
    scheduleId: string,
    network: SupportedNetwork,
    keyManager: KeyManager,
  ): Promise<ScheduledTransactionData> {
    const scheduleResponse = await this.mirror.getScheduled(scheduleId);
    const payer = await this.scheduleKeys.resolveMirrorPayerPublicKey(
      scheduleResponse.payer_account_id,
      keyManager,
    );
    const admin = await this.scheduleKeys.resolveMirrorAdminPublicKey(
      scheduleResponse.admin_key,
      keyManager,
    );

    const scheduledRecord: ScheduledTransactionData = {
      name: scheduleName,
      network,
      keyManager,
      adminKeyRefIds: admin ? [admin.keyRefId] : [],
      adminPublicKeys: admin ? [admin.publicKey] : [],
      payerAccountId: scheduleResponse.payer_account_id,
      payerKeyRefId: payer?.keyRefId,
      memo: scheduleResponse.memo,
      expirationTime: scheduleResponse.expiration_time
        ? hederaTimestampToIso(scheduleResponse.expiration_time)
        : undefined,
      waitForExpiry: scheduleResponse.wait_for_expiry,
      scheduled: true,
      executed: Boolean(scheduleResponse.executed_timestamp),
      createdAt: scheduleResponse.consensus_timestamp
        ? hederaTimestampToIso(scheduleResponse.consensus_timestamp)
        : new Date().toISOString(),
    };
    this.scheduleState.saveScheduled(
      composeKey(network, scheduleName),
      scheduledRecord,
    );

    return scheduledRecord;
  }
}
