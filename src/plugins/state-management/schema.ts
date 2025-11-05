/**
 * State Management Plugin Schema
 * Defines data structures and validation for state management operations
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ======================================================
// 1. State Entry Schema
// ======================================================

/**
 * Schema for individual state entries
 */
export const StateEntrySchema = z.object({
  key: z.string().describe('Unique key for the state entry'),
  value: z
    .unknown()
    .describe('The stored value (can be any JSON-serializable data)'),
  namespace: z.string().describe('Namespace this entry belongs to'),
  createdAt: z.string().describe('ISO timestamp when entry was created'),
  updatedAt: z.string().describe('ISO timestamp when entry was last updated'),
});

export type StateEntry = z.infer<typeof StateEntrySchema>;

// ======================================================
// 2. Namespace Information Schema
// ======================================================

/**
 * Schema for namespace information
 */
export const NamespaceInfoSchema = z.object({
  name: z.string().describe('Namespace name'),
  entryCount: z.number().describe('Number of entries in this namespace'),
  size: z.number().describe('Approximate size in bytes'),
  lastModified: z.string().describe('ISO timestamp of last modification'),
});

export type NamespaceInfo = z.infer<typeof NamespaceInfoSchema>;

// ======================================================
// 3. State Statistics Schema
// ======================================================

/**
 * Schema for state statistics
 */
export const StateStatsSchema = z.object({
  totalNamespaces: z.number().describe('Total number of namespaces'),
  totalEntries: z
    .number()
    .describe('Total number of entries across all namespaces'),
  totalSize: z.number().describe('Total size in bytes'),
  namespaces: z
    .array(NamespaceInfoSchema)
    .describe('Detailed information about each namespace'),
});

export type StateStats = z.infer<typeof StateStatsSchema>;

// ======================================================
// 4. Backup Data Schema
// ======================================================

/**
 * Schema for backup data structure
 */
export const BackupDataSchema = z.object({
  timestamp: z.string().describe('ISO timestamp when backup was created'),
  namespaces: z
    .record(z.string(), z.array(z.unknown()))
    .describe('Namespace data'),
  metadata: z.object({
    totalNamespaces: z
      .number()
      .describe('Total number of namespaces in backup'),
    totalSize: z.number().describe('Total size of backup data in bytes'),
  }),
});

export type BackupData = z.infer<typeof BackupDataSchema>;

// ======================================================
// 5. State Information Schema
// ======================================================

/**
 * Schema for state information display
 */
export const StateInfoSchema = z.object({
  storageDirectory: z.string().describe('Path to the storage directory'),
  isInitialized: z
    .boolean()
    .describe('Whether the storage directory is initialized'),
  totalEntries: z.number().describe('Total number of entries'),
  totalSize: z.number().describe('Total size in bytes'),
  namespaces: z
    .array(NamespaceInfoSchema)
    .describe('Information about each namespace'),
});

export type StateInfo = z.infer<typeof StateInfoSchema>;

// ======================================================
// 6. Clear Operation Schema
// ======================================================

/**
 * Schema for clear operation results
 */
export const ClearResultSchema = z.object({
  cleared: z.boolean().describe('Whether the operation was successful'),
  namespace: z
    .string()
    .optional()
    .describe('Namespace that was cleared (if specific)'),
  entriesCleared: z.number().describe('Number of entries that were cleared'),
  totalNamespaces: z
    .number()
    .optional()
    .describe('Total namespaces affected (if clearing all)'),
});

export type ClearResult = z.infer<typeof ClearResultSchema>;

// ======================================================
// 7. JSON Schema Exports
// ======================================================

/**
 * JSON schemas for manifest compatibility
 */
export const STATE_ENTRY_JSON_SCHEMA = zodToJsonSchema(StateEntrySchema);
export const NAMESPACE_INFO_JSON_SCHEMA = zodToJsonSchema(NamespaceInfoSchema);
export const STATE_STATS_JSON_SCHEMA = zodToJsonSchema(StateStatsSchema);
export const BACKUP_DATA_JSON_SCHEMA = zodToJsonSchema(BackupDataSchema);
export const STATE_INFO_JSON_SCHEMA = zodToJsonSchema(StateInfoSchema);
export const CLEAR_RESULT_JSON_SCHEMA = zodToJsonSchema(ClearResultSchema);

// ======================================================
// 8. Validation Functions
// ======================================================

/**
 * Validate state entry data using Zod schema
 */
export function validateStateEntry(data: unknown): data is StateEntry {
  try {
    StateEntrySchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate state entry data with detailed error messages
 */
export function parseStateEntry(data: unknown): StateEntry {
  return StateEntrySchema.parse(data);
}

/**
 * Safe parse state entry data (returns success/error instead of throwing)
 */
export function safeParseStateEntry(data: unknown) {
  return StateEntrySchema.safeParse(data);
}

/**
 * Validate namespace info data using Zod schema
 */
export function validateNamespaceInfo(data: unknown): data is NamespaceInfo {
  try {
    NamespaceInfoSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate namespace info data with detailed error messages
 */
export function parseNamespaceInfo(data: unknown): NamespaceInfo {
  return NamespaceInfoSchema.parse(data);
}

/**
 * Safe parse namespace info data (returns success/error instead of throwing)
 */
export function safeParseNamespaceInfo(data: unknown) {
  return NamespaceInfoSchema.safeParse(data);
}
