/**
 * Unit tests for plugin-management info command
 */
import type * as path from 'path';
import type { PluginStateEntry } from '@/core/plugins/plugin.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { getPluginInfo } from '@/plugins/plugin-management/commands/info/handler';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

/**
 * Mock path.resolve to redirect manifest.js imports to test fixtures.
 * This is necessary because Jest 30 doesn't properly handle virtual mocks
 * with dynamic imports (await import()).
 */
jest.mock('path', () => {
  const actualPath = jest.requireActual<typeof path>('path');
  return {
    ...actualPath,
    resolve: jest.fn((...segments: string[]) => {
      const joined = segments.join('/');

      // Redirect plugin manifests to test fixtures
      // Handler calls: path.resolve(basePath, 'manifest.js')
      // where basePath is 'dist/plugins/topic' or 'dist/plugins/custom-plugin'
      if (
        joined.includes('dist/plugins/topic') &&
        joined.endsWith('manifest.js')
      ) {
        return actualPath.resolve(__dirname, '../fixtures/topic-manifest.js');
      }
      if (
        joined.includes('dist/plugins/custom-plugin') &&
        joined.endsWith('manifest.js')
      ) {
        return actualPath.resolve(
          __dirname,
          '../fixtures/custom-plugin-manifest.js',
        );
      }

      return joined;
    }),
    join: jest.fn(),
  };
});

jest.mock(
  'dist/plugins/topic/manifest.js',
  () => ({
    default: {
      name: 'topic',
      version: '2.0.0',
      displayName: 'Topic Plugin',
      description: 'Manage Hedera topics',
      commands: [{ name: 'list' }, { name: 'create' }],
      capabilities: ['topic:list', 'topic:create'],
    },
  }),
  { virtual: true },
);

jest.mock(
  'dist/plugins/custom-plugin/manifest.js',
  () => ({
    default: {
      name: 'custom-plugin',
    },
  }),
  { virtual: true },
);

describe('plugin-management info command', () => {
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
    expect(output.plugin.capabilities).toEqual(['topic:list', 'topic:create']);
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
    expect(output.plugin.capabilities).toEqual([]);
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
