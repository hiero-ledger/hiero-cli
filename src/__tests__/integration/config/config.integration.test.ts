import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ConfigGetOutput } from '@/plugins/config/commands/get';
import type { ConfigListOutput } from '@/plugins/config/commands/list';
import type { ConfigSetOutput } from '@/plugins/config/commands/set';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { configGet } from '@/plugins/config/commands/get/handler';
import { configList } from '@/plugins/config/commands/list/handler';
import { configSet } from '@/plugins/config/commands/set/handler';

describe('Config Integration Tests', () => {
  let coreApi: CoreApi;
  let originalEd25519Support: boolean;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    originalEd25519Support = coreApi.config.getOption<boolean>(
      ConfigOptionKey.ed25519_support,
    );
    await setDefaultOperatorForNetwork(coreApi);
  });

  afterAll(async () => {
    // The test state is shared with the other suites, which still need ED25519
    // support while importing the operator key.
    const currentEd25519Support = coreApi.config.getOption<boolean>(
      ConfigOptionKey.ed25519_support,
    );
    if (currentEd25519Support !== originalEd25519Support) {
      await configSet({
        args: {
          [ConfigOptionKey.ed25519_support]: String(originalEd25519Support),
        },
        api: coreApi,
      });
    }
  });

  it('should list config options', async () => {
    const listConfigResult = await configList({
      args: {},
      api: coreApi,
    });

    const listConfigOutput = listConfigResult.result as ConfigListOutput;
    expect(listConfigOutput.totalCount).toBe(6);
    const optionNames = listConfigOutput.options.map((option) => option.name);
    expect(optionNames).toEqual(
      expect.arrayContaining([
        ConfigOptionKey.ed25519_support,
        ConfigOptionKey.log_level,
        ConfigOptionKey.default_key_manager,
        ConfigOptionKey.skip_confirmations,
        ConfigOptionKey.portal_pat,
        ConfigOptionKey.default_max_transaction_fee,
      ]),
    );
  });

  it('should set config option and then verify it with with get method', async () => {
    const targetEd25519Support = !originalEd25519Support;
    const setConfigArgs: Record<string, unknown> = {
      [ConfigOptionKey.ed25519_support]: String(targetEd25519Support),
    };
    const setConfigResult = await configSet({
      args: setConfigArgs,
      api: coreApi,
    });
    const setConfigOutput = setConfigResult.result as ConfigSetOutput;
    expect(setConfigOutput.previousValue).toBe(originalEd25519Support);
    expect(setConfigOutput.newValue).toBe(targetEd25519Support);

    const getConfigArgs: Record<string, unknown> = {
      option: ConfigOptionKey.ed25519_support,
    };
    const getConfigResult = await configGet({
      args: getConfigArgs,
      api: coreApi,
    });
    const getConfigOutput = getConfigResult.result as ConfigGetOutput;
    expect(getConfigOutput.name).toBe(ConfigOptionKey.ed25519_support);
    expect(getConfigOutput.value).toBe(targetEd25519Support);
    expect(getConfigOutput.type).toBe('boolean');
  });
});
