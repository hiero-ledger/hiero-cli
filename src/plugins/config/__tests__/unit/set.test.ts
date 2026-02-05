import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { setConfigOption } from '@/plugins/config/commands/set/handler';
import { SetConfigOutputSchema } from '@/plugins/config/commands/set/output';

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
    expect(result.status).toBe(Status.Success);
    const output = validateOutputSchema(
      result.outputJson!,
      SetConfigOutputSchema,
    );
    expect(configSvc.setOption).toHaveBeenCalledWith(
      'ed25519_support_enabled',
      true,
    );
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
    expect(result.status).toBe(Status.Success);
    expect(configSvc.setOption).toHaveBeenCalledWith('some_number', 42);
    const output = validateOutputSchema(
      result.outputJson!,
      SetConfigOutputSchema,
    );
    expect(output.newValue).toBe(42);
  });

  test('validates enum values', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue('local'),
      listOptions: jest.fn().mockReturnValue([enumOption]),
      setOption: jest.fn().mockImplementation((_name, val) => {
        if (val !== 'local' && val !== 'local_encrypted') {
          throw new Error('Invalid value for default_key_manager');
        }
      }),
    });
    const api = makeApiMock(configSvc);
    const argsBad = makeCommandArgs({
      api,
      args: { option: 'default_key_manager', value: 'invalid' },
    });
    const bad = await setConfigOption(argsBad);
    expect(bad.status).toBe(Status.Failure);
    expect(bad.errorMessage).toContain('Failed to set option');

    const argsGood = makeCommandArgs({
      api,
      args: { option: 'default_key_manager', value: 'local_encrypted' },
    });
    const ok = await setConfigOption(argsGood);
    expect(ok.status).toBe(Status.Success);
    expect(configSvc.setOption).toHaveBeenCalledWith(
      'default_key_manager',
      'local_encrypted',
    );
    expect(ok.outputJson).toBeDefined();
  });
});
