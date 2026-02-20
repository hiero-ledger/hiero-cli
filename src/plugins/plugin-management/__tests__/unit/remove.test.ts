/**
 * Unit tests for plugin-management remove command
 */
import type { RemovePluginOutput } from '@/plugins/plugin-management/commands/remove/output';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError } from '@/core/errors';
import {
  PluginManagementRemoveStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { removePlugin } from '@/plugins/plugin-management/commands/remove/handler';

describe('plugin-management remove command', () => {
  it('should remove an existing plugin from state', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.Removed,
        entry: {
          name: 'custom-plugin',
          path: 'dist/plugins/custom-plugin',
          enabled: true,
        },
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    const result = await removePlugin(args);
    const output = result.result as RemovePluginOutput;

    expect(output).toBeDefined();
    expect(output.name).toBe('custom-plugin');
    expect(output.removed).toBe(true);
    expect(output.message).toContain('removed from plugin-management state');

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should throw NotFoundError when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.NotFound,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    await expect(removePlugin(args)).rejects.toThrow(NotFoundError);
    await expect(removePlugin(args)).rejects.toThrow(
      /Plugin unknown-plugin not found in plugin-management state/,
    );
  });

  it('should throw StateError when trying to remove protected plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.Protected,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'plugin-management' });

    await expect(removePlugin(args)).rejects.toThrow(StateError);
    await expect(removePlugin(args)).rejects.toThrow(
      /plugin-management is a core plugin and cannot be removed from state via CLI/,
    );

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith(
      'plugin-management',
    );
  });
});
