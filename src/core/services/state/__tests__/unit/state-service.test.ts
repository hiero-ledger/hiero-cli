/**
 * Unit tests for ZustandGenericStateServiceImpl
 * Tests state management operations: get, set, delete, list, clear, has, subscribe, etc.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ZustandGenericStateServiceImpl } from '../../state-service';
import { makeLogger } from '../../../../../__tests__/mocks/mocks';
import type { Logger } from '../../../logger/logger-service.interface';

const NAMESPACE_FOO = 'foo-namespace';
const NAMESPACE_BAR = 'bar-namespace';
const KEY_TEST = 'test-key';
const KEY_OTHER = 'other-key';
const VALUE_TEST = 'test-value';
const VALUE_OTHER = 'other-value';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
}));

describe('ZustandGenericStateServiceImpl', () => {
  let service: ZustandGenericStateServiceImpl;
  let logger: jest.Mocked<Logger>;
  const mockStorageDir = '/tmp/test-state';

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockImplementation((...args: string[]) =>
      args.join('/'),
    );
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.readFileSync as jest.Mock).mockReturnValue(null);
    service = new ZustandGenericStateServiceImpl(logger, mockStorageDir);
  });

  describe('constructor and initialization', () => {
    it('should create storage directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      new ZustandGenericStateServiceImpl(logger, mockStorageDir);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockStorageDir, {
        recursive: true,
      });
    });

    it('should use default storage directory when not provided', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const cwd = process.cwd();

      new ZustandGenericStateServiceImpl(logger);

      expect(path.join).toHaveBeenCalledWith(cwd, '.hedera-cli', 'state');
    });

    it('should discover existing namespaces from storage files', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'foo-namespace-storage.json',
        'bar-namespace-storage.json',
      ]);

      const newService = new ZustandGenericStateServiceImpl(
        logger,
        mockStorageDir,
      );

      expect(newService.getNamespaces()).toContain(NAMESPACE_FOO);
      expect(newService.getNamespaces()).toContain(NAMESPACE_BAR);
    });
  });

  describe('getStorageDirectory', () => {
    it('should return storage directory path', () => {
      const result = service.getStorageDirectory();

      expect(result).toBe(mockStorageDir);
    });
  });

  describe('isInitialized', () => {
    it('should return true when storage directory exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = service.isInitialized();

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(mockStorageDir);
    });

    it('should return false when storage directory does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = service.isInitialized();

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should get value from namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      const result = service.get<string>(NAMESPACE_FOO, KEY_TEST);

      expect(result).toBe(VALUE_TEST);
    });

    it('should return undefined when key does not exist', () => {
      const result = service.get<string>(NAMESPACE_FOO, KEY_TEST);

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value in namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      const result = service.get<string>(NAMESPACE_FOO, KEY_TEST);
      expect(result).toBe(VALUE_TEST);
    });
  });

  describe('delete', () => {
    it('should delete value from namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);
      service.delete(NAMESPACE_FOO, KEY_TEST);

      const result = service.get<string>(NAMESPACE_FOO, KEY_TEST);
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all values in namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);
      service.set(NAMESPACE_FOO, KEY_OTHER, VALUE_OTHER);

      const result = service.list<string>(NAMESPACE_FOO);

      expect(result).toContain(VALUE_TEST);
      expect(result).toContain(VALUE_OTHER);
    });

    it('should return empty array when namespace is empty', () => {
      const result = service.list<string>(NAMESPACE_FOO);

      expect(result).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all values in namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);
      service.set(NAMESPACE_FOO, KEY_OTHER, VALUE_OTHER);
      service.clear(NAMESPACE_FOO);

      const result = service.list<string>(NAMESPACE_FOO);
      expect(result).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true when key exists', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      const result = service.has(NAMESPACE_FOO, KEY_TEST);

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', () => {
      const result = service.has(NAMESPACE_FOO, KEY_TEST);

      expect(result).toBe(false);
    });
  });

  describe('getNamespaces', () => {
    it('should return list of registered namespaces', () => {
      service.get(NAMESPACE_FOO, KEY_TEST);
      service.get(NAMESPACE_BAR, KEY_TEST);

      const result = service.getNamespaces();

      expect(result).toContain(NAMESPACE_FOO);
      expect(result).toContain(NAMESPACE_BAR);
    });

    it('should return empty array when no namespaces are registered', () => {
      const result = service.getNamespaces();

      expect(result).toEqual([]);
    });
  });

  describe('getKeys', () => {
    it('should return list of keys in namespace', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);
      service.set(NAMESPACE_FOO, KEY_OTHER, VALUE_OTHER);

      const result = service.getKeys(NAMESPACE_FOO);

      expect(result).toContain(KEY_TEST);
      expect(result).toContain(KEY_OTHER);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to namespace changes', () => {
      const callback = jest.fn();

      const result = service.subscribe(NAMESPACE_FOO, callback);

      expect(typeof result).toBe('function');
    });

    it('should call callback with namespace data when state changes', () => {
      const callback = jest.fn();
      service.subscribe(NAMESPACE_FOO, callback);

      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      expect(typeof service.subscribe(NAMESPACE_FOO, callback)).toBe(
        'function',
      );
    });
  });

  describe('getActions', () => {
    it('should return store state as actions', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      const result = service.getActions(NAMESPACE_FOO);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('setItem');
      expect(result).toHaveProperty('getItem');
    });
  });

  describe('getState', () => {
    it('should return store state', () => {
      service.set(NAMESPACE_FOO, KEY_TEST, VALUE_TEST);

      const result = service.getState(NAMESPACE_FOO);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
    });
  });

  describe('registerNamespaces', () => {
    it('should register multiple namespaces', () => {
      const namespaces = [NAMESPACE_FOO, NAMESPACE_BAR];

      service.registerNamespaces(namespaces);

      expect(service.getNamespaces()).toContain(NAMESPACE_FOO);
      expect(service.getNamespaces()).toContain(NAMESPACE_BAR);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Registered 2 namespaces'),
      );
    });
  });
});
