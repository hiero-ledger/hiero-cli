/**
 * Unit Tests for State Clear Command
 */
import { Status } from '../../../../core/shared/constants';
import { clearState } from '../../commands/clear/handler';
import {
  makeArgs,
  makeLogger,
  makeStateServiceWithData,
  makeEmptyStateServiceMock,
} from './helpers/mocks';
import { mockStateData } from './helpers/fixtures';

describe('State Clear Command', () => {
  let logger: ReturnType<typeof makeLogger>;
  let stateService: ReturnType<typeof makeStateServiceWithData>;

  beforeEach(() => {
    logger = makeLogger();
    stateService = makeStateServiceWithData(mockStateData);
  });

  describe('when clearing specific namespace', () => {
    it('should return success when confirmed', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {
        namespace: 'accounts',
        confirm: true,
      });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.cleared).toBe(true);
      expect(output.namespace).toBe('accounts');
      expect(output.entriesCleared).toBe(2);
      expect(output.message).toContain(
        'Cleared 2 entries from namespace: accounts',
      );
    });

    it('should return failure when not confirmed', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {
        namespace: 'accounts',
        confirm: false,
      });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'This will clear all data in namespace: accounts',
      );
      expect(result.outputJson).toBeUndefined();
    });

    it('should handle empty namespace', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, {
        namespace: 'empty',
        confirm: true,
      });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.cleared).toBe(true);
      expect(output.entriesCleared).toBe(0);
    });
  });

  describe('when clearing all namespaces', () => {
    it('should return success when confirmed', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.cleared).toBe(true);
      expect(output.entriesCleared).toBe(4);
      expect(output.totalNamespaces).toBe(3);
      expect(output.message).toContain(
        'Cleared 4 total entries across 3 namespaces',
      );
    });

    it('should return failure when not confirmed', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { confirm: false });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'This will clear ALL state data across all plugins',
      );
      expect(result.outputJson).toBeUndefined();
    });

    it('should handle empty state', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.cleared).toBe(true);
      expect(output.entriesCleared).toBe(0);
      expect(output.totalNamespaces).toBe(0);
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
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to clear state data');
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
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to clear state data');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should return valid JSON output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);

      expect(result.status).toBe(Status.Success);
      expect(() => JSON.parse(result.outputJson!)).not.toThrow();
    });

    it('should include all required fields in output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { confirm: true });

      const result = await clearState(args);
      const output = JSON.parse(result.outputJson!);

      expect(output).toHaveProperty('cleared');
      expect(output).toHaveProperty('entriesCleared');
      expect(output).toHaveProperty('message');
      expect(typeof output.cleared).toBe('boolean');
      expect(typeof output.entriesCleared).toBe('number');
      expect(typeof output.message).toBe('string');
    });
  });
});
