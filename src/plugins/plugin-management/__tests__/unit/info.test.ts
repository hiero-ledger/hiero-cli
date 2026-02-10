/**
 * Unit tests for plugin-management info command
 */
import type * as path from 'path';
import type { PluginStateEntry } from '@/core/plugins/plugin.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { getPluginInfo } from '@/plugins/plugin-management/commands/info/handler';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

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

const mockLoadPluginManifest = loadPluginManifest as jest.Mock;

describe('plugin-management info command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return plugin information loaded from manifest', async () => {
    const logger = makeLogger();
    const entry: PluginStateEntry = {
      name: 'topic',
      enabled: true,
      path: 'dist/plugins/topic',
    };
    const pluginManagement = {
      getPlugin: jest.fn().mockReturnValue(entry),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    mockLoadPluginManifest.mockResolvedValue({
      name: 'topic',
      version: '2.0.0',
      displayName: 'Topic Plugin',
      description: 'Manage Hedera topics',
      commands: [{ name: 'list' }, { name: 'create' }],
    });

    const args = makeArgs(api, logger, { name: 'topic' });

    const result = await getPluginInfo(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.found).toBe(true);
    expect(output.plugin.name).toBe('topic');
    expect(output.plugin.version).toBe('2.0.0');
    expect(output.plugin.displayName).toBe('Topic Plugin');
    expect(output.plugin.enabled).toBe(true);
    expect(output.plugin.description).toContain('Manage Hedera topics');
    expect(output.plugin.commands).toEqual(['list', 'create']);
  });

  it('should use fallback values when optional metadata missing', async () => {
    const logger = makeLogger();
    const entry: PluginStateEntry = {
      name: 'custom-plugin',
      path: 'dist/plugins/custom-plugin',
      enabled: true,
    };
    const pluginManagement = {
      getPlugin: jest.fn().mockReturnValue(entry),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    mockLoadPluginManifest.mockResolvedValue({
      name: 'custom-plugin',
    });

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    const result = await getPluginInfo(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.found).toBe(true);
    expect(output.plugin.name).toBe('custom-plugin');
    expect(output.plugin.version).toBe('unknown');
    expect(output.plugin.displayName).toBe('custom-plugin');
    expect(output.plugin.description).toContain('No description available');
    expect(output.plugin.commands).toEqual([]);
  });

  it('should return failure when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      getPlugin: jest.fn().mockReturnValue(undefined),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'missing-plugin' });

    const result = await getPluginInfo(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginNotFound('missing-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
  });
});
