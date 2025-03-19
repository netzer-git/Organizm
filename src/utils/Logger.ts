/**
 * Log levels for the logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Simple logging utility to track animal activities
 */
export class Logger {
  private scope: string;
  private static logLevel: LogLevel = LogLevel.INFO;

  /**
   * Set the global log level
   * @param level The minimum log level to display
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }

  /**
   * Create a new logger with a specific scope
   * @param scope The scope identifier for this logger
   */
  constructor(scope: string) {
    this.scope = scope;
  }

  /**
   * Log a debug message
   * @param message The message to log
   */
  public debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }

  /**
   * Log an info message
   * @param message The message to log
   */
  public info(message: string): void {
    this.log(LogLevel.INFO, message);
  }

  /**
   * Log a warning message
   * @param message The message to log
   */
  public warn(message: string): void {
    this.log(LogLevel.WARN, message);
  }

  /**
   * Log an error message
   * @param message The message to log
   */
  public error(message: string): void {
    this.log(LogLevel.ERROR, message);
  }

  /**
   * Internal log method
   * @param level The log level
   * @param message The message to log
   */
  private log(level: LogLevel, message: string): void {
    if (level < Logger.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelString = LogLevel[level];
    
    const formattedMessage = `[${timestamp}] [${levelString}] [${this.scope}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
      default:
        console.log(formattedMessage);
        break;
    }
  }
}