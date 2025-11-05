/**
 * Unit Tests for State Backup Command
 */
import { Status } from '../../../../core/shared/constants';
import { stateBackup } from '../../commands/backup/handler';
import {
  makeArgs,
  makeLogger,
  makeStateServiceWithData,
  makeEmptyStateServiceMock,
} from './helpers/mocks';
import { mockStateData } from './helpers/fixtures';

// Mock fs and path modules
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn((path: string) => `/resolved/${path}`),
}));

describe('State Backup Command', () => {
  let logger: ReturnType<typeof makeLogger>;
  let stateService: ReturnType<typeof makeStateServiceWithData>;
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    logger = makeLogger();
    stateService = makeStateServiceWithData(mockStateData);

    mockFs = require('fs');
    mockPath = require('path');

    mockFs.writeFileSync.mockImplementation(() => {});
    mockPath.resolve.mockImplementation((path: string) => `/resolved/${path}`);
  });

  describe('when creating backup', () => {
    it('should return success with backup information', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.success).toBe(true);
      expect(output.filePath).toContain('hedera-cli-backup-');
      expect(output.totalNamespaces).toBe(3);
      expect(output.totalSize).toBeGreaterThan(0);
      expect(output.namespaces).toHaveLength(3);
    });

    it('should use custom output filename when provided', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, { dest: 'custom-backup.json' });

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.filePath).toBe('/resolved/custom-backup.json');
    });

    it('should handle empty state data', async () => {
      const emptyStateService = makeEmptyStateServiceMock();
      const api = { state: emptyStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.success).toBe(true);
      expect(output.totalNamespaces).toBe(0);
      expect(output.totalSize).toBe(0);
      expect(output.namespaces).toHaveLength(0);
    });

    it('should write backup file with correct data', async () => {
      // Reset the mock to clear previous calls
      mockFs.writeFileSync.mockClear();

      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      await stateBackup(args);

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockFs.writeFileSync.mock.calls[0];
      expect(filePath).toContain('hedera-cli-backup-');

      const backupData = JSON.parse(content);
      expect(backupData).toHaveProperty('timestamp');
      expect(backupData).toHaveProperty('namespaces');
      expect(backupData).toHaveProperty('metadata');
      expect(backupData.metadata.totalNamespaces).toBe(3);
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

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create backup');
      expect(result.outputJson).toBeUndefined();
    });

    it('should return failure on file write error', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create backup');
      expect(result.outputJson).toBeUndefined();
    });

    it('should return failure on list error', async () => {
      const errorStateService = {
        ...makeEmptyStateServiceMock(),
        getNamespaces: jest.fn().mockImplementation(() => {
          throw new Error('List error');
        }),
      };
      const api = { state: errorStateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create backup');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should return valid JSON output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);

      expect(result.status).toBe(Status.Success);
      expect(() => JSON.parse(result.outputJson!)).not.toThrow();
    });

    it('should include all required fields in output', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);
      const output = JSON.parse(result.outputJson!);

      expect(output).toHaveProperty('success');
      expect(output).toHaveProperty('filePath');
      expect(output).toHaveProperty('timestamp');
      expect(output).toHaveProperty('totalNamespaces');
      expect(output).toHaveProperty('totalSize');
      expect(output).toHaveProperty('namespaces');
      expect(typeof output.success).toBe('boolean');
      expect(typeof output.filePath).toBe('string');
      expect(typeof output.timestamp).toBe('string');
      expect(typeof output.totalNamespaces).toBe('number');
      expect(typeof output.totalSize).toBe('number');
      expect(Array.isArray(output.namespaces)).toBe(true);
    });

    it('should generate valid timestamp', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);
      const output = JSON.parse(result.outputJson!);

      expect(() => new Date(output.timestamp)).not.toThrow();
      expect(new Date(output.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should calculate correct totals', async () => {
      const api = { state: stateService };
      const args = makeArgs(api, logger, {});

      const result = await stateBackup(args);
      const output = JSON.parse(result.outputJson!);

      expect(output.totalNamespaces).toBe(output.namespaces.length);
      expect(output.totalSize).toBeGreaterThan(0);
    });
  });
});
