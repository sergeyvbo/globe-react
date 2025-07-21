import winston from 'winston';
import { DeploymentError } from './types.js';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Logger configuration
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, context, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...(stack && { stack }),
      ...(context && { context }),
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
        })
      )
    }),
    new winston.transports.File({
      filename: 'deployment.log',
      format: logFormat
    })
  ]
});

// Logger utility class
export class Logger {
  private context: string;

  constructor(context: string = 'Deployment') {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    logger.log(level, message, {
      context: this.context,
      ...meta
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | DeploymentError, meta?: Record<string, unknown>): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof DeploymentError && {
          code: error.code,
          recoverable: error.recoverable,
          context: error.context
        })
      }
    } : {};

    this.log(LogLevel.ERROR, message, {
      ...errorMeta,
      ...meta
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  // Create child logger with additional context
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`);
  }

  // Log deployment step start
  stepStart(step: string, meta?: Record<string, unknown>): void {
    this.info(`Starting: ${step}`, { step: 'start', ...meta });
  }

  // Log deployment step completion
  stepComplete(step: string, duration: number, meta?: Record<string, unknown>): void {
    this.info(`Completed: ${step}`, { 
      step: 'complete', 
      duration: `${duration}ms`,
      ...meta 
    });
  }

  // Log deployment step failure
  stepFailed(step: string, error: Error | DeploymentError, meta?: Record<string, unknown>): void {
    this.error(`Failed: ${step}`, error, { 
      step: 'failed',
      ...meta 
    });
  }

  // Measure and log execution time
  async time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.stepStart(operation);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.stepComplete(operation, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.stepFailed(operation, error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }

  // Log configuration (without sensitive data)
  logConfig(config: Record<string, unknown>, sensitiveKeys: string[] = []): void {
    const sanitized = this.sanitizeConfig(config, sensitiveKeys);
    this.debug('Configuration loaded', { config: sanitized });
  }

  // Sanitize configuration by masking sensitive values
  private sanitizeConfig(obj: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeConfig(value as Record<string, unknown>, sensitiveKeys);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Default logger instance
export const defaultLogger = new Logger();

// Export logger for direct use
export { logger as winstonLogger };