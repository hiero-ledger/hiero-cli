/**
 * View Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  HederaAutoRenewPeriodSecondsOptionalSchema,
  NetworkSchema,
  SupplyTypeSchema,
} from '@/core/schemas/common-schemas';

/**
 * Resolved key info: single key or multi-key with threshold
 */
export const KeyInfoSchema = z.object({
  keys: z.array(z.string()),
  threshold: z.number().optional(), // only present when keys.length > 1
});

export type KeyInfo = z.infer<typeof KeyInfoSchema>;

/**
 * Token Info Schema
 */
export const TokenViewOutputSchema = z.object({
  // === Basic token info ===
  tokenId: EntityIdSchema,
  name: z.string(),
  symbol: z.string(),
  type: z.string(), // 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE'
  network: NetworkSchema,

  // === Supply info (crucial for NFT - shows valid serial range) ===
  totalSupply: z.string(), // For NFT = current minted count
  maxSupply: z.string(),
  supplyType: SupplyTypeSchema,

  // === Fungible Token specific ===
  decimals: z.number().optional(), // NFT doesn't have decimals

  // === Common fields ===
  treasury: z.string().optional(),
  memo: z.string().optional(),
  createdTimestamp: z.string().optional(),

  freezeDefault: z.boolean(),
  autoRenewPeriodSeconds: HederaAutoRenewPeriodSecondsOptionalSchema,
  autoRenewAccountId: EntityIdSchema.optional(),
  expirationTime: z.string().optional(),

  // === Token keys ===
  adminKey: KeyInfoSchema.nullable().optional(),
  supplyKey: KeyInfoSchema.nullable().optional(),

  // === Specific NFT instance (when --serial provided) ===
  nftSerial: z
    .object({
      serialNumber: z.number(),
      owner: z.string().nullable(),
      metadata: z.string().optional(), // Decoded from base64
      metadataRaw: z.string().optional(), // Original base64
      createdTimestamp: z.string().optional(),
      deleted: z.boolean(),
    })
    .optional(),
});

export type TokenViewOutput = z.infer<typeof TokenViewOutputSchema>;

/**
 * Human-readable template for view token output
 * Two display modes:
 * 1. NFT Serial View (when --serial provided) - shows collection info + specific NFT details
 * 2. Default View (no --serial) - shows full token info with supply emphasized for NFT
 */
export const TOKEN_VIEW_TEMPLATE = `
{{#if nftSerial}}
🎨 NFT Instance #{{nftSerial.serialNumber}}

 Collection Info:

   Token ID: {{hashscanLink tokenId "token" network}}
   Name: {{name}}
   Symbol: {{symbol}}
   Total Minted: {{totalSupply}}
{{#if (eq supplyType "FINITE")}}
   Max Supply: {{maxSupply}}
{{/if}}
{{#if treasury}}
   Treasury: {{hashscanLink treasury "account" network}}
{{/if}}
   Freeze default: {{freezeDefault}}
{{#if autoRenewPeriodSeconds}}
   Auto-renew period: {{autoRenewPeriodSeconds}}s
{{/if}}
{{#if autoRenewAccountId}}
   Auto-renew account: {{hashscanLink autoRenewAccountId "account" network}}
{{/if}}
{{#if expirationTime}}
   Expiration: {{expirationTime}}
{{/if}}

 NFT Details:
 
   Serial: #{{nftSerial.serialNumber}}
{{#if nftSerial.owner}}
   Owner: {{hashscanLink nftSerial.owner "account" network}}
{{else}}
   Owner: —
{{/if}}
{{#if nftSerial.createdTimestamp}}
   Created: {{nftSerial.createdTimestamp}}
{{/if~}}
{{#if nftSerial.metadata}}
   Metadata: {{nftSerial.metadata}}
{{/if~}}
{{#if nftSerial.deleted}}
   ⚠️  Status: DELETED
{{/if~}}
{{else}}
{{#if (eq type "NON_FUNGIBLE_UNIQUE")}}
🎨 NFT Collection
{{else}}
💰 Fungible Token
{{/if}}

   ID: {{hashscanLink tokenId "token" network}}
   Name: {{name}}
   Symbol: {{symbol}}
   Freeze default: {{freezeDefault}}
{{#if (eq type "NON_FUNGIBLE_UNIQUE")}}
   Current Supply: {{totalSupply}}
{{#if (eq supplyType "FINITE")}}
   Max Supply: {{maxSupply}}
{{/if}}
{{else}}
   Total Supply: {{totalSupply}}
{{#if (eq supplyType "FINITE")}}
   Max Supply: {{maxSupply}}
{{/if}}
{{#if decimals}}
   Decimals: {{decimals}}
{{/if~}}
{{/if~}}
{{#if treasury}}
   Treasury: {{hashscanLink treasury "account" network}}
{{/if~}}
{{#if autoRenewPeriodSeconds}}
   Auto-renew period: {{autoRenewPeriodSeconds}}s
{{/if}}
{{#if autoRenewAccountId}}
   Auto-renew account: {{hashscanLink autoRenewAccountId "account" network}}
{{/if}}
{{#if expirationTime}}
   Expiration: {{expirationTime}}
{{/if}}
{{#if adminKey}}
{{#if adminKey.threshold}}
   Admin Key ({{adminKey.threshold}}/{{length adminKey.keys}}):
{{#each adminKey.keys}}     - {{this}}
{{/each}}
{{else}}
   Admin Key: {{adminKey.keys.[0]}}
{{/if~}}
{{/if~}}
{{#if supplyKey}}
{{#if supplyKey.threshold}}
   Supply Key ({{supplyKey.threshold}}/{{length supplyKey.keys}}):
{{#each supplyKey.keys}}     - {{this}}
{{/each}}
{{else}}
   Supply Key: {{supplyKey.keys.[0]}}
{{/if~}}
{{/if~}}
{{#if memo}}
   Memo: {{memo}}
{{/if~}}
{{#if createdTimestamp}}
   Created: {{createdTimestamp}}
{{/if~}}
{{/if}}
`.trim();
