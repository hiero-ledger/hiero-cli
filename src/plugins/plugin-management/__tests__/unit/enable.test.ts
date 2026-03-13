/**
 * Unit tests for plugin-management enable command
 */
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError, StateError } from '@/core/errors';
import {
  PluginManagementEnableStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { EnablePluginOutputSchema } from '@/plugins/plugin-management/commands/enable';
import { pluginManagementEnable } from '@/plugins/plugin-management/commands/enable/handler';

describe('plugin-management enable command', () => {
  it('should enable a disabled plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      enablePlugin: jest.fn().mockReturnValue({
        status: PluginManagementEnableStatus.Enabled,
        entry: {
          name: 'custom-plugin',
          path: 'dist/plugins/custom-plugin',
          enabled: true,
        },
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    const result = await pluginManagementEnable(args);
    const output = assertOutput(result.result, EnablePluginOutputSchema);

    expect(output).toBeDefined();
    expect(output.name).toBe('custom-plugin');
    expect(output.enabled).toBe(true);
    expect(output.message).toContain('enabled successfully');

    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should throw StateError when plugin is already enabled', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      enablePlugin: jest.fn().mockReturnValue({
        status: PluginManagementEnableStatus.AlreadyEnabled,
        entry: {
          name: 'custom-plugin',
          path: 'dist/plugins/custom-plugin',
          enabled: true,
        },
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'custom-plugin' });

    await expect(pluginManagementEnable(args)).rejects.toThrow(StateError);
    await expect(pluginManagementEnable(args)).rejects.toThrow(
      /Plugin custom-plugin is already enabled/,
    );
    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should throw NotFoundError when plugin does not exist in state', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      enablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementEnableStatus.NotFound }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    await expect(pluginManagementEnable(args)).rejects.toThrow(NotFoundError);
    await expect(pluginManagementEnable(args)).rejects.toThrow(
      /Plugin unknown-plugin not found in plugin-management state/,
    );
    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith(
      'unknown-plugin',
    );
  });
});
