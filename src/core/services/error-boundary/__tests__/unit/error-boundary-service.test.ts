import type { OutputService } from '@/core/services/output/output-service.interface';
import type { OutputHandlerOptions } from '@/core/services/output/types';

import { z } from 'zod';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { InternalError, ValidationError } from '@/core/errors';
import { ErrorBoundaryServiceImpl } from '@/core/services/error-boundary/error-boundary-service';
import { Status } from '@/core/shared/constants';

const PROCESS_EVENTS = [
  'uncaughtException',
  'unhandledRejection',
  'SIGINT',
  'SIGTERM',
] as const;

type OutputServiceMock = OutputService & {
  handleOutput: jest.MockedFunction<(options: OutputHandlerOptions) => void>;
};

const makeOutputMock = (): OutputServiceMock => ({
  handleOutput: jest.fn((options: OutputHandlerOptions) => {
    void options;
  }),
  getFormat: jest.fn().mockReturnValue('human'),
  setFormat: jest.fn(),
  emptyLine: jest.fn(),
});

describe('ErrorBoundaryServiceImpl', () => {
  let outputMock: OutputServiceMock;
  let service: ErrorBoundaryServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    outputMock = makeOutputMock();
    service = new ErrorBoundaryServiceImpl(outputMock, makeLogger());
  });

  describe('toCliError', () => {
    it('should return CliError instance without remapping', () => {
      const sourceError = new InternalError('already cli error');

      const result = service.toCliError(sourceError);

      expect(result).toBe(sourceError);
    });

    it('should map ZodError to ValidationError', () => {
      const schema = z.object({ accountId: z.string().min(1) });

      let resultError: unknown;
      try {
        schema.parse({ accountId: '' });
      } catch (error) {
        resultError = error;
      }

      const result = service.toCliError(resultError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.toJSON()).toMatchObject({
        code: ValidationError.CODE,
        context: { issues: expect.any(Array) },
      });
    });

    it('should map Error to InternalError and preserve cause', () => {
      const rawError = new Error('boom');

      const result = service.toCliError(rawError, 'wrapper message');

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('wrapper message');
      expect(result.toJSON()).toMatchObject({
        code: InternalError.CODE,
        message: 'wrapper message',
        cause: expect.objectContaining({ message: 'boom' }),
      });
    });

    it('should map unknown thrown values to InternalError with context', () => {
      const result = service.toCliError({ foo: 'bar' });

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('Unexpected unsupported Error');
      expect(result.toJSON()).toMatchObject({
        context: { thrownType: 'object' },
      });
    });
  });

  describe('handle', () => {
    it('should delegate failure output to OutputService', () => {
      const error = new InternalError('failed operation');

      expect(() => service.handle(error)).not.toThrow();

      expect(outputMock.handleOutput).toHaveBeenCalledWith({
        status: Status.Failure,
        template: error.getTemplate(),
        data: error.toJSON(),
      });
    });

    it('should fallback to stderr and exit when OutputService throws', () => {
      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      outputMock.handleOutput.mockImplementation(() => {
        throw new Error('formatter failed');
      });

      expect(() => service.handle(new Error('runtime failure'))).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status":"failure"'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('global handlers', () => {
    it('should register process listeners only once', () => {
      const processOnSpy = jest.spyOn(process, 'on').mockImplementation(((
        event: string,
        listener: (...args: unknown[]) => void,
      ) => {
        void event;
        void listener;
        return process;
      }) as unknown as typeof process.on);

      service.registerGlobalHandlers();
      service.registerGlobalHandlers();

      const registrations = processOnSpy.mock.calls.filter(([eventName]) =>
        PROCESS_EVENTS.includes(eventName as (typeof PROCESS_EVENTS)[number]),
      );

      expect(registrations).toHaveLength(4);

      processOnSpy.mockRestore();
    });

    it('should unregister process listeners on dispose', () => {
      const processOnSpy = jest.spyOn(process, 'on').mockImplementation(((
        event: string,
        listener: (...args: unknown[]) => void,
      ) => {
        void event;
        void listener;
        return process;
      }) as unknown as typeof process.on);
      const processRemoveListenerSpy = jest
        .spyOn(process, 'removeListener')
        .mockImplementation(((
          event: string,
          listener: (...args: unknown[]) => void,
        ) => {
          void event;
          void listener;
          return process;
        }) as unknown as typeof process.removeListener);

      service.registerGlobalHandlers();
      service.dispose();
      service.dispose();

      const deregistrations = processRemoveListenerSpy.mock.calls.filter(
        ([eventName]) =>
          PROCESS_EVENTS.includes(eventName as (typeof PROCESS_EVENTS)[number]),
      );

      expect(deregistrations).toHaveLength(4);

      processOnSpy.mockRestore();
      processRemoveListenerSpy.mockRestore();
    });

    it('should handle SIGINT and SIGTERM through failure output path', () => {
      const listeners = new Map<string, (...args: unknown[]) => void>();
      const processOnSpy = jest.spyOn(process, 'on').mockImplementation(((
        event: string,
        listener: (...args: unknown[]) => void,
      ) => {
        listeners.set(event, listener);
        return process;
      }) as unknown as typeof process.on);
      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      service.registerGlobalHandlers();

      listeners.get('SIGINT')?.();
      listeners.get('SIGTERM')?.();

      expect(outputMock.handleOutput).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          status: Status.Failure,
          data: expect.objectContaining({
            code: InternalError.CODE,
            message: 'Interrupted by user',
          }),
        }),
      );
      expect(outputMock.handleOutput).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          status: Status.Failure,
          data: expect.objectContaining({
            code: InternalError.CODE,
            message: 'Process terminated',
          }),
        }),
      );

      expect(processExitSpy).toHaveBeenCalledTimes(2);
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processOnSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });
});
