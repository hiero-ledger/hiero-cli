import type { OutputHandlerOptions } from '@/core/services/output/types';
import type { OutputFormat } from '@/core/shared/types/output-format';

import { Status } from '@/core';
import { OutputServiceImpl } from '@/core/services/output/output-service';
import { OutputFormatterFactory } from '@/core/services/output/strategies';
import { DEFAULT_OUTPUT_FORMAT } from '@/core/shared/types/output-format';

jest.mock('@hashgraph/sdk', () => ({
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
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
    data: { foo: 'bar' },
    status: Status.Success,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutputServiceImpl();
    getStrategyMock =
      OutputFormatterFactory.getStrategy as unknown as jest.Mock;
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

  describe('handleOutput', () => {
    it('should merge status into data and pass to formatter', () => {
      const formatter = { format: jest.fn().mockReturnValue('formatted') };
      getStrategyMock.mockReturnValue(formatter);

      const options = createOptions({
        data: { foo: 'bar' },
        template: 'tmpl',
        status: Status.Success,
      });

      service.handleOutput(options);

      expect(getStrategyMock).toHaveBeenCalledWith(DEFAULT_OUTPUT_FORMAT);
      expect(formatter.format).toHaveBeenCalledWith(
        { status: Status.Success, foo: 'bar' },
        { template: 'tmpl', pretty: true },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('formatted');
    });

    it('should use service current format for formatter selection', () => {
      getStrategyMock.mockReturnValue({
        format: jest.fn().mockReturnValue(''),
      });
      service.setFormat('json');

      service.handleOutput(createOptions());

      expect(getStrategyMock).toHaveBeenCalledWith('json');
    });

    it('should handle undefined template', () => {
      const formatter = { format: jest.fn().mockReturnValue('') };
      getStrategyMock.mockReturnValue(formatter);

      service.handleOutput(createOptions({ template: undefined }));

      expect(formatter.format).toHaveBeenCalledWith(expect.any(Object), {
        template: undefined,
        pretty: true,
      });
    });

    it('should propagate error when formatter.format throws', () => {
      getStrategyMock.mockReturnValue({
        format: jest.fn().mockImplementation(() => {
          throw new Error('formatting failed');
        }),
      });

      expect(() => service.handleOutput(createOptions())).toThrow(
        'formatting failed',
      );
    });
  });
});
