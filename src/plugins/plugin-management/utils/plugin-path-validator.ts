/**
 * Plugin Path Validation Utilities
 * Utilities for validating plugin directory paths and manifest files
 */
import * as path from 'path';
import * as fs from 'fs/promises';

export interface PluginPathValidationResult {
  resolvedPath: string;
  manifestPath: string;
}

/**
 * Validates a plugin path and returns resolved paths
 * @param pluginPath - The plugin path to validate (can be relative or absolute)
 * @returns Object with resolved paths if valid
 * @throws Error if manifest.js is missing
 */
export async function validatePluginPath(
  pluginPath: string,
): Promise<PluginPathValidationResult> {
  const resolvedPath = path.resolve(String(pluginPath));
  const manifestPath = path.resolve(resolvedPath, 'manifest.js');

  // Validate manifest.js exists
  try {
    await fs.access(manifestPath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Plugin manifest not found at: ${manifestPath}\nMake sure the plugin directory contains a manifest.js file.`,
      );
    }
    throw error;
  }

  return {
    resolvedPath,
    manifestPath,
  };
}
