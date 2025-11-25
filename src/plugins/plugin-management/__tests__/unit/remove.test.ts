/**
 * Unit tests for plugin-management remove command
 */
import { Status } from '../../../../core/shared/constants';
import { removePlugin } from '../../commands/remove/handler';
import { makeArgs, makeLogger } from '../../../../__tests__/mocks/mocks';
import type { PluginManagementService } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import { PluginManagementRemoveStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';

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

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.name).toBe('custom-plugin');
    expect(output.removed).toBe(true);
    expect(output.message).toContain('removed from plugin-management state');

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should return success with message when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.NotFound,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    const result = await removePlugin(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.name).toBe('unknown-plugin');
    expect(output.removed).toBe(false);
    expect(output.message).toContain(
      'is not registered in plugin-management state',
    );
  });

  it('should protect plugin-management from being removed', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.Protected,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'plugin-management' });

    const result = await removePlugin(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.name).toBe('plugin-management');
    expect(output.removed).toBe(false);
    expect(output.message).toContain(
      'is a core plugin and cannot be removed from state via CLI',
    );

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith(
      'plugin-management',
    );
  });
});
