import type { PluginManifest } from '@/core/plugins/plugin.types';

import { createJiti } from 'jiti';

const jitiInstance = createJiti(__filename, {
  interopDefault: true,
});

function isPluginManifest(value: unknown): value is PluginManifest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && record.name.length > 0;
}

function extractManifest(moduleExports: unknown): PluginManifest {
  if (moduleExports && typeof moduleExports === 'object') {
    const exports = moduleExports as Record<string, unknown>;

    if (isPluginManifest(exports.default)) {
      return exports.default;
    }

    for (const key of Object.keys(exports)) {
      if (key === 'default' || key === '__esModule') continue;
      const value = exports[key];
      if (isPluginManifest(value)) {
        return value;
      }
    }
  }

  throw new Error('No valid plugin manifest found.');
}

/**
 * Loads a plugin manifest from a file path, supporting both CommonJS and ES modules.
 * Uses jiti for automatic format detection and interoperability.
 * @param manifestPath - Absolute path to the manifest.js file
 * @returns The loaded plugin manifest
 * @throws Error if the manifest cannot be loaded or is invalid
 */
export async function loadPluginManifest(
  manifestPath: string,
): Promise<PluginManifest> {
  try {
    const moduleExports = await jitiInstance.import(manifestPath);
    return extractManifest(moduleExports);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load plugin manifest from ${manifestPath}: ${errorMessage}`,
    );
  }
}
