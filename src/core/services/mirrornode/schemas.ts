import type {
  AccountAPIBalance,
  AccountAPIKey,
  AccountAPIResponse,
  TokenInfo,
} from './types';

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
  pause_key: optionalKeyRef,
  created_timestamp: z.string(),
  deleted: z.boolean().nullable().optional(),
  freeze_default: z.boolean().optional(),
  pause_status: z.string(),
  memo: z.string(),
});

const mirrorNodeKeyTypeSchema = z.enum(['ECDSA_SECP256K1', 'ED25519']);

export const AccountAPIBalanceSchema: z.ZodType<AccountAPIBalance> = z.object({
  balance: z.number(),
  timestamp: z.string(),
});

export const AccountAPIKeySchema: z.ZodType<AccountAPIKey> = z.object({
  _type: mirrorNodeKeyTypeSchema,
  key: z.string(),
});

export const AccountAPIResponseSchema: z.ZodType<AccountAPIResponse> = z.object(
  {
    account: z.string(),
    alias: z.string().optional(),
    balance: AccountAPIBalanceSchema,
    created_timestamp: z.string(),
    evm_address: z.string().optional(),
    key: AccountAPIKeySchema.optional(),
    max_automatic_token_associations: z.number(),
    memo: z.string(),
    receiver_sig_required: z.boolean(),
  },
);
