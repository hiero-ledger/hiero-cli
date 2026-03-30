import type { TokenInfo } from './types';

import { z } from 'zod';

const mirrorKeyObject = z.object({
  _type: z.string(),
  key: z.string(),
});

const optionalKeyRef = z.union([mirrorKeyObject, z.null()]).optional();

export const TokenInfoSchema: z.ZodType<TokenInfo> = z.object({
  token_id: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.string(),
  total_supply: z.string(),
  max_supply: z.string(),
  type: z.string(),
  treasury_account_id: z.string(),
  admin_key: optionalKeyRef,
  kyc_key: optionalKeyRef,
  freeze_key: optionalKeyRef,
  wipe_key: optionalKeyRef,
  supply_key: optionalKeyRef,
  fee_schedule_key: optionalKeyRef,
  metadata_key: optionalKeyRef,
  pause_key: optionalKeyRef,
  created_timestamp: z.string(),
  deleted: z.boolean().nullable().optional(),
  freeze_default: z.boolean().optional(),
  default_kyc_status: z.boolean(),
  auto_renew_account: z.string(),
  auto_renew_period: z.number(),
  expiry_timestamp: z.number(),
  pause_status: z.string(),
  memo: z.string(),
});
