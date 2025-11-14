/**
 * Unit Tests for State Info Command
 */
import { Status } from '../../../../core/shared/constants';
import { stateInfo } from '../../commands/info/handler';
import {
  makeArgs,
  makeLogger,
  makeStateServiceWithData,
  makeEmptyStateServiceMock,
} from './helpers/mocks';
import { mockStateData } from './helpers/fixtures';

// Mock path module for storage directory path resolution
jest.mock('path', () => ({
  join: jest.fn((...paths: string[]) => paths.join('/')),
  resolve: jest.fn((path: string) => `/resolved/${path}`),
}));

describe('State Info Command', () => {
  let logger: ReturnType<typeof makeLogger>;
  let stateService: ReturnType<typeof makeStateServiceWithData>;
  let mockPath: any;

  beforeEach(() => {
    logger = makeLogger();
    stateService = makeStateServiceWithData(mockStateData);

    mockPath = require('path');

    mockPath.join.mockImplementation((...paths: string[]) => paths.join('/'));
  });

  describe('when getting state information', () => {
    it('should return success with state information', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.storageDirectory).toBeDefined();
      expect(output.isInitialized).toBe(true);
      expect(output.totalEntries).toBe(4);
      expect(output.totalSize).toBeGreaterThan(0);
      expect(output.namespaces).toHaveLength(3);
    });

    it('should handle empty state data', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      // Ensure all namespaces return empty arrays
      emptyStateService.list.mockReturnValue([]);
      // Ensure getNamespaces returns empty array
      emptyStateService.getNamespaces.mockReturnValue([]);
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalEntries).toBe(0);
      expect(output.totalSize).toBe(0);
      expect(output.namespaces).toHaveLength(0);
    });

    it('should handle uninitialized storage directory', async () => {
      const uninitializedStateService = makeStateServiceWithData(mockStateData);
      uninitializedStateService.isInitialized.mockReturnValue(false);

      const api = { state: uninitializedStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.isInitialized).toBe(false);
    });

    it('should include all namespaces including empty ones', async () => {
      const stateServiceWithEmpty = makeStateServiceWithData({
        accounts: mockStateData.accounts,
        empty: [],
        scripts: [],
      });
      const api = { state: stateServiceWithEmpty };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.namespaces).toHaveLength(3);
      expect(output.namespaces[0].name).toBe('accounts');
      expect(output.namespaces[0].entryCount).toBe(2);
      expect(output.namespaces[1].name).toBe('empty');
      expect(output.namespaces[1].entryCount).toBe(0);
      expect(output.namespaces[2].name).toBe('scripts');
      expect(output.namespaces[2].entryCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should return failure on state service error', async () => {
      const errorStateService = {
        ...makeEmptyStateServiceMock(),
        getNamespaces: jest.fn().mockImplementation(() => {
          throw new Error('State service error');
        }),
      };
      const api = { state: errorStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to get state information');
      expect(result.outputJson).toBeUndefined();
    });

    it('should return failure on state service error', async () => {
      const errorStateService = makeStateServiceWithData(mockStateData);
      errorStateService.getNamespaces.mockImplementation(() => {
        throw new Error('State service error');
      });

      const api = { state: errorStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to get state information');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should return valid JSON output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);

      expect(result.status).toBe(Status.Success);
      expect(() => JSON.parse(result.outputJson!)).not.toThrow();
    });

    it('should include all required fields in output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);
      const output = JSON.parse(result.outputJson!);

      expect(output).toHaveProperty('storageDirectory');
      expect(output).toHaveProperty('isInitialized');
      expect(output).toHaveProperty('totalEntries');
      expect(output).toHaveProperty('totalSize');
      expect(output).toHaveProperty('namespaces');
      expect(typeof output.storageDirectory).toBe('string');
      expect(typeof output.isInitialized).toBe('boolean');
      expect(typeof output.totalEntries).toBe('number');
      expect(typeof output.totalSize).toBe('number');
      expect(Array.isArray(output.namespaces)).toBe(true);
    });

    it('should calculate correct totals', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateInfo(args);
      const output = JSON.parse(result.outputJson!);

      const expectedEntries = output.namespaces.reduce(
        (sum: number, ns: any) => sum + ns.entryCount,
        0,
      );
      const expectedSize = output.namespaces.reduce(
        (sum: number, ns: any) => sum + ns.size,
        0,
      );

      expect(output.totalEntries).toBe(expectedEntries);
      // Allow for small differences due to JSON serialization
      expect(Math.abs(output.totalSize - expectedSize)).toBeLessThan(10);
    });
  });
});
