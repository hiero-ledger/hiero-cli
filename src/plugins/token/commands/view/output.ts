/**
 * View Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  PublicKeySchema,
} from '@/core/schemas/common-schemas';

/**
 * Token Info Schema
 */
export const ViewTokenOutputSchema = z.object({
  // === Basic token info ===
  tokenId: EntityIdSchema,
  name: z.string(),
  symbol: z.string(),
  type: z.string(), // 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE'
  network: NetworkSchema,

  // === Supply info (crucial for NFT - shows valid serial range) ===
  totalSupply: z.string(), // For NFT = current minted count
  maxSupply: z.string(),

  // === Fungible Token specific ===
  decimals: z.number().optional(), // NFT doesn't have decimals

  // === Common fields ===
  treasury: z.string().optional(),
  memo: z.string().optional(),
  createdTimestamp: z.string().optional(),

  // === Token keys ===
  adminKey: PublicKeySchema.nullable().optional(),
  supplyKey: PublicKeySchema.nullable().optional(),

  // === Specific NFT instance (when --serial provided) ===
  nftSerial: z
    .object({
      serialNumber: z.number(),
      owner: z.string(),
      metadata: z.string().optional(), // Decoded from base64
      metadataRaw: z.string().optional(), // Original base64
      createdTimestamp: z.string().optional(),
      deleted: z.boolean(),
    })
    .optional(),
});

export type ViewTokenOutput = z.infer<typeof ViewTokenOutputSchema>;

/**
 * Human-readable template for view token output
 * Two display modes:
 * 1. NFT Serial View (when --serial provided) - shows collection info + specific NFT details
 * 2. Default View (no --serial) - shows full token info with supply emphasized for NFT
 */
export const VIEW_TOKEN_TEMPLATE = `
{{#if nftSerial}}
🎨 NFT Instance #{{nftSerial.serialNumber}}

 Collection Info:

   Token ID: {{hashscanLink tokenId "token" network}}
   Name: {{name}}
   Symbol: {{symbol}}
   Total Minted: {{totalSupply}}
   Max Supply: {{maxSupply}}
{{#if treasury}}
   Treasury: {{hashscanLink treasury "account" network}}
{{/if}}

 NFT Details:
 
   Serial: #{{nftSerial.serialNumber}}
   Owner: {{hashscanLink nftSerial.owner "account" network}}
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

{{#if (eq type "NON_FUNGIBLE_UNIQUE")}}
   Current Supply: {{totalSupply}}
   Max Supply: {{maxSupply}}
{{else}}
   Total Supply: {{totalSupply}}
   Max Supply: {{maxSupply}}
{{#if decimals}}
   Decimals: {{decimals}}
{{/if~}}
{{/if~}}
{{#if treasury}}
   Treasury: {{hashscanLink treasury "account" network}}
{{/if~}}
{{#if adminKey}}
   Admin Key: {{adminKey}}
{{/if~}}
{{#if supplyKey}}
   Supply Key: {{supplyKey}}
{{/if~}}
{{#if memo}}
   Memo: {{memo}}
{{/if~}}
{{#if createdTimestamp}}
   Created: {{createdTimestamp}}
{{/if~}}
{{/if}}
`.trim();
