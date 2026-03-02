import type { SetConfigOutput } from '@/plugins/config/commands/set/output';

import { ConfigurationError } from '@/core';
import { setConfigOption } from '@/plugins/config/commands/set/handler';

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
      listOptions: jest
        .fn()
        .mockReturnValue([
          { name: 'ed25519_support_enabled', type: 'boolean', value: false },
        ]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: 'ed25519_support_enabled', value: 'true' },
    });

    const result = await setConfigOption(args);
    expect(configSvc.setOption).toHaveBeenCalledWith(
      'ed25519_support_enabled',
      true,
    );
    const output = result.result as SetConfigOutput;
    expect(output.name).toBe('ed25519_support_enabled');
    expect(output.previousValue).toBe(false);
    expect(output.newValue).toBe(true);
  });

  test('parses numeric value and sets', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue(1),
      listOptions: jest
        .fn()
        .mockReturnValue([{ name: 'some_number', type: 'number', value: 1 }]),
      setOption: jest.fn(),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: 'some_number', value: '42' },
    });

    const result = await setConfigOption(args);
    expect(configSvc.setOption).toHaveBeenCalledWith('some_number', 42);
    const output = result.result as SetConfigOutput;
    expect(output.newValue).toBe(42);
  });

  test('validates enum values', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue('local'),
      listOptions: jest.fn().mockReturnValue([enumOption]),
      setOption: jest.fn().mockImplementation((_name, val) => {
        if (val !== 'local' && val !== 'local_encrypted') {
          throw new ConfigurationError('Invalid value for default_key_manager');
        }
      }),
    });
    const api = makeApiMock(configSvc);

    const argsBad = makeCommandArgs({
      api,
      args: { option: 'default_key_manager', value: 'invalid' },
    });
    await expect(setConfigOption(argsBad)).rejects.toThrow(
      'Invalid value for default_key_manager',
    );

    const argsGood = makeCommandArgs({
      api,
      args: { option: 'default_key_manager', value: 'local_encrypted' },
    });
    await setConfigOption(argsGood);
    expect(configSvc.setOption).toHaveBeenCalledWith(
      'default_key_manager',
      'local_encrypted',
    );
  });
});
