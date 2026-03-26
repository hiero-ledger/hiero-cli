import type { TokenInfo } from './types';

import { z } from 'zod';

const optionalMirrorKey = z
  .object({
    _type: z.string(),
    key: z.string(),
  })
  .optional();

export const TokenInfoSchema: z.ZodType<TokenInfo> = z.object({
  token_id: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.string(),
  total_supply: z.string(),
  max_supply: z.string(),
  type: z.string(),
  treasury_account_id: z.string(),
  admin_key: optionalMirrorKey,
  kyc_key: optionalMirrorKey,
  freeze_key: optionalMirrorKey,
  wipe_key: optionalMirrorKey,
  supply_key: optionalMirrorKey,
  fee_schedule_key: optionalMirrorKey,
  pause_key: optionalMirrorKey,
  created_timestamp: z.string(),
  deleted: z.boolean(),
  default_freeze_status: z.boolean(),
  default_kyc_status: z.boolean(),
  pause_status: z.string(),
  memo: z.string(),
});
