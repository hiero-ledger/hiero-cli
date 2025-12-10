/**
 * Credentials Plugin State Schema
 * Single source of truth for credentials data structure and validation
 */
import { z } from 'zod';
import type { SupportedNetwork } from '../../core/types/shared.types';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EntityIdSchema } from '../../core/schemas/common-schemas';

// Supported networks aligned with core SupportedNetwork type
export const SUPPORTED_NETWORKS = [
  'mainnet',
  'testnet',
  'previewnet',
  'localnet',
] as const satisfies readonly SupportedNetwork[];

// Zod schema for credentials state validation
export const CredentialsDataSchema = z.object({
  accountId: EntityIdSchema,

  privateKey: z
    .string()
    .min(1, 'Private key is required')
    .describe('Encrypted private key string'),

  network: z.enum(SUPPORTED_NETWORKS, {
    errorMap: () => ({
      message: 'Network must be one of: mainnet, testnet, previewnet, localnet',
    }),
  }),

  isDefault: z.boolean().describe('Whether this is the default credential set'),

  createdAt: z
    .string()
    .datetime()
    .describe('ISO timestamp when credentials were created'),
});

// TypeScript type inferred from Zod schema
export type CredentialsData = z.infer<typeof CredentialsDataSchema>;

// Namespace constant
export const CREDENTIALS_NAMESPACE = 'credentials';

// JSON Schema for manifest (automatically generated from Zod schema)
export const CREDENTIALS_JSON_SCHEMA = zodToJsonSchema(CredentialsDataSchema);

/**
 * Validate credentials data using Zod schema
 */
export function validateCredentialsData(
  data: unknown,
): data is CredentialsData {
  try {
    CredentialsDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate credentials data with detailed error messages
 */
export function parseCredentialsData(data: unknown): CredentialsData {
  return CredentialsDataSchema.parse(data);
}

/**
 * Safe parse credentials data (returns success/error instead of throwing)
 */
export function safeParseCredentialsData(data: unknown) {
  return CredentialsDataSchema.safeParse(data);
}
