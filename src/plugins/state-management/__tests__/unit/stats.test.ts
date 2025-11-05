/**
 * Unit Tests for State Stats Command
 */
import { Status } from '../../../../core/shared/constants';
import { stateStats } from '../../commands/stats/handler';
import {
  makeArgs,
  makeLogger,
  makeStateServiceWithData,
  makeEmptyStateServiceMock,
} from './helpers/mocks';
import { mockStateData } from './helpers/fixtures';

describe('State Stats Command', () => {
  let logger: ReturnType<typeof makeLogger>;
  let stateService: ReturnType<typeof makeStateServiceWithData>;

  beforeEach(() => {
    logger = makeLogger();
    stateService = makeStateServiceWithData(mockStateData);
  });

  describe('when getting state statistics', () => {
    it('should return success with statistics', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(3);
      expect(output.totalEntries).toBe(4);
      expect(output.totalSize).toBeGreaterThan(0);
      expect(output.namespaces).toHaveLength(3);
    });

    it('should handle empty state data', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(0);
      expect(output.totalEntries).toBe(0);
      expect(output.totalSize).toBe(0);
      expect(output.namespaces).toHaveLength(0);
    });

    it('should include all namespaces even if empty', async () => {
      const stateServiceWithEmpty = makeStateServiceWithData({
        accounts: mockStateData.accounts,
        empty: [],
        scripts: [],
      });
      const api = { state: stateServiceWithEmpty };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(3);
      expect(output.namespaces).toHaveLength(3);
    });

    it('should calculate correct totals', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);
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
      expect(output.totalSize).toBe(expectedSize);
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

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to get statistics');
      expect(result.outputJson).toBeUndefined();
    });

    it('should return failure on list error', async () => {
      const errorStateService = {
        ...makeEmptyStateServiceMock(),
        getNamespaces: jest.fn().mockReturnValue(['test']),
        list: jest.fn().mockImplementation(() => {
          throw new Error('List error');
        }),
      };
      const api = { state: errorStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to get statistics');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should return valid JSON output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);

      expect(result.status).toBe(Status.Success);
      expect(() => JSON.parse(result.outputJson!)).not.toThrow();
    });

    it('should include all required fields in output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);
      const output = JSON.parse(result.outputJson!);

      expect(output).toHaveProperty('totalNamespaces');
      expect(output).toHaveProperty('totalEntries');
      expect(output).toHaveProperty('totalSize');
      expect(output).toHaveProperty('namespaces');
      expect(typeof output.totalNamespaces).toBe('number');
      expect(typeof output.totalEntries).toBe('number');
      expect(typeof output.totalSize).toBe('number');
      expect(Array.isArray(output.namespaces)).toBe(true);
    });

    it('should have valid namespace information', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateStats(args);
      const output = JSON.parse(result.outputJson!);

      output.namespaces.forEach((ns: any) => {
        expect(ns).toHaveProperty('name');
        expect(ns).toHaveProperty('entryCount');
        expect(ns).toHaveProperty('size');
        expect(ns).toHaveProperty('lastModified');
        expect(typeof ns.name).toBe('string');
        expect(typeof ns.entryCount).toBe('number');
        expect(typeof ns.size).toBe('number');
        expect(typeof ns.lastModified).toBe('string');
      });
    });
  });
});
