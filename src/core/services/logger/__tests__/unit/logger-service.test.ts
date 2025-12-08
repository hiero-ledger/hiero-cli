/**
 * Unit tests for LoggerService
 * Tests logging methods, level filtering, and message formatting
 */
import { LoggerService } from '../../logger-service';

describe('LoggerService', () => {
  let logger: LoggerService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new LoggerService();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message with prefix', () => {
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should not log when level is error', () => {
      logger.setLevel('error');
      logger.info('Test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is warn', () => {
      logger.setLevel('warn');
      logger.info('Test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is info', () => {
      logger.setLevel('info');
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.info('Test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Test message');
    });
  });

  describe('error', () => {
    it('should log error message with prefix', () => {
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is error', () => {
      logger.setLevel('error');
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is warn', () => {
      logger.setLevel('warn');
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is info', () => {
      logger.setLevel('info');
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message');
    });
  });

  describe('warn', () => {
    it('should log warn message with prefix', () => {
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should not log when level is error', () => {
      logger.setLevel('error');
      logger.warn('Warning message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is warn', () => {
      logger.setLevel('warn');
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log when level is info', () => {
      logger.setLevel('info');
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.warn('Warning message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });
  });

  describe('debug', () => {
    it('should log debug message with prefix', () => {
      logger.setLevel('debug');
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should not log when level is error', () => {
      logger.setLevel('error');
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is warn', () => {
      logger.setLevel('warn');
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not log when level is info', () => {
      logger.setLevel('info');
      logger.debug('Debug message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when level is debug', () => {
      logger.setLevel('debug');
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });
  });

  describe('setLevel', () => {
    it('should change log level to error', () => {
      logger.setLevel('error');
      logger.info('Should not log');
      logger.warn('Should not log');
      logger.debug('Should not log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to warn', () => {
      logger.setLevel('warn');
      logger.info('Should not log');
      logger.debug('Should not log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to info', () => {
      logger.setLevel('info');
      logger.debug('Should not log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });

    it('should change log level to debug', () => {
      logger.setLevel('debug');
      logger.debug('Should log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });
  });

  describe('default level', () => {
    it('should default to info level', () => {
      logger.debug('Should not log');
      logger.info('Should log');
      logger.warn('Should log');
      logger.error('Should log');

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Should log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Should log');
    });
  });
});
