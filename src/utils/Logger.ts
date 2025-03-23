/**
 * Log levels for the application
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Logger utility for consistent logging across the application
 */
export class Logger {
  private static currentLogLevel: LogLevel = LogLevel.INFO;
  private scope: string;

  /**
   * Create a new logger with a specified scope
   * @param scope The scope of this logger instance
   */
  constructor(scope: string) {
    this.scope = scope;
  }

  /**
   * Set the global log level
   * @param level The log level to set
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.currentLogLevel = level;
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
   * Log a message at the specified level if the global log level allows it
   * @param level The log level of the message
   * @param message The message to log
   */
  private log(level: LogLevel, message: string): void {
    if (level > Logger.currentLogLevel) {
      return;
    }

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