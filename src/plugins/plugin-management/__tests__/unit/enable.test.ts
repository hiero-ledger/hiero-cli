/**
 * Unit tests for plugin-management enable command
 */
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import {
  PluginManagementEnableStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { enablePlugin } from '@/plugins/plugin-management/commands/enable/handler';
import { EnablePluginOutputSchema } from '@/plugins/plugin-management/commands/enable/output';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

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

    const result = await enablePlugin(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith('custom-plugin');

    const output = validateOutputSchema(
      result.outputJson!,
      EnablePluginOutputSchema,
    );
    expect(output.name).toBe('custom-plugin');
    expect(output.enabled).toBe(true);
    expect(output.message).toContain('enabled successfully');
  });

  it('should return failure when plugin is already enabled', async () => {
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

    const result = await enablePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginAlreadyEnabled('custom-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should return failure when plugin does not exist in state', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      enablePlugin: jest
        .fn()
        .mockReturnValue({ status: PluginManagementEnableStatus.NotFound }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    const result = await enablePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginNotFound('unknown-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
    expect(pluginManagement.enablePlugin).toHaveBeenCalledWith(
      'unknown-plugin',
    );
  });
});
