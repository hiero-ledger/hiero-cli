/**
 * Unit tests for plugin-management remove command
 */
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import {
  PluginManagementRemoveStatus,
  type PluginManagementService,
} from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { removePlugin } from '@/plugins/plugin-management/commands/remove/handler';
import {
  type RemovePluginOutput,
  RemovePluginOutputSchema,
} from '@/plugins/plugin-management/commands/remove/output';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

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

    const output = validateOutputSchema<RemovePluginOutput>(
      result.outputJson!,
      RemovePluginOutputSchema,
    );
    expect(output.name).toBe('custom-plugin');
    expect(output.removed).toBe(true);
    expect(output.message).toContain('removed from plugin-management state');

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith('custom-plugin');
  });

  it('should return failure when plugin does not exist', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.NotFound,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'unknown-plugin' });

    const result = await removePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginNotFound('unknown-plugin'),
    );
    expect(result.outputJson).toBeUndefined();
  });

  it('should return failure when trying to remove protected plugin', async () => {
    const logger = makeLogger();
    const pluginManagement = {
      removePlugin: jest.fn().mockReturnValue({
        status: PluginManagementRemoveStatus.Protected,
      }),
    } as unknown as PluginManagementService;
    const api = { pluginManagement };

    const args = makeArgs(api, logger, { name: 'plugin-management' });

    const result = await removePlugin(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      ERROR_MESSAGES.pluginProtectedCannotRemove('plugin-management'),
    );
    expect(result.outputJson).toBeUndefined();

    expect(pluginManagement.removePlugin).toHaveBeenCalledWith(
      'plugin-management',
    );
  });
});
