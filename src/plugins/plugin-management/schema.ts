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
  capabilities: z.array(z.string()).describe('Plugin capabilities'),
  enabled: z.boolean().describe('Whether plugin is enabled'),
});

// Plugin list item schema
export const PluginListItemSchema = z.object({
  name: z.string().describe('Plugin name'),
  enabled: z.boolean().describe('Whether plugin is enabled'),
});

// Add plugin output schema
export const AddPluginOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  path: z.string().describe('Plugin path'),
  added: z.boolean().describe('Whether plugin was successfully added'),
  message: z.string().describe('Result message'),
});

// Enable plugin output schema
export const EnablePluginOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  path: z.string().describe('Plugin path'),
  enabled: z.boolean().describe('Whether plugin was successfully enabled'),
  message: z.string().describe('Result message'),
});

// Remove plugin output schema
export const RemovePluginOutputSchema = z.object({
  name: z.string().describe('Plugin name'),
  removed: z.boolean().describe('Whether plugin was successfully removed'),
  message: z.string().describe('Result message'),
});

// List plugins output schema
export const ListPluginsOutputSchema = z.object({
  plugins: z.array(PluginListItemSchema).describe('List of plugins'),
  count: z.number().describe('Total number of plugins'),
});

// Plugin info output schema
export const PluginInfoOutputSchema = z.object({
  plugin: PluginInfoSchema.optional().describe('Plugin information'),
  found: z.boolean().describe('Whether plugin was found'),
  message: z.string().describe('Result message'),
});

// Type exports
export type PluginInfo = z.infer<typeof PluginInfoSchema>;
export type PluginListItem = z.infer<typeof PluginListItemSchema>;
export type AddPluginOutput = z.infer<typeof AddPluginOutputSchema>;
export type EnablePluginOutput = z.infer<typeof EnablePluginOutputSchema>;
export type RemovePluginOutput = z.infer<typeof RemovePluginOutputSchema>;
export type ListPluginsOutput = z.infer<typeof ListPluginsOutputSchema>;
export type PluginInfoOutput = z.infer<typeof PluginInfoOutputSchema>;
