import { Logger, LogLevel } from '../../src/utils/Logger';

describe('Logger', () => {
  // Spy on console methods
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Set up spies before each test
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset log level to INFO before each test
    Logger.setLogLevel(LogLevel.INFO);
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  it('should create a logger with the given scope', () => {
    const logger = new Logger('TestScope');
    logger.info('Test message');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [TestScope] Test message')
    );
  });

  it('should log at debug level', () => {
    // Set log level to DEBUG to ensure debug messages are shown
    Logger.setLogLevel(LogLevel.DEBUG);
    
    const logger = new Logger('TestScope');
    logger.debug('Debug message');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] [TestScope] Debug message')
    );
  });

  it('should log at info level', () => {
    const logger = new Logger('TestScope');
    logger.info('Info message');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [TestScope] Info message')
    );
  });

  it('should log at warn level', () => {
    const logger = new Logger('TestScope');
    logger.warn('Warning message');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] [TestScope] Warning message')
    );
  });

  it('should log at error level', () => {
    const logger = new Logger('TestScope');
    logger.error('Error message');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] [TestScope] Error message')
    );
  });

  it('should not log messages below the current log level', () => {
    // Set log level to ERROR, so only error messages should be logged
    Logger.setLogLevel(LogLevel.ERROR);
    
    const logger = new Logger('TestScope');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include timestamp in log messages', () => {
    const logger = new Logger('TestScope');
    logger.info('Message with timestamp');

    // Check if the log message includes a timestamp in ISO format
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\].*/)
    );
  });
});