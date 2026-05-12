/**
 * Plugin Path Validation Utilities
 * Utilities for validating plugin directory paths and manifest files
 */
import * as fs from 'fs/promises';
import * as path from 'path';

import { FileError } from '@/core/errors';

export interface PluginPathValidationResult {
  resolvedPath: string;
  manifestPath: string;
}

/**
 * Validates a plugin path and returns resolved paths
 * @param pluginPath - The plugin path to validate (can be relative or absolute)
 * @returns Object with resolved paths if valid
 * @throws FileError if manifest.js is missing
 */
export async function validatePluginPath(
  pluginPath: string,
): Promise<PluginPathValidationResult> {
  const resolvedPath = path.resolve(String(pluginPath));
  const manifestPath = path.resolve(resolvedPath, 'manifest.js');

  try {
    await fs.access(manifestPath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new FileError(
        `Plugin manifest not found at: ${manifestPath}\nMake sure the plugin directory contains a manifest.js file.`,
        { context: { manifestPath, resolvedPath }, cause: error },
      );
    }
    throw error;
  }

  return {
    resolvedPath,
    manifestPath,
  };
}
