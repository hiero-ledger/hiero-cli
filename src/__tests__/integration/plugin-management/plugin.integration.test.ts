import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AddPluginOutput } from '@/plugins/plugin-management/commands/add/output';
import type { DisablePluginOutput } from '@/plugins/plugin-management/commands/disable/output';
import type { EnablePluginOutput } from '@/plugins/plugin-management/commands/enable/output';
import type { PluginInfoOutput } from '@/plugins/plugin-management/commands/info/output';
import type { ListPluginsOutput } from '@/plugins/plugin-management/commands/list/output';
import type { RemovePluginOutput } from '@/plugins/plugin-management/commands/remove/output';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core/core-api/core-api';
import { Status } from '@/core/shared/constants';
import {
  addPlugin,
  disablePlugin,
  enablePlugin,
  getPluginInfo,
  getPluginList,
  removePlugin,
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
    const addPluginResult = await addPlugin({
      args: addPluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    if (addPluginResult.status !== Status.Success) {
      console.log(
        'Add plugin failed:',
        addPluginResult.errorMessage || addPluginResult.outputJson,
      );
    }

    expect(addPluginResult.status).toBe(Status.Success);
    const addPluginOutput: AddPluginOutput = JSON.parse(
      addPluginResult.outputJson!,
    );
    expect(addPluginOutput.path).toContain('dist/plugins/test');
    expect(addPluginOutput.name).toBe('test');
    expect(addPluginOutput.added).toBe(true);
    expect(addPluginOutput.message).toBe(
      "Plugin 'test' added and enabled successfully",
    );

    const viewPluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const viewPluginResult = await getPluginInfo({
      args: viewPluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewPluginResult.status).toBe(Status.Success);
    const viewPluginOutput: PluginInfoOutput = JSON.parse(
      viewPluginResult.outputJson!,
    );
    expect(viewPluginOutput.found).toBe(true);
    expect(viewPluginOutput.message).toBe(
      'Plugin test information retrieved successfully',
    );
    expect(viewPluginOutput.plugin?.name).toBe('test');
    expect(viewPluginOutput.plugin?.description).toBe('For integration plugin');
    expect(viewPluginOutput.plugin?.displayName).toBe('Test Plugin');
    expect(viewPluginOutput.plugin?.version).toBe('1.0.0');
    expect(viewPluginOutput.plugin?.commands.length).toBe(1);
    expect(viewPluginOutput.plugin?.enabled).toBe(true);

    const disablePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const disablePluginResult = await disablePlugin({
      args: disablePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(disablePluginResult.status).toBe(Status.Success);
    const disablePluginOutput: DisablePluginOutput = JSON.parse(
      disablePluginResult.outputJson!,
    );
    expect(disablePluginOutput.name).toBe('test');
    expect(disablePluginOutput.message).toBe(
      'Plugin test disabled successfully',
    );
    expect(disablePluginOutput.removed).toBe(true);

    const listPluginResult = await getPluginList({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(listPluginResult.status).toBe(Status.Success);
    const listPluginOutput: ListPluginsOutput = JSON.parse(
      listPluginResult.outputJson!,
    );
    const testPlugin = listPluginOutput.plugins.find(
      (plugin) => plugin.name == 'test',
    );
    expect(testPlugin?.name).toBe('test');
    expect(testPlugin?.enabled).toBe(false);

    const enablePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const enablePluginResult = await enablePlugin({
      args: enablePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(enablePluginResult.status).toBe(Status.Success);
    const enablePluginOutput: EnablePluginOutput = JSON.parse(
      enablePluginResult.outputJson!,
    );
    expect(enablePluginOutput.name).toBe('test');
    expect(enablePluginOutput.message).toBe('Plugin test enabled successfully');
    expect(enablePluginOutput.enabled).toBe(true);

    const viewPluginEnabledArgs: Record<string, unknown> = {
      name: 'test',
    };
    const viewPluginEnabledResult = await getPluginInfo({
      args: viewPluginEnabledArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(viewPluginEnabledResult.status).toBe(Status.Success);
    const viewPluginEnabledOutput: PluginInfoOutput = JSON.parse(
      viewPluginEnabledResult.outputJson!,
    );
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
    expect(viewPluginEnabledOutput.plugin?.commands.length).toBe(1);
    expect(viewPluginEnabledOutput.plugin?.enabled).toBe(true);

    const removePluginArgs: Record<string, unknown> = {
      name: 'test',
    };
    const removePluginResult = await removePlugin({
      args: removePluginArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(removePluginResult.status).toBe(Status.Success);
    const removePluginOutput: RemovePluginOutput = JSON.parse(
      removePluginResult.outputJson!,
    );
    expect(removePluginOutput.name).toBe('test');
    expect(removePluginOutput.removed).toBe(true);
    expect(removePluginOutput.message).toBe(
      'Plugin test removed from plugin-management state',
    );
  });
});
