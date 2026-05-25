import { assertOutput } from '@/__tests__/utils/assert-output';
import { ConfigurationError } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { ConfigGetOutputSchema } from '@/plugins/config/commands/get';
import { configGet } from '@/plugins/config/commands/get/handler';

import { enumOption } from './helpers/fixtures';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';

describe('config plugin - get', () => {
  test('returns option value and allowedValues for enum', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue(KeyManager.local),
      listOptions: jest.fn().mockReturnValue([enumOption]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: ConfigOptionKey.default_key_manager },
    });

    const result = await configGet(args);
    const output = assertOutput(result.result, ConfigGetOutputSchema);
    expect(output.name).toBe(ConfigOptionKey.default_key_manager);
    expect(output.type).toBe('enum');
    expect(output.value).toBe(KeyManager.local);
    expect(output.allowedValues).toEqual([
      KeyManager.local,
      KeyManager.local_encrypted,
    ]);
  });

  test('throws when getOption fails', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockImplementation(() => {
        throw new ConfigurationError('Option not found');
      }),
      listOptions: jest.fn().mockReturnValue([]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: 'nonexistent_option' },
    });

    await expect(configGet(args)).rejects.toThrow('Option not found');
  });
});
