import { z } from 'zod';

import {
  NetworkSchema,
  ResolvedPublicKeySchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';

const MirrorNodeKeySchema = z
  .object({ _type: z.string(), key: z.string() })
  .nullable()
  .optional();

// Mirrors TokenInfo interface from @/core/services/mirrornode/types
const TokenInfoSchema = z
  .object({
    token_id: z.string(),
    symbol: z.string(),
    name: z.string(),
    decimals: z.string(),
    total_supply: z.string(),
    max_supply: z.string(),
    type: z.enum(MirrorNodeTokenType),
    treasury_account_id: z.string(),
    admin_key: MirrorNodeKeySchema,
    kyc_key: MirrorNodeKeySchema,
    freeze_key: MirrorNodeKeySchema,
    wipe_key: MirrorNodeKeySchema,
    supply_key: MirrorNodeKeySchema,
    fee_schedule_key: MirrorNodeKeySchema,
    metadata_key: MirrorNodeKeySchema,
    pause_key: MirrorNodeKeySchema,
    created_timestamp: z.string(),
    deleted: z.boolean().nullable().optional(),
    freeze_default: z.boolean().optional(),
    auto_renew_account: z.string().nullable().optional(),
    auto_renew_period: z.number().nullable().optional(),
    expiry_timestamp: z.number().nullable().optional(),
    pause_status: z.string(),
    memo: z.string(),
  })
  .passthrough();

// ResolvedPublicKey[] | null — required, nullable, never undefined
const NullableKeyArraySchema = z.array(ResolvedPublicKeySchema).nullable();

// Mirrors TokenUpdateNormalizedParams extends BaseNormalizedParams
export const TokenUpdateNormalisedParamsSchema = z.object({
  // BaseNormalizedParams
  keyRefIds: z.array(z.string()),
  // TokenUpdateNormalizedParams
  tokenId: z.string(),
  tokenInfo: TokenInfoSchema,
  stateKey: z.string(),
  network: NetworkSchema,
  keyManager: keyManagerNameSchema,
  newName: z.string().optional(),
  newSymbol: z.string().optional(),
  newTreasuryId: z.string().optional(),
  adminKeyRefIds: z.array(z.string()),
  newTreasuryKeyRefId: z.string().optional(),
  newAdminKeys: NullableKeyArraySchema,
  newAdminKeyThreshold: z.number().optional(),
  kycKeys: NullableKeyArraySchema,
  kycKeyThreshold: z.number().optional(),
  freezeKeys: NullableKeyArraySchema,
  freezeKeyThreshold: z.number().optional(),
  wipeKeys: NullableKeyArraySchema,
  wipeKeyThreshold: z.number().optional(),
  supplyKeys: NullableKeyArraySchema,
  supplyKeyThreshold: z.number().optional(),
  feeScheduleKeys: NullableKeyArraySchema,
  feeScheduleKeyThreshold: z.number().optional(),
  pauseKeys: NullableKeyArraySchema,
  pauseKeyThreshold: z.number().optional(),
  metadataKeys: NullableKeyArraySchema,
  metadataKeyThreshold: z.number().optional(),
  memo: z.string().nullable().optional(),
  autoRenewAccountId: z.string().optional(),
  autoRenewPeriodSeconds: z.number().optional(),
  expirationTime: z.coerce.date().optional(),
  metadata: z.instanceof(Uint8Array).optional(),
});
