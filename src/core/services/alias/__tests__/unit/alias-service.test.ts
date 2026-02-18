/**
 * Unit tests for AliasServiceImpl
 * Tests alias registration, resolution, listing, and removal
 */
import type { AliasRecord } from '@/core/services/alias/alias-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { AliasServiceImpl } from '@/core/services/alias/alias-service';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';

describe('AliasServiceImpl', () => {
  let aliasService: AliasServiceImpl;
  let logger: jest.Mocked<Logger>;
  let stateMock: jest.Mocked<StateService>;

  const createAliasRecord = (
    overrides: Partial<AliasRecord> = {},
  ): AliasRecord => ({
    alias: 'test-alias',
    type: ALIAS_TYPE.Account,
    network: SupportedNetwork.TESTNET,
    entityId: '0.0.1234',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    stateMock = makeStateMock();
    aliasService = new AliasServiceImpl(stateMock, logger);
  });

  describe('register', () => {
    it('should register a new alias successfully', () => {
      stateMock.has.mockReturnValue(false);

      const record = createAliasRecord();
      aliasService.register(record);

      expect(stateMock.has).toHaveBeenCalledWith(
        'aliases',
        'testnet:test-alias',
      );
      expect(stateMock.set).toHaveBeenCalledWith(
        'aliases',
        'testnet:test-alias',
        expect.objectContaining({
          alias: 'test-alias',
          type: ALIAS_TYPE.Account,
          network: SupportedNetwork.TESTNET,
          entityId: '0.0.1234',
        }),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ALIAS] Registered test-alias (account) on testnet',
      );
    });

    it('should throw error when alias already exists', () => {
      stateMock.has.mockReturnValue(true);

      const record = createAliasRecord();

      expect(() => aliasService.register(record)).toThrow(
        'Alias already exists for network=testnet: test-alias',
      );
      expect(stateMock.set).not.toHaveBeenCalled();
    });

    it('should register alias with different networks', () => {
      stateMock.has.mockReturnValue(false);

      const mainnetRecord = createAliasRecord({
        network: SupportedNetwork.MAINNET,
      });
      aliasService.register(mainnetRecord);

      expect(stateMock.set).toHaveBeenCalledWith(
        'aliases',
        'mainnet:test-alias',
        expect.objectContaining({ network: SupportedNetwork.MAINNET }),
      );
    });

    it('should register different alias types', () => {
      stateMock.has.mockReturnValue(false);

      const tokenRecord = createAliasRecord({
        alias: 'my-token',
        type: ALIAS_TYPE.Token,
        entityId: '0.0.5555',
      });
      aliasService.register(tokenRecord);

      expect(logger.debug).toHaveBeenCalledWith(
        '[ALIAS] Registered my-token (token) on testnet',
      );
    });
  });

  describe('resolve', () => {
    it('should resolve existing alias', () => {
      const record = createAliasRecord();
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolve(
        'test-alias',
        undefined,
        SupportedNetwork.TESTNET,
      );

      expect(stateMock.get).toHaveBeenCalledWith(
        'aliases',
        'testnet:test-alias',
      );
      expect(result).toEqual(record);
    });

    it('should return null when alias does not exist', () => {
      stateMock.get.mockReturnValue(undefined);

      const result = aliasService.resolve(
        'non-existent',
        undefined,
        SupportedNetwork.TESTNET,
      );

      expect(result).toBeNull();
    });

    it('should return null when type expectation does not match', () => {
      const record = createAliasRecord({ type: ALIAS_TYPE.Account });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolve(
        'test-alias',
        ALIAS_TYPE.Token,
        SupportedNetwork.TESTNET,
      );

      expect(result).toBeNull();
    });

    it('should return record when type expectation matches', () => {
      const record = createAliasRecord({ type: ALIAS_TYPE.Token });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolve(
        'test-alias',
        ALIAS_TYPE.Token,
        SupportedNetwork.TESTNET,
      );

      expect(result).toEqual(record);
    });

    it('should resolve with undefined expectation (any type)', () => {
      const record = createAliasRecord({ type: ALIAS_TYPE.Topic });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolve(
        'test-alias',
        undefined,
        SupportedNetwork.TESTNET,
      );

      expect(result).toEqual(record);
    });
  });

  describe('resolveOrThrow', () => {
    it('should return record when alias exists and type matches', () => {
      const record = createAliasRecord({
        alias: 'my-contract',
        type: ALIAS_TYPE.Contract,
        entityId: '0.0.5678',
      });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolveOrThrow(
        'my-contract',
        ALIAS_TYPE.Contract,
        SupportedNetwork.TESTNET,
      );

      expect(stateMock.get).toHaveBeenCalledWith(
        'aliases',
        'testnet:my-contract',
      );
      expect(result).toEqual(record);
      expect(result.entityId).toBe('0.0.5678');
    });

    it('should throw when alias does not exist', () => {
      stateMock.get.mockReturnValue(undefined);

      expect(() =>
        aliasService.resolveOrThrow(
          'non-existent',
          ALIAS_TYPE.Contract,
          SupportedNetwork.TESTNET,
        ),
      ).toThrow(
        'Alias "non-existent" for contract on network "testnet" not found',
      );
      expect(stateMock.get).toHaveBeenCalledWith(
        'aliases',
        'testnet:non-existent',
      );
    });

    it('should throw when alias exists but type does not match', () => {
      const record = createAliasRecord({
        alias: 'test-alias',
        type: ALIAS_TYPE.Account,
      });
      stateMock.get.mockReturnValue(record);

      expect(() =>
        aliasService.resolveOrThrow(
          'test-alias',
          ALIAS_TYPE.Contract,
          SupportedNetwork.TESTNET,
        ),
      ).toThrow(
        'Alias "test-alias" for contract on network "testnet" not found',
      );
    });

    it('should use correct key for different networks', () => {
      const record = createAliasRecord({
        alias: 'main-alias',
        network: SupportedNetwork.MAINNET,
        type: ALIAS_TYPE.Token,
      });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolveOrThrow(
        'main-alias',
        ALIAS_TYPE.Token,
        SupportedNetwork.MAINNET,
      );

      expect(stateMock.get).toHaveBeenCalledWith(
        'aliases',
        'mainnet:main-alias',
      );
      expect(result.network).toBe(SupportedNetwork.MAINNET);
    });

    it('should return record for account type', () => {
      const record = createAliasRecord({
        alias: 'treasury',
        type: ALIAS_TYPE.Account,
        entityId: '0.0.100',
      });
      stateMock.get.mockReturnValue(record);

      const result = aliasService.resolveOrThrow(
        'treasury',
        ALIAS_TYPE.Account,
        SupportedNetwork.TESTNET,
      );

      expect(result).toEqual(record);
      expect(result.type).toBe(ALIAS_TYPE.Account);
    });
  });

  describe('list', () => {
    it('should return all aliases when no filter provided', () => {
      const records = [
        createAliasRecord({ alias: 'alias1' }),
        createAliasRecord({ alias: 'alias2', type: ALIAS_TYPE.Token }),
      ];
      stateMock.list.mockReturnValue(records);

      const result = aliasService.list();

      expect(stateMock.list).toHaveBeenCalledWith('aliases');
      expect(result).toHaveLength(2);
    });

    it('should filter by network', () => {
      const records = [
        createAliasRecord({
          alias: 'alias1',
          network: SupportedNetwork.TESTNET,
        }),
        createAliasRecord({
          alias: 'alias2',
          network: SupportedNetwork.MAINNET,
        }),
      ];
      stateMock.list.mockReturnValue(records);

      const result = aliasService.list({ network: SupportedNetwork.TESTNET });

      expect(result).toHaveLength(1);
      expect(result[0].network).toBe('testnet');
    });

    it('should filter by type', () => {
      const records = [
        createAliasRecord({ alias: 'alias1', type: ALIAS_TYPE.Account }),
        createAliasRecord({ alias: 'alias2', type: ALIAS_TYPE.Token }),
      ];
      stateMock.list.mockReturnValue(records);

      const result = aliasService.list({ type: ALIAS_TYPE.Token });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ALIAS_TYPE.Token);
    });

    it('should filter by both network and type', () => {
      const records = [
        createAliasRecord({
          alias: 'a1',
          network: SupportedNetwork.TESTNET,
          type: ALIAS_TYPE.Account,
        }),
        createAliasRecord({
          alias: 'a2',
          network: SupportedNetwork.TESTNET,
          type: ALIAS_TYPE.Token,
        }),
        createAliasRecord({
          alias: 'a3',
          network: SupportedNetwork.MAINNET,
          type: ALIAS_TYPE.Token,
        }),
      ];
      stateMock.list.mockReturnValue(records);

      const result = aliasService.list({
        network: SupportedNetwork.TESTNET,
        type: ALIAS_TYPE.Token,
      });

      expect(result).toHaveLength(1);
      expect(result[0].alias).toBe('a2');
    });

    it('should return empty array when no aliases exist', () => {
      stateMock.list.mockReturnValue([]);

      const result = aliasService.list();

      expect(result).toEqual([]);
    });

    it('should handle null values in list', () => {
      const records = [
        createAliasRecord({ alias: 'alias1' }),
        null,
        createAliasRecord({ alias: 'alias2' }),
      ];
      stateMock.list.mockReturnValue(records as AliasRecord[]);

      const result = aliasService.list();

      expect(result).toHaveLength(2);
    });

    it('should return empty array when state.list returns null', () => {
      stateMock.list.mockReturnValue(null as unknown as AliasRecord[]);

      const result = aliasService.list();

      expect(result).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove alias successfully', () => {
      aliasService.remove('test-alias', SupportedNetwork.TESTNET);

      expect(stateMock.delete).toHaveBeenCalledWith(
        'aliases',
        'testnet:test-alias',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[ALIAS] Removed test-alias on testnet',
      );
    });

    it('should use correct key format for different networks', () => {
      aliasService.remove('my-alias', SupportedNetwork.MAINNET);

      expect(stateMock.delete).toHaveBeenCalledWith(
        'aliases',
        'mainnet:my-alias',
      );
    });
  });

  describe('exists', () => {
    it('should return true when alias exists', () => {
      stateMock.has.mockReturnValue(true);

      const result = aliasService.exists(
        'test-alias',
        SupportedNetwork.TESTNET,
      );

      expect(stateMock.has).toHaveBeenCalledWith(
        'aliases',
        'testnet:test-alias',
      );
      expect(result).toBe(true);
    });

    it('should return false when alias does not exist', () => {
      stateMock.has.mockReturnValue(false);

      const result = aliasService.exists(
        'non-existent',
        SupportedNetwork.TESTNET,
      );

      expect(result).toBe(false);
    });
  });

  describe('availableOrThrow', () => {
    it('should not throw when alias is undefined', () => {
      expect(() =>
        aliasService.availableOrThrow(undefined, SupportedNetwork.TESTNET),
      ).not.toThrow();
      expect(stateMock.has).not.toHaveBeenCalled();
    });

    it('should not throw when alias does not exist', () => {
      stateMock.has.mockReturnValue(false);

      expect(() =>
        aliasService.availableOrThrow('new-alias', SupportedNetwork.TESTNET),
      ).not.toThrow();
    });

    it('should throw when alias already exists', () => {
      stateMock.has.mockReturnValue(true);

      expect(() =>
        aliasService.availableOrThrow('existing', SupportedNetwork.TESTNET),
      ).toThrow('Alias "existing" already exists on network "testnet"');
    });
  });

  describe('clear', () => {
    it('should clear by alias type successfully', () => {
      const records = [
        createAliasRecord({
          alias: 'a1',
          network: SupportedNetwork.TESTNET,
          type: ALIAS_TYPE.Account,
        }),
        createAliasRecord({
          alias: 'a2',
          network: SupportedNetwork.TESTNET,
          type: ALIAS_TYPE.Token,
        }),
        createAliasRecord({
          alias: 'a3',
          network: SupportedNetwork.MAINNET,
          type: ALIAS_TYPE.Account,
        }),
      ];
      stateMock.list.mockReturnValue(records);

      aliasService.clear(ALIAS_TYPE.Account);

      expect(stateMock.list).toHaveBeenCalledWith('aliases');
      expect(stateMock.delete).toHaveBeenCalledTimes(2);
      expect(stateMock.delete).toHaveBeenNthCalledWith(
        1,
        'aliases',
        'testnet:a1',
      );
      expect(stateMock.delete).toHaveBeenNthCalledWith(
        2,
        'aliases',
        'mainnet:a3',
      );
    });
  });
});
