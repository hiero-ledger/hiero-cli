/**
 * Unit tests for plugin-management add command
 */
import type * as path from 'path';
import type { PluginStateEntry } from '@/core/plugins/plugin.interface';
import type { AddPluginOutput } from '@/plugins/plugin-management/commands/add/output';

import * as fs from 'fs/promises';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { FileError, StateError } from '@/core/errors';
import {
  PluginManagementCreateStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { addPlugin } from '@/plugins/plugin-management/commands/add/handler';

import { CUSTOM_PLUGIN_ENTRY } from './helpers/fixtures';

jest.mock('fs/promises', () => ({
  access: jest.fn(),
}));

jest.mock('@/core/utils/load-plugin-manifest', () => ({
  loadPluginManifest: jest.fn(),
}));

jest.mock('path', () => {
  const actualPath = jest.requireActual<typeof path>('path');
  return {
    ...actualPath,
    resolve: jest.fn((...segments: string[]) => segments.join('/')),
    join: jest.fn(),
  };
});

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLoadPluginManifest = loadPluginManifest as jest.Mock;

describe('plugin-management add command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
    mockLoadPluginManifest.mockResolvedValue({ name: 'custom-plugin' });
  });

  it('should add a new plugin from path and enable it when manifest is valid and name does not exist', async () => {
    const logger = makeLogger();
    const createdEntry: PluginStateEntry = {
      name: 'custom-plugin',
      path: 'dist/plugins/custom-plugin',
      enabled: true,
    };
    const pluginManagement = {
      addPlugin: jest.fn().mockReturnValue({
        status: PluginManagementCreateStatus.Created,
        entry: createdEntry,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, {
      path: 'dist/plugins/custom-plugin',
    });

    const result = await addPlugin(args);
    const output = result.result as AddPluginOutput;

    expect(output).toBeDefined();
    expect(output.added).toBe(true);
    expect(output.message).toContain('added and enabled successfully');

    expect(pluginManagement.addPlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'custom-plugin',
        path: 'dist/plugins/custom-plugin',
        enabled: true,
      }),
    );
  });

  it('should throw StateError when plugin with the same name already exists in state', async () => {
    const logger = makeLogger();
    const existingEntry: PluginStateEntry = { ...CUSTOM_PLUGIN_ENTRY };
    const pluginManagement = {
      addPlugin: jest.fn().mockReturnValue({
        status: PluginManagementCreateStatus.Duplicate,
        entry: existingEntry,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, {
      path: 'dist/plugins/custom-plugin',
    });

    await expect(addPlugin(args)).rejects.toThrow(StateError);
    await expect(addPlugin(args)).rejects.toThrow(/already exists/);

    expect(pluginManagement.addPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'custom-plugin' }),
    );
  });

  it('should throw FileError when manifest.js does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      addPlugin: jest.fn(),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, {
      path: 'dist/plugins/custom-plugin',
    });

    const error = new Error('ENOENT');
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    mockFs.access.mockRejectedValue(error);

    await expect(addPlugin(args)).rejects.toThrow(FileError);
    await expect(addPlugin(args)).rejects.toThrow(
      /Plugin manifest not found at/,
    );
    await expect(addPlugin(args)).rejects.toThrow(/manifest.js/);
    await expect(addPlugin(args)).rejects.toThrow(
      /Make sure the plugin directory contains a manifest.js file/,
    );
    expect(pluginManagement.addPlugin).not.toHaveBeenCalled();
  });
});
