import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ConfigGetOutput } from '@/plugins/config/commands/get';
import type { ConfigListOutput } from '@/plugins/config/commands/list';
import type { ConfigSetOutput } from '@/plugins/config/commands/set';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { configGet } from '@/plugins/config/commands/get/handler';
import { configList } from '@/plugins/config/commands/list/handler';
import { configSet } from '@/plugins/config/commands/set/handler';

describe('Config Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
  });

  it('should list config options', async () => {
    const listConfigResult = await configList({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const listConfigOutput = listConfigResult.result as ConfigListOutput;
    expect(listConfigOutput.totalCount).toBe(4);
    const optionNames = listConfigOutput.options.map((option) => option.name);
    expect(optionNames).toEqual(
      expect.arrayContaining([
        'ed25519_support_enabled',
        'log_level',
        'default_key_manager',
      ]),
    );
  });

  it('should set config option and then verify it with with get method', async () => {
    const setConfigArgs: Record<string, unknown> = {
      option: 'ed25519_support_enabled',
      value: 'true',
    };
    const setConfigResult = await configSet({
      args: setConfigArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const setConfigOutput = setConfigResult.result as ConfigSetOutput;
    expect(setConfigOutput.previousValue).toBe(false);
    expect(setConfigOutput.newValue).toBe(true);

    const getConfigArgs: Record<string, unknown> = {
      option: 'ed25519_support_enabled',
    };
    const getConfigResult = await configGet({
      args: getConfigArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const getConfigOutput = getConfigResult.result as ConfigGetOutput;
    expect(getConfigOutput.name).toBe('ed25519_support_enabled');
    expect(getConfigOutput.value).toBe(true);
    expect(getConfigOutput.type).toBe('boolean');
  });
});
