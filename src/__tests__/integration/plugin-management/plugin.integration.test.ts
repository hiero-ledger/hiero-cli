import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AddPluginOutput } from '@/plugins/plugin-management/commands/add/output';
import type { DisablePluginOutput } from '@/plugins/plugin-management/commands/disable/output';
import type { EnablePluginOutput } from '@/plugins/plugin-management/commands/enable/output';
import type { PluginInfoOutput } from '@/plugins/plugin-management/commands/info/output';
import type { ListPluginsOutput } from '@/plugins/plugin-management/commands/list/output';
import type { RemovePluginOutput } from '@/plugins/plugin-management/commands/remove/output';
import type { ResetPluginsOutput } from '@/plugins/plugin-management/commands/reset/output';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import {
  pluginManagementAdd,
  pluginManagementDisable,
  pluginManagementEnable,
  pluginManagementInfo,
  pluginManagementList,
  pluginManagementRemove,
  pluginManagementReset,
} from '@/plugins/plugin-management';

describe('Plugin Management Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
  });

  it('full test that creates, view, enable disable and removes plugin', async () => {
    const addPluginArgs: Record<string, unknown> = {
      path: 'dist/plugins/test',
    };
    const addPluginResult = await pluginManagementAdd({
      args: addPluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const addPluginOutput = addPluginResult.result as AddPluginOutput;
    expect(addPluginOutput.path).toContain('dist/plugins/test');
    expect(addPluginOutput.name).toBe('test');
    expect(addPluginOutput.added).toBe(true);
    expect(addPluginOutput.message).toBe(
      "Plugin 'test' added and enabled successfully",
    );

    const viewPluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const viewPluginResult = await pluginManagementInfo({
      args: viewPluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewPluginOutput = viewPluginResult.result as PluginInfoOutput;
    expect(viewPluginOutput.found).toBe(true);
    expect(viewPluginOutput.message).toBe(
      'Plugin test information retrieved successfully',
    );
    expect(viewPluginOutput.plugin?.name).toBe('test');
    expect(viewPluginOutput.plugin?.description).toBe('For integration plugin');
    expect(viewPluginOutput.plugin?.displayName).toBe('Test Plugin');
    expect(viewPluginOutput.plugin?.version).toBe('1.0.0');
    expect(viewPluginOutput.plugin?.commands.length).toBe(2);
    expect(viewPluginOutput.plugin?.enabled).toBe(true);

    const disablePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const disablePluginResult = await pluginManagementDisable({
      args: disablePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const disablePluginOutput =
      disablePluginResult.result as DisablePluginOutput;
    expect(disablePluginOutput.name).toBe('test');
    expect(disablePluginOutput.message).toBe(
      'Plugin test disabled successfully',
    );
    expect(disablePluginOutput.removed).toBe(true);

    const listPluginResult = await pluginManagementList({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listPluginOutput = listPluginResult.result as ListPluginsOutput;
    const testPlugin = listPluginOutput.plugins.find(
      (plugin) => plugin.name == 'test',
    );
    expect(testPlugin?.name).toBe('test');
    expect(testPlugin?.enabled).toBe(false);

    const enablePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const enablePluginResult = await pluginManagementEnable({
      args: enablePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const enablePluginOutput = enablePluginResult.result as EnablePluginOutput;
    expect(enablePluginOutput.name).toBe('test');
    expect(enablePluginOutput.message).toBe('Plugin test enabled successfully');
    expect(enablePluginOutput.enabled).toBe(true);

    const viewPluginEnabledArgs: Record<string, unknown> = {
      name: 'test',
    };
    const viewPluginEnabledResult = await pluginManagementInfo({
      args: viewPluginEnabledArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const viewPluginEnabledOutput =
      viewPluginEnabledResult.result as PluginInfoOutput;
    expect(viewPluginEnabledOutput.found).toBe(true);
    expect(viewPluginEnabledOutput.message).toBe(
      'Plugin test information retrieved successfully',
    );
    expect(viewPluginEnabledOutput.plugin?.name).toBe('test');
    expect(viewPluginEnabledOutput.plugin?.description).toBe(
      'For integration plugin',
    );
    expect(viewPluginEnabledOutput.plugin?.displayName).toBe('Test Plugin');
    expect(viewPluginEnabledOutput.plugin?.version).toBe('1.0.0');
    expect(viewPluginEnabledOutput.plugin?.commands.length).toBe(2);
    expect(viewPluginEnabledOutput.plugin?.enabled).toBe(true);

    const removePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const removePluginResult = await pluginManagementRemove({
      args: removePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const removePluginOutput = removePluginResult.result as RemovePluginOutput;
    expect(removePluginOutput.name).toBe('test');
    expect(removePluginOutput.removed).toBe(true);
    expect(removePluginOutput.message).toBe(
      'Plugin test removed from plugin-management state',
    );
  });

  it('reset clears plugin state and removes custom plugins', async () => {
    const addPluginArgs: Record<string, unknown> = {
      path: 'dist/plugins/test',
    };
    const addPluginResult = await pluginManagementAdd({
      args: addPluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const addOutput = addPluginResult.result as AddPluginOutput;
    expect(addOutput.added).toBe(true);

    const listBeforeReset = await pluginManagementList({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listBeforeOutput = listBeforeReset.result as ListPluginsOutput;
    expect(listBeforeOutput.plugins.some((p) => p.name === 'test')).toBe(true);

    const resetResult = await pluginManagementReset({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const resetOutput = resetResult.result as ResetPluginsOutput;
    expect(resetOutput.reset).toBe(true);
    expect(resetOutput.message).toBe(
      'Plugin state has been reset successfully.',
    );

    const listAfterReset = await pluginManagementList({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listAfterOutput = listAfterReset.result as ListPluginsOutput;
    expect(listAfterOutput.plugins.some((p) => p.name === 'test')).toBe(false);
    expect(listAfterOutput.count).toBe(0);
  });
});
