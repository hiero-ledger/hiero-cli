import type { HederaMirrornodeService, KeyResolverService } from '@/core';
import type { MirrorNodeKey } from '@/core/services/mirrornode/types';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';

import { ECDSA_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { EntityReferenceType } from '@/core';
import {
  CredentialType,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { SupportedNetwork } from '@/core/types/shared.types';
import { ScheduleKeysServiceImpl } from '@/plugins/schedule/services/schedule-keys.service';
import { ScheduleResolverServiceImpl } from '@/plugins/schedule/services/schedule-resolver.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';
import { ScheduleSyncServiceImpl } from '@/plugins/schedule/services/schedule-sync.service';

import {
  ADMIN_KEY_REF,
  MIRROR_CONSENSUS_TS,
  ON_CHAIN_SCHEDULE_ID,
  PAYER_ACCOUNT_ID,
  PAYER_KEY_REF_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
  SIGNER_KEY_REF,
} from './helpers/fixtures';

describe('schedule plugin services', () => {
  test('ScheduleStateService validates and persists schedule data', () => {
    const state = makeStateMock();
    state.get.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      adminKeyRefIds: [],
      adminPublicKeys: [],
      scheduled: false,
      executed: false,
      waitForExpiry: false,
      createdAt: '2026-05-14T00:00:00.000Z',
    });
    const service = new ScheduleStateServiceImpl(state, makeLogger());

    service.saveScheduled(SCHEDULE_COMPOSED_KEY, {
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      adminKeyRefIds: [],
      adminPublicKeys: [],
      scheduled: false,
      executed: false,
      waitForExpiry: false,
      createdAt: '2026-05-14T00:00:00.000Z',
    });

    expect(state.set).toHaveBeenCalledWith(
      'schedule-transactions',
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({ name: SCHEDULE_NAME }),
    );
    expect(service.getScheduled(SCHEDULE_COMPOSED_KEY)?.name).toBe(
      SCHEDULE_NAME,
    );
  });

  test('ScheduleResolverService resolves local and mirror schedules', async () => {
    const scheduleState: ScheduleStateService = {
      saveScheduled: jest.fn(),
      getScheduled: jest.fn().mockReturnValue({
        name: SCHEDULE_NAME,
        scheduledId: ON_CHAIN_SCHEDULE_ID,
        scheduled: true,
        executed: false,
        adminKeyRefIds: [ADMIN_KEY_REF],
      }),
      listScheduled: jest.fn(),
      hasScheduled: jest.fn(),
      deleteScheduled: jest.fn(),
    };
    const mirror = {
      getScheduled: jest.fn().mockResolvedValue({
        schedule_id: ON_CHAIN_SCHEDULE_ID,
        executed_timestamp: null,
        admin_key: {
          _type: MirrorNodeKeyType.ED25519,
          key: ECDSA_HEX_PUBLIC_KEY,
        },
      }),
    } as unknown as HederaMirrornodeService;
    const service = new ScheduleResolverServiceImpl(scheduleState, mirror);

    const local = await service.resolveScheduleIdByEntityReference({
      scheduleReference: SCHEDULE_NAME,
      type: EntityReferenceType.ALIAS,
      network: SupportedNetwork.TESTNET,
    });
    const mirrorResult = await service.resolveScheduleIdByEntityReference({
      scheduleReference: ON_CHAIN_SCHEDULE_ID,
      type: EntityReferenceType.ENTITY_ID,
      network: SupportedNetwork.TESTNET,
    });

    expect(local.adminKeyRefIds).toEqual([ADMIN_KEY_REF]);
    expect(mirrorResult.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
  });

  test('ScheduleKeysService resolves explicit signer keys', async () => {
    const keyResolver = {
      resolveSigningKey: jest.fn().mockResolvedValue({
        keyRefId: SIGNER_KEY_REF,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    } as unknown as KeyResolverService;
    const service = new ScheduleKeysServiceImpl(
      keyResolver,
      {} as HederaMirrornodeService,
    );

    const keyRefIds = await service.resolveSignKeyRefs(
      ON_CHAIN_SCHEDULE_ID,
      [
        {
          type: CredentialType.KEY_REFERENCE,
          keyReference: SIGNER_KEY_REF,
          rawValue: SIGNER_KEY_REF,
        },
      ],
      KeyManager.local,
    );

    expect(keyRefIds).toEqual([SIGNER_KEY_REF]);
    expect(keyResolver.resolveSigningKey).toHaveBeenCalledWith(
      expect.objectContaining({ keyReference: SIGNER_KEY_REF }),
      KeyManager.local,
      false,
      ['schedule:signer'],
    );
  });

  test('ScheduleSyncService imports named mirror schedules into state', async () => {
    const scheduleState: ScheduleStateService = {
      saveScheduled: jest.fn(),
      getScheduled: jest.fn(),
      listScheduled: jest.fn(),
      hasScheduled: jest.fn(),
      deleteScheduled: jest.fn(),
    };
    const mirror = {
      getScheduled: jest.fn().mockResolvedValue({
        schedule_id: ON_CHAIN_SCHEDULE_ID,
        consensus_timestamp: MIRROR_CONSENSUS_TS,
        executed_timestamp: null,
        expiration_time: null,
        memo: 'mirror memo',
        payer_account_id: PAYER_ACCOUNT_ID,
        wait_for_expiry: false,
        admin_key: {
          _type: MirrorNodeKeyType.ED25519,
          key: ECDSA_HEX_PUBLIC_KEY,
        } satisfies MirrorNodeKey,
      }),
    } as unknown as HederaMirrornodeService;
    const scheduleKeys = {
      resolveMirrorPayerPublicKey: jest.fn().mockResolvedValue({
        keyRefId: PAYER_KEY_REF_ID,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
      resolveMirrorAdminPublicKey: jest.fn().mockResolvedValue({
        keyRefId: ADMIN_KEY_REF,
        publicKey: ECDSA_HEX_PUBLIC_KEY,
      }),
    } as unknown as ScheduleKeysServiceImpl;
    const service = new ScheduleSyncServiceImpl(
      scheduleState,
      mirror,
      scheduleKeys,
    );

    const result = await service.upsertNamedScheduleFromMirror(
      SCHEDULE_NAME,
      ON_CHAIN_SCHEDULE_ID,
      SupportedNetwork.TESTNET,
      KeyManager.local,
    );

    expect(result.adminKeyRefIds).toEqual([ADMIN_KEY_REF]);
    expect(result.payerKeyRefId).toBe(PAYER_KEY_REF_ID);
    expect(scheduleState.saveScheduled).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({ memo: 'mirror memo' }),
    );
  });
});
