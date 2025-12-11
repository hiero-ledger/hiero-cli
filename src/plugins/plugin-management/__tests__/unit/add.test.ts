/**
 * Unit tests for plugin-management add command
 */
import { Status } from '../../../../core/shared/constants';
import { addPlugin } from '../../commands/add/handler';
import { makeArgs, makeLogger } from '../../../../__tests__/mocks/mocks';
import type { PluginStateEntry } from '../../../../core/plugins/plugin.interface';
import { CUSTOM_PLUGIN_ENTRY } from './helpers/fixtures';
import type { PluginManagementService } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import { PluginManagementCreateStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import * as fs from 'fs/promises';

jest.mock('fs/promises', () => ({
  access: jest.fn(),
}));

// Mock path to produce predictable manifest path
jest.mock('path', () => ({
  resolve: (...segments: string[]) => segments.join('/'),
  join: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// Mock manifest module for a test plugin
jest.mock(
  'dist/plugins/custom-plugin/manifest.js',
  () => ({
    default: {
      name: 'custom-plugin',
    },
  }),
  { virtual: true },
);

describe('plugin-management add command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
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

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
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

  it('should fail when plugin with the same name already exists in state', async () => {
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

    const result = await addPlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.name).toBe('custom-plugin');
    expect(output.added).toBe(false);
    expect(output.message).toContain('already exists');

    expect(pluginManagement.addPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'custom-plugin' }),
    );
  });

  it('should fail when manifest.js does not exist', async () => {
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

    const result = await addPlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Plugin manifest not found at');
    expect(result.errorMessage).toContain('manifest.js');
    expect(result.errorMessage).toContain(
      'Make sure the plugin directory contains a manifest.js file',
    );
    expect(pluginManagement.addPlugin).not.toHaveBeenCalled();
  });
});
