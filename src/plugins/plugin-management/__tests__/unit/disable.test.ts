/**
 * Unit tests for plugin-management disable command
 */
import type { DisablePluginOutput } from '@/plugins/plugin-management/commands/disable/output';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError } from '@/core/errors';
import {
  PluginManagementDisableStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { disablePlugin } from '@/plugins/plugin-management/commands/disable/handler';

describe('plugin-management disable command', () => {
  it('should disable an enabled plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest.fn().mockReturnValue({
        status: PluginManagementDisableStatus.Disabled,
        entry: {
          name: 'custom-plugin',
          path: 'dist/plugins/custom-plugin',
          enabled: false,
          status: 'unloaded',
        },
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    const result = await disablePlugin(args);
    const output = result.result as DisablePluginOutput;

    expect(output).toBeDefined();
    expect(output.name).toBe('custom-plugin');
    expect(output.removed).toBe(true);
    expect(output.message).toContain('disabled successfully');

    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'custom-plugin',
    );
  });

  it('should throw StateError when plugin is already disabled', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest.fn().mockReturnValue({
        status: PluginManagementDisableStatus.AlreadyDisabled,
        entry: {
          name: 'custom-plugin',
          path: 'dist/plugins/custom-plugin',
          enabled: false,
          status: 'unloaded',
        },
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    await expect(disablePlugin(args)).rejects.toThrow(StateError);
    await expect(disablePlugin(args)).rejects.toThrow(
      /Plugin custom-plugin is already disabled/,
    );
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'custom-plugin',
    );
  });

  it('should throw StateError when trying to disable protected plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementDisableStatus.Protected }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'plugin-management' });

    await expect(disablePlugin(args)).rejects.toThrow(StateError);
    await expect(disablePlugin(args)).rejects.toThrow(
      /Plugin plugin-management is protected and cannot be disabled/,
    );
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'plugin-management',
    );
  });

  it('should throw NotFoundError when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementDisableStatus.NotFound }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    await expect(disablePlugin(args)).rejects.toThrow(NotFoundError);
    await expect(disablePlugin(args)).rejects.toThrow(
      /Plugin unknown-plugin not found in plugin-management state/,
    );
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'unknown-plugin',
    );
  });
});
