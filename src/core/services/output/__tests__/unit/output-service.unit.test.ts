/**
 * Unit tests for OutputServiceImpl
 * Tests format management, JSON parsing, formatting strategies and file/console output
 */
import { OutputServiceImpl } from '../../output-service';
import type { OutputFormat } from '../../../../shared/types/output-format';
import { DEFAULT_OUTPUT_FORMAT } from '../../../../shared/types/output-format';
import type { OutputHandlerOptions } from '../../types';
import { OutputFormatterFactory } from '../../strategies';
import { setupFileMocks } from './mocks';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  dirname: jest.fn(),
}));

jest.mock('../../strategies', () => {
  const actual = jest.requireActual('../../strategies');
  return {
    ...actual,
    OutputFormatterFactory: {
      getStrategy: jest.fn(),
    },
  };
});

describe('OutputServiceImpl', () => {
  let service: OutputServiceImpl;
  let consoleLogSpy: jest.SpyInstance;
  let getStrategyMock: jest.Mock;

  const createOptions = (
    overrides: Partial<OutputHandlerOptions> = {},
  ): OutputHandlerOptions => ({
    outputJson: '{"foo":"bar"}',
    format: 'human',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutputServiceImpl();
    getStrategyMock = OutputFormatterFactory.getStrategy as any as jest.Mock;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('constructor and format management', () => {
    it('should use default format when none is provided', () => {
      const defaultService = new OutputServiceImpl();

      const format = defaultService.getFormat();

      expect(format).toBe(DEFAULT_OUTPUT_FORMAT);
    });

    it('should use provided format when specified', () => {
      const initialFormat: OutputFormat = 'json';
      const jsonService = new OutputServiceImpl(initialFormat);

      const format = jsonService.getFormat();

      expect(format).toBe('json');
    });

    it('should change format using setFormat', () => {
      expect(service.getFormat()).toBe(DEFAULT_OUTPUT_FORMAT);

      service.setFormat('json');

      expect(service.getFormat()).toBe('json');
    });
  });

  describe('handleCommandOutput', () => {
    it('should parse JSON and pass data to formatter strategy', () => {
      const formatter = { format: jest.fn().mockReturnValue('formatted') };
      getStrategyMock.mockReturnValue(formatter);

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        template: 'tmpl',
        format: 'json',
      });

      service.handleCommandOutput(options);

      expect(getStrategyMock).toHaveBeenCalledWith('json');
      expect(formatter.format).toHaveBeenCalledWith(
        { foo: 'bar' },
        {
          template: 'tmpl',
          pretty: true,
        },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('formatted');
    });

    it('should throw error when JSON parsing fails', () => {
      const options = createOptions({
        outputJson: 'invalid-json',
      });

      expect(() => service.handleCommandOutput(options)).toThrow(
        'Failed to parse output JSON:',
      );
    });

    it('should throw error when outputJson is empty string', () => {
      const options = createOptions({
        outputJson: '',
      });

      expect(() => service.handleCommandOutput(options)).toThrow(
        'Failed to parse output JSON:',
      );
    });

    it('should throw error when outputJson is null', () => {
      const options = createOptions({
        outputJson: 'null',
      });

      service.handleCommandOutput(options);

      expect(getStrategyMock).toHaveBeenCalled();
    });

    it('should handle undefined template', () => {
      const formatter = { format: jest.fn().mockReturnValue('formatted') };
      getStrategyMock.mockReturnValue(formatter);

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        template: undefined,
        format: 'json',
      });

      service.handleCommandOutput(options);

      expect(formatter.format).toHaveBeenCalledWith(
        { foo: 'bar' },
        {
          template: undefined,
          pretty: true,
        },
      );
    });

    it('should write formatted output to file when outputPath is provided', () => {
      const formatter = { format: jest.fn().mockReturnValue('file-output') };
      getStrategyMock.mockReturnValue(formatter);
      const { fs } = setupFileMocks({
        dirExists: false,
        dirname: '/tmp/output',
      });

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'human',
        outputPath: '/tmp/output/result.txt',
      });

      service.handleCommandOutput(options);

      expect(getStrategyMock).toHaveBeenCalledWith('human');
      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/output');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/output', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/output/result.txt',
        'file-output',
        'utf8',
      );
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not create directory when it already exists', () => {
      const formatter = { format: jest.fn().mockReturnValue('file-output') };
      getStrategyMock.mockReturnValue(formatter);
      const { fs } = setupFileMocks({
        dirExists: true,
        dirname: '/tmp/output',
      });

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'human',
        outputPath: '/tmp/output/result.txt',
      });

      service.handleCommandOutput(options);

      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/output');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle root directory path', () => {
      const formatter = { format: jest.fn().mockReturnValue('file-output') };
      getStrategyMock.mockReturnValue(formatter);
      const { fs } = setupFileMocks({ dirExists: true, dirname: '/' });

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'human',
        outputPath: '/result.txt',
      });

      service.handleCommandOutput(options);

      expect(fs.existsSync).toHaveBeenCalledWith('/');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/result.txt',
        'file-output',
        'utf8',
      );
    });

    it('should throw error when writing to file fails', () => {
      const formatter = { format: jest.fn().mockReturnValue('file-output') };
      getStrategyMock.mockReturnValue(formatter);
      setupFileMocks({
        dirExists: true,
        dirname: '/tmp/output',
        writeFileSyncError: new Error('disk full'),
      });

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'human',
        outputPath: '/tmp/output/result.txt',
      });

      expect(() => service.handleCommandOutput(options)).toThrow(
        'Failed to write output to file /tmp/output/result.txt: disk full',
      );
    });

    it('should throw error when creating directory fails', () => {
      const formatter = { format: jest.fn().mockReturnValue('file-output') };
      getStrategyMock.mockReturnValue(formatter);
      setupFileMocks({
        dirExists: false,
        dirname: '/tmp/output',
        mkdirSyncError: new Error('permission denied'),
      });

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'human',
        outputPath: '/tmp/output/result.txt',
      });

      expect(() => service.handleCommandOutput(options)).toThrow(
        'Failed to write output to file /tmp/output/result.txt: permission denied',
      );
    });

    it('should throw error when formatter.format fails', () => {
      const formatter = {
        format: jest.fn().mockImplementation(() => {
          throw new Error('formatting failed');
        }),
      };
      getStrategyMock.mockReturnValue(formatter);

      const options = createOptions({
        outputJson: '{"foo":"bar"}',
        format: 'json',
      });

      expect(() => service.handleCommandOutput(options)).toThrow(
        'formatting failed',
      );
    });
  });
});
