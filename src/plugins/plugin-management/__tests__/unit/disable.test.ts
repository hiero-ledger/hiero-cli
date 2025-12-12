/**
 * Unit tests for plugin-management disable command
 */
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import {
  PluginManagementDisableStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { disablePlugin } from '@/plugins/plugin-management/commands/disable/handler';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

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

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'custom-plugin',
    );

    const output = JSON.parse(result.outputJson!);
    expect(output.name).toBe('custom-plugin');
    expect(output.removed).toBe(true);
    expect(output.message).toContain('disabled successfully');
  });

  it('should return failure when plugin is already disabled', async () => {
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

    const result = await disablePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginAlreadyDisabled('custom-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'custom-plugin',
    );
  });

  it('should return failure when trying to disable protected plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementDisableStatus.Protected }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'plugin-management' });

    const result = await disablePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginProtectedCannotDisable('plugin-management'),
    );
    expect(result.outputJson).toBeUndefined();
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'plugin-management',
    );
  });

  it('should return failure when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      disablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementDisableStatus.NotFound }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    const result = await disablePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginNotFound('unknown-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
    expect(pluginManagement.disablePlugin).toHaveBeenCalledWith(
      'unknown-plugin',
    );
  });
});
