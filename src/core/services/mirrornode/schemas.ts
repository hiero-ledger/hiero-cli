import type {
  AccountAPIBalance,
  AccountAPIKey,
  AccountAPIResponse,
  AccountListItemAPIResponse,
  AccountListItemBalance,
  AccountListItemTokenBalance,
  GetAccountsAPIResponse,
  TokenBalanceInfo,
  TokenBalancesResponse,
  TokenInfo,
  TopicInfo,
  TopicMessage,
  TopicMessageChunkInfo,
  TopicMessagesAPIResponse,
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
  metadata_key: optionalKeyRef,
  pause_key: optionalKeyRef,
  created_timestamp: z.string(),
  deleted: z.boolean().nullable().optional(),
  freeze_default: z.boolean().optional(),
  auto_renew_account: z.string(),
  auto_renew_period: z.number(),
  expiry_timestamp: z.number(),
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
    alias: z.string().nullable().optional(),
    balance: AccountAPIBalanceSchema,
    created_timestamp: z.string(),
    evm_address: z.string().optional(),
    key: AccountAPIKeySchema.optional(),
    max_automatic_token_associations: z.number(),
    memo: z.string(),
    receiver_sig_required: z.boolean(),
  },
);

const accountListItemTokenBalanceSchema: z.ZodType<AccountListItemTokenBalance> =
  z.object({
    token_id: z.string(),
    balance: z.number(),
  });

export const AccountListItemBalanceSchema: z.ZodType<AccountListItemBalance> =
  z.object({
    timestamp: z.string(),
    balance: z.number(),
    tokens: z.array(accountListItemTokenBalanceSchema).optional(),
  });

export const AccountListItemAPIResponseSchema: z.ZodType<AccountListItemAPIResponse> =
  z.object({
    account: z.string(),
    alias: z.string().nullable().optional(),
    balance: AccountListItemBalanceSchema.optional(),
    created_timestamp: z.string(),
    evm_address: z.string().optional(),
    key: z.union([AccountAPIKeySchema, z.null()]).optional(),
    deleted: z.boolean().optional(),
    memo: z.string().optional(),
  });

export const GetAccountsAPIResponseSchema: z.ZodType<GetAccountsAPIResponse> =
  z.object({
    accounts: z.array(AccountListItemAPIResponseSchema),
    links: z
      .object({
        next: z.string().nullable().optional(),
      })
      .optional(),
  });

const topicMessageChunkInitialTxIdSchema = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
]);

const TopicMessageChunkInfoSchema: z.ZodType<TopicMessageChunkInfo> = z.object({
  initial_transaction_id: topicMessageChunkInitialTxIdSchema,
  number: z.number(),
  total: z.number(),
});

export const TopicMessageSchema: z.ZodType<TopicMessage> = z.object({
  consensus_timestamp: z.string(),
  topic_id: z.string(),
  message: z.string(),
  running_hash: z.string(),
  sequence_number: z.number(),
  chunk_info: TopicMessageChunkInfoSchema.optional(),
});

export const TopicMessagesAPIResponseSchema: z.ZodType<TopicMessagesAPIResponse> =
  z.object({
    messages: z.array(TopicMessageSchema),
    links: z
      .object({
        next: z.string().nullable().optional(),
      })
      .optional(),
  });

export const TokenBalanceInfoSchema: z.ZodType<TokenBalanceInfo> = z.object({
  token_id: z.string(),
  balance: z.number(),
  decimals: z.number().optional(),
});

export const TokenBalancesResponseSchema: z.ZodType<TokenBalancesResponse> =
  z.object({
    tokens: z.array(TokenBalanceInfoSchema),
    links: z
      .object({
        next: z.string().nullable().optional(),
      })
      .optional(),
  });

export const TopicInfoSchema: z.ZodType<TopicInfo> = z.object({
  topic_id: z.string(),
  admin_key: optionalKeyRef,
  submit_key: optionalKeyRef,
  memo: z.string(),
  running_hash: z.string().optional(),
  sequence_number: z.number().optional(),
  consensus_timestamp: z.string().optional(),
  auto_renew_account: z.string().optional(),
  auto_renew_period: z.number(),
  expiration_timestamp: z.string().optional(),
  created_timestamp: z.string(),
  deleted: z.boolean(),
});
