/**
 * Plugin Management Schema
 * Defines data types and output schemas for plugin management commands
 */
import { z } from 'zod';

// Plugin information schema
export const PluginInfoSchema = z.object({
  name: z.string().describe('Plugin name'),
  version: z.string().describe('Plugin version'),
  displayName: z.string().describe('Plugin display name'),
  description: z.string().describe('Plugin description'),
  commands: z.array(z.string()).describe('Available commands'),
  enabled: z.boolean().describe('Whether plugin is enabled'),
});

// Plugin list item schema
export const PluginListItemSchema = z.object({
  name: z.string().describe('Plugin name'),
  enabled: z.boolean().describe('Whether plugin is enabled'),
});

// Add plugin output schema
export const PluginManagementAddOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  path: z.string().describe('Plugin path'),
  added: z.boolean().describe('Whether plugin was successfully added'),
  message: z.string().describe('Result message'),
});

// Enable plugin output schema
export const PluginManagementEnableOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  path: z.string().describe('Plugin path'),
  enabled: z.boolean().describe('Whether plugin was successfully enabled'),
  message: z.string().describe('Result message'),
});

// Remove plugin output schema
export const PluginManagementRemoveOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  removed: z.boolean().describe('Whether plugin was successfully removed'),
  message: z.string().describe('Result message'),
});

// List plugins output schema
export const PluginManagementListOutputSchema = z.object({
  plugins: z.array(PluginListItemSchema).describe('List of plugins'),
  count: z.number().describe('Total number of plugins'),
});

// Plugin info output schema
export const PluginManagementInfoOutputSchema = z.object({
  plugin: PluginInfoSchema.optional().describe('Plugin information'),
  found: z.boolean().describe('Whether plugin was found'),
  message: z.string().describe('Result message'),
});

// Reset plugins output schema
export const PluginManagementResetOutputSchema = z.object({
  reset: z.boolean().describe('Whether reset was successful'),
  message: z.string().describe('Result message'),
});

// Type exports
export type PluginInfo = z.infer<typeof PluginInfoSchema>;
export type PluginListItem = z.infer<typeof PluginListItemSchema>;
export type PluginManagementAddOutput = z.infer<
  typeof PluginManagementAddOutputSchema
>;
export type PluginManagementEnableOutput = z.infer<
  typeof PluginManagementEnableOutputSchema
>;
export type PluginManagementRemoveOutput = z.infer<
  typeof PluginManagementRemoveOutputSchema
>;
export type PluginManagementListOutput = z.infer<
  typeof PluginManagementListOutputSchema
>;
export type PluginManagementInfoOutput = z.infer<
  typeof PluginManagementInfoOutputSchema
>;
export type PluginManagementResetOutput = z.infer<
  typeof PluginManagementResetOutputSchema
>;
