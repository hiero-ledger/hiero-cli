/**
 * Unit tests for LoggerService
 * Tests logging methods, level filtering, and message formatting
 */
import { LoggerService } from '@/core/services/logger/logger-service';
import { LogLevel } from '@/core/types/shared.types';

describe('LoggerService', () => {
  let logger: LoggerService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new LoggerService();
    consoleErrorSpy = jest.spyOn(console, LogLevel.ERROR).mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe(LogLevel.INFO, () => {
    it('should log info message with prefix', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should not log when level is error', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('Test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is warn', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('Test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is info', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should log when level is debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should not log when level is silent', () => {
      logger.setLevel(LogLevel.SILENT);
      logger.info('Test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe(LogLevel.ERROR, () => {
    it('should log error message with prefix', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is error', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is warn', () => {
      logger.setLevel(LogLevel.WARN);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is info', () => {
      logger.setLevel(LogLevel.INFO);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should not log when level is silent', () => {
      logger.setLevel(LogLevel.SILENT);
      logger.error('Error message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe(LogLevel.WARN, () => {
    it('should log warn message with prefix', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should not log when level is error', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn('Warning message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is warn', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log when level is info', () => {
      logger.setLevel(LogLevel.INFO);
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log when level is debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should not log when level is silent', () => {
      logger.setLevel(LogLevel.SILENT);
      logger.warn('Warning message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe(LogLevel.DEBUG, () => {
    it('should log debug message with prefix', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should not log when level is error', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is warn', () => {
      logger.setLevel(LogLevel.WARN);
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is info', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should not log when level is silent', () => {
      logger.setLevel(LogLevel.SILENT);
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    it('should change log level to error', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.debug('Should not log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to warn', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('Should not log');
      logger.debug('Should not log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to info', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('Should not log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Should log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to silent', () => {
      logger.setLevel(LogLevel.SILENT);
      logger.debug('Should not log');
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.error('Should not log');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('default level', () => {
    it('should default to silent level', () => {
      logger.debug('Should not log');
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.error('Should not log');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
