/**
 * Unit tests for ConfigServiceImpl
 * Tests configuration options listing, getting, and setting
 */
import { makeStateMock } from '@/__tests__/mocks/mocks';
import { ConfigServiceImpl } from '@/core/services/config/config-service';
import type { StateService } from '@/core/services/state/state-service.interface';

describe('ConfigServiceImpl', () => {
  let configService: ConfigServiceImpl;
  let stateMock: jest.Mocked<StateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    stateMock = makeStateMock() as jest.Mocked<StateService>;
    configService = new ConfigServiceImpl(stateMock);
  });

  describe('listOptions', () => {
    it('should return all config options with default values', () => {
      stateMock.get.mockReturnValue(undefined);

      const options = configService.listOptions();

      expect(options).toHaveLength(3);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'ed25519_support_enabled',
            type: 'boolean',
            value: false,
          }),
          expect.objectContaining({
            name: 'log_level',
            type: 'enum',
            value: 'silent',
            allowedValues: expect.any(Array),
          }),
          expect.objectContaining({
            name: 'default_key_manager',
            type: 'enum',
            value: 'local',
            allowedValues: expect.any(Array),
          }),
        ]),
      );
    });

    it('should return stored values when available', () => {
      stateMock.get.mockImplementation((_: string, key: string) => {
        if (key === 'ed25519_support_enabled') return true;
        if (key === 'log_level') return 'debug';
        return undefined;
      });

      const options = configService.listOptions();
      const ed25519Option = options.find(
        (o) => o.name === 'ed25519_support_enabled',
      );
      const logLevelOption = options.find((o) => o.name === 'log_level');

      expect(ed25519Option?.value).toBe(true);
      expect(logLevelOption?.value).toBe('debug');
    });

    it('should include allowedValues for enum options', () => {
      stateMock.get.mockReturnValue(undefined);

      const options = configService.listOptions();
      const logLevelOption = options.find((o) => o.name === 'log_level');
      const keyManagerOption = options.find(
        (o) => o.name === 'default_key_manager',
      );

      expect(logLevelOption?.allowedValues).toBeDefined();
      expect(keyManagerOption?.allowedValues).toBeDefined();
    });
  });

  describe('getOption', () => {
    it('should return stored value for boolean option', () => {
      stateMock.get.mockReturnValue(true);

      const result = configService.getOption('ed25519_support_enabled');

      expect(stateMock.get).toHaveBeenCalledWith(
        'config',
        'ed25519_support_enabled',
      );
      expect(result).toBe(true);
    });

    it('should return default value when not set', () => {
      stateMock.get.mockReturnValue(undefined);

      const result = configService.getOption('ed25519_support_enabled');

      expect(result).toBe(false);
    });

    it('should return default value when null', () => {
      stateMock.get.mockReturnValue(null);

      const result = configService.getOption('ed25519_support_enabled');

      expect(result).toBe(false);
    });

    it('should throw error for unknown option', () => {
      expect(() => configService.getOption('unknown_option')).toThrow(
        'Unknown config option: unknown_option',
      );
    });

    it('should convert value to boolean for boolean type', () => {
      stateMock.get.mockReturnValue('truthy_string');

      const result = configService.getOption('ed25519_support_enabled');

      expect(result).toBe(true);
    });

    it('should return default for enum when value is not allowed', () => {
      stateMock.get.mockReturnValue('invalid_level');

      const result = configService.getOption('log_level');

      expect(result).toBe('silent');
    });

    it('should return valid enum value', () => {
      stateMock.get.mockReturnValue('debug');

      const result = configService.getOption('log_level');

      expect(result).toBe('debug');
    });
  });

  describe('setOption', () => {
    it('should set boolean option', () => {
      configService.setOption('ed25519_support_enabled', true);

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        'ed25519_support_enabled',
        true,
      );
    });

    it('should throw error for unknown option', () => {
      expect(() => configService.setOption('unknown_option', 'value')).toThrow(
        'Unknown config option: unknown_option',
      );
    });

    it('should throw error when setting non-boolean for boolean option', () => {
      expect(() =>
        configService.setOption('ed25519_support_enabled', 'not_boolean'),
      ).toThrow('Invalid value for ed25519_support_enabled: expected boolean');
    });

    it('should set enum option with valid value', () => {
      configService.setOption('log_level', 'debug');

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        'log_level',
        'debug',
      );
    });

    it('should throw error for invalid enum value', () => {
      expect(() => configService.setOption('log_level', 'invalid')).toThrow(
        'Invalid value for log_level: expected one of (silent, error, warn, info, debug)',
      );
    });

    it('should throw error when setting non-string for enum option', () => {
      expect(() => configService.setOption('log_level', 123)).toThrow(
        'Invalid value for log_level: expected one of (silent, error, warn, info, debug)',
      );
    });

    it('should set default_key_manager enum option', () => {
      configService.setOption('default_key_manager', 'local');

      expect(stateMock.set).toHaveBeenCalledWith(
        'config',
        'default_key_manager',
        'local',
      );
    });
  });
});
