/**
 * Unit Tests for State List Command
 */
import { Status } from '../../../../core/shared/constants';
import { listState } from '../../commands/list/handler';
import {
  makeArgs,
  makeLogger,
  makeStateServiceWithData,
  makeEmptyStateServiceMock,
} from './helpers/mocks';
import { mockStateData } from './helpers/fixtures';

describe('State List Command', () => {
  let logger: ReturnType<typeof makeLogger>;
  let stateService: ReturnType<typeof makeStateServiceWithData>;

  beforeEach(() => {
    logger = makeLogger();
    stateService = makeStateServiceWithData(mockStateData);
  });

  describe('when listing all namespaces', () => {
    it('should return success with all namespace data', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await listState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(3);
      expect(output.totalEntries).toBe(4);
      expect(output.namespaces).toHaveLength(3);
      expect(output.filteredNamespace).toBeUndefined();
    });

    it('should handle empty state data', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, {});

      const result = await listState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(0);
      expect(output.totalEntries).toBe(0);
      expect(output.namespaces).toHaveLength(0);
    });
  });

  describe('when listing specific namespace', () => {
    it('should return success with filtered namespace data', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { namespace: 'accounts' });

      const result = await listState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(1);
      expect(output.totalEntries).toBe(2);
      expect(output.namespaces).toHaveLength(1);
      expect(output.filteredNamespace).toBe('accounts');
      expect(output.namespaces[0].name).toBe('accounts');
    });

    it('should handle non-existent namespace', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { namespace: 'non-existent' });

      const result = await listState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.totalNamespaces).toBe(1);
      expect(output.totalEntries).toBe(0);
      expect(output.namespaces).toHaveLength(1);
      expect(output.filteredNamespace).toBe('non-existent');
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

      const result = await listState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to list state data');
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

      const result = await listState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to list state data');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should return valid JSON output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await listState(args);

      expect(result.status).toBe(Status.Success);
      expect(() => JSON.parse(result.outputJson!)).not.toThrow();
    });

    it('should include all required fields in output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await listState(args);
      const output = JSON.parse(result.outputJson!);

      expect(output).toHaveProperty('namespaces');
      expect(output).toHaveProperty('totalNamespaces');
      expect(output).toHaveProperty('totalEntries');
      expect(output).toHaveProperty('totalSize');
      expect(Array.isArray(output.namespaces)).toBe(true);
      expect(typeof output.totalNamespaces).toBe('number');
      expect(typeof output.totalEntries).toBe('number');
      expect(typeof output.totalSize).toBe('number');
    });
  });
});
