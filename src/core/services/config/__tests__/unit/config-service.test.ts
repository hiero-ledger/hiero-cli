/**
 * Unit tests for ConfigServiceImpl
 * Tests configuration options listing, getting, and setting
 */
import type { StateService } from '@/core/services/state/state-service.interface';

import { makeStateMock } from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { ConfigServiceImpl } from '@/core/services/config/config-service';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';

describe('ConfigServiceImpl', () => {
  let configService: ConfigServiceImpl;
  let stateMock: jest.Mocked<StateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    stateMock = makeStateMock();
    configService = new ConfigServiceImpl(stateMock);
  });

  describe('listOptions', () => {
    it('should return all config options with default values', () => {
      stateMock.get.mockReturnValue(undefined);

      const options = configService.listOptions();

      expect(options).toHaveLength(5);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: ConfigOptionKey.ed25519_support,
            type: 'boolean',
            value: false,
          }),
          expect.objectContaining({
            name: ConfigOptionKey.log_level,
            type: 'enum',
            value: 'silent',
            allowedValues: expect.any(Array),
          }),
          expect.objectContaining({
            name: ConfigOptionKey.default_key_manager,
            type: 'enum',
            value: KeyManager.local,
            allowedValues: expect.any(Array),
          }),
        ]),
      );
    });

    it('should return stored values when available', () => {
      stateMock.get.mockImplementation((_: string, key: string) => {
        if (key === (ConfigOptionKey.ed25519_support as string)) return true;
        if (key === (ConfigOptionKey.log_level as string)) return 'debug';
        return undefined;
      });

      const options = configService.listOptions();
      const ed25519Option = options.find(
        (o) => o.name === (ConfigOptionKey.ed25519_support as string),
      );
      const logLevelOption = options.find(
        (o) => o.name === (ConfigOptionKey.log_level as string),
      );

      expect(ed25519Option?.value).toBe(true);
      expect(logLevelOption?.value).toBe('debug');
    });

    it('should include allowedValues for enum options', () => {
      stateMock.get.mockReturnValue(undefined);

      const options = configService.listOptions();
      const logLevelOption = options.find(
        (o) => o.name === (ConfigOptionKey.log_level as string),
      );
      const keyManagerOption = options.find(
        (o) => o.name === (ConfigOptionKey.default_key_manager as string),
      );

      expect(logLevelOption?.allowedValues).toBeDefined();
      expect(keyManagerOption?.allowedValues).toBeDefined();
    });
  });

  describe('getOption', () => {
    it('should return stored value for boolean option', () => {
      stateMock.get.mockReturnValue(true);

      const result = configService.getOption(ConfigOptionKey.ed25519_support);

      expect(stateMock.get).toHaveBeenCalledWith(
        'config',
        ConfigOptionKey.ed25519_support,
      );
      expect(result).toBe(true);
    });

    it('should return default value when not set', () => {
      stateMock.get.mockReturnValue(undefined);

      const result = configService.getOption(ConfigOptionKey.ed25519_support);

      expect(result).toBe(false);
    });

    it('should return default value when null', () => {
      stateMock.get.mockReturnValue(null);

      const result = configService.getOption(ConfigOptionKey.ed25519_support);

      expect(result).toBe(false);
    });

    it('should throw error for unknown option', () => {
      expect(() => configService.getOption('unknown_option')).toThrow(
        ValidationError,
      );
    });

    it('should convert value to boolean for boolean type', () => {
      stateMock.get.mockReturnValue('truthy_string');

      const result = configService.getOption(ConfigOptionKey.ed25519_support);

      expect(result).toBe(true);
    });

    it('should return default for enum when value is not allowed', () => {
      stateMock.get.mockReturnValue('invalid_level');

      const result = configService.getOption(ConfigOptionKey.log_level);

      expect(result).toBe('silent');
    });

    it('should return valid enum value', () => {
      stateMock.get.mockReturnValue('debug');

      const result = configService.getOption(ConfigOptionKey.log_level);

      expect(result).toBe('debug');
    });
  });

  describe('setOption', () => {
    it('should set boolean option', () => {
      configService.setOption(ConfigOptionKey.ed25519_support, true);

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        ConfigOptionKey.ed25519_support,
        true,
      );
    });

    it('should throw error for unknown option', () => {
      expect(() => configService.setOption('unknown_option', 'value')).toThrow(
        ValidationError,
      );
    });

    it('should throw error when setting non-boolean for boolean option', () => {
      expect(() =>
        configService.setOption(ConfigOptionKey.ed25519_support, 'not_boolean'),
      ).toThrow(ValidationError);
    });

    it('should set enum option with valid value', () => {
      configService.setOption(ConfigOptionKey.log_level, 'debug');

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        ConfigOptionKey.log_level,
        'debug',
      );
    });

    it('should throw error for invalid enum value', () => {
      expect(() =>
        configService.setOption(ConfigOptionKey.log_level, 'invalid'),
      ).toThrow(ValidationError);
    });

    it('should throw error when setting non-string for enum option', () => {
      expect(() =>
        configService.setOption(ConfigOptionKey.log_level, 123),
      ).toThrow(ValidationError);
    });

    it('should set default_key_manager enum option', () => {
      configService.setOption(
        ConfigOptionKey.default_key_manager,
        KeyManager.local,
      );

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        ConfigOptionKey.default_key_manager,
        KeyManager.local,
      );
    });
  });
});
