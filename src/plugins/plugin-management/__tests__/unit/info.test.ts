/**
 * Unit tests for plugin-management info command
 */
import { Status } from '../../../../core/shared/constants';
import { getPluginInfo } from '../../commands/info/handler';
import { makeArgs, makeLogger } from '../../../../__tests__/mocks/mocks';
import type { PluginManagementService } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import type { PluginStateEntry } from '../../../../core/plugins/plugin.interface';

jest.mock('path', () => ({
  resolve: (...segments: string[]) => segments.join('/'),
  join: jest.fn(),
}));

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

  it('should return not found when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      getPlugin: jest.fn().mockReturnValue(undefined),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'missing-plugin' });

    const result = await getPluginInfo(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.found).toBe(false);
    expect(output.message).toContain('missing-plugin');
  });
});
