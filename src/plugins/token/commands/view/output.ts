/**
 * View Token Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

/**
 * Token Info Schema
 */
export const ViewTokenOutputSchema = z.object({
  // === Basic token info ===
  tokenId: EntityIdSchema,
  name: z.string(),
  symbol: z.string(),
  type: z.string(), // 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE'

  // === Supply info (crucial for NFT - shows valid serial range) ===
  totalSupply: z.string(), // For NFT = current minted count
  maxSupply: z.string(),

  // === Fungible Token specific ===
  decimals: z.number().optional(), // NFT doesn't have decimals

  // === Common fields ===
  treasury: z.string().optional(),
  memo: z.string().optional(),
  createdTimestamp: z.string().optional(),

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

   Token ID: {{tokenId}}
   Name: {{name}}
   Symbol: {{symbol}}
   Total Minted: {{totalSupply}}
   Max Supply: {{maxSupply}}
{{#if treasury}}
   Treasury: {{treasury}}
{{/if}}

 NFT Details:
 
   Serial: #{{nftSerial.serialNumber}}
   Owner: {{nftSerial.owner}}
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

   ID: {{tokenId}}
   Name: {{name}}
   Symbol: {{symbol}}

{{#if (eq type "NON_FUNGIBLE_UNIQUE")}}
   Current Supply: {{totalSupply}}{{#if (gt totalSupply "0")}} (Valid serials: 1 to {{totalSupply}}){{/if}}
   Max Supply: {{maxSupply}}
{{else}}
   Total Supply: {{totalSupply}}
   Max Supply: {{maxSupply}}
{{#if decimals}}
   Decimals: {{decimals}}
{{/if~}}
{{/if~}}
{{#if treasury}}
   Treasury: {{treasury}}
{{/if~}}
{{#if memo}}
   Memo: {{memo}}
{{/if~}}
{{#if createdTimestamp}}
   Created: {{createdTimestamp}}
{{/if~}}
{{/if}}
`.trim();
