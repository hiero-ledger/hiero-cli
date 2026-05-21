import { assertOutput } from '@/__tests__/utils/assert-output';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import {
  configSet,
  ConfigSetOutputSchema,
} from '@/plugins/config/commands/set';

import { enumOption } from './helpers/fixtures';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';

describe('config plugin - set', () => {
  test('parses boolean value and sets', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue(false),
      listOptions: jest.fn().mockReturnValue([
        {
          name: ConfigOptionKey.ed25519_support,
          type: 'boolean',
          value: false,
        },
      ]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { [ConfigOptionKey.ed25519_support]: 'true' },
    });

    const result = await configSet(args);
    expect(configSvc.setOption).toHaveBeenCalledWith(
      ConfigOptionKey.ed25519_support,
      true,
    );
    const output = assertOutput(result.result, ConfigSetOutputSchema);
    expect(output.name).toBe(ConfigOptionKey.ed25519_support);
    expect(output.previousValue).toBe(false);
    expect(output.newValue).toBe(true);
  });

  test('errors when no flags are provided', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn(),
      listOptions: jest.fn().mockReturnValue([]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({ api, args: {} });

    await expect(configSet(args)).rejects.toThrow(
      'Exactly one config option flag must be provided',
    );
  });

  test('errors when multiple flags are provided', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn(),
      listOptions: jest.fn().mockReturnValue([]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: {
        [ConfigOptionKey.ed25519_support]: 'true',
        [ConfigOptionKey.skip_confirmations]: 'false',
      },
    });

    await expect(configSet(args)).rejects.toThrow(
      'Exactly one config option flag must be provided',
    );
  });

  test('rejects invalid enum value at schema level', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue('local'),
      listOptions: jest.fn().mockReturnValue([enumOption]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);

    const argsBad = makeCommandArgs({
      api,
      args: { [ConfigOptionKey.default_key_manager]: 'invalid' },
    });
    await expect(configSet(argsBad)).rejects.toThrow();
    expect(configSvc.setOption).not.toHaveBeenCalled();
  });

  test('accepts valid enum value for default_key_manager', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue('local'),
      listOptions: jest.fn().mockReturnValue([enumOption]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);

    const argsGood = makeCommandArgs({
      api,
      args: { [ConfigOptionKey.default_key_manager]: 'local_encrypted' },
    });
    await configSet(argsGood);
    expect(configSvc.setOption).toHaveBeenCalledWith(
      ConfigOptionKey.default_key_manager,
      'local_encrypted',
    );
  });
});
