/**
 * Logging Service for Production-Ready Application
 * 
 * This logger provides:
 * - Structured logging with log levels
 * - Production vs Development behavior
 * - Safe error serialization
 * - Integration points for external logging services
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User signed in', { userId: '123' });
 *   logger.error('Database error', error, { context: 'additional data' });
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level =
      process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: LogMetadata | Error,
  ): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    const logData = {
      timestamp,
      level: levelName,
      message,
      ...(meta instanceof Error ? this.serializeError(meta) : meta),
    };

    // In development, use console
    if (process.env.NODE_ENV === "development") {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`[${timestamp}] DEBUG:`, message, meta);
          break;
        case LogLevel.INFO:
          console.info(`[${timestamp}] INFO:`, message, meta);
          break;
        case LogLevel.WARN:
          console.warn(`[${timestamp}] WARN:`, message, meta);
          break;
        case LogLevel.ERROR:
          console.error(`[${timestamp}] ERROR:`, message, meta);
          break;
      }
    } else {
      // In production, log as JSON for easier parsing
      console.log(JSON.stringify(logData));

      // Send to external logging service
      this.sendToLoggingService(logData);
    }
  }

  private serializeError(error: Error): LogMetadata {
    return {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Include any custom properties on the error
        ...Object.getOwnPropertyNames(error).reduce(
          (acc, key) => {
            if (key !== "name" && key !== "message" && key !== "stack") {
              acc[key] = (error as unknown as Record<string, unknown>)[key];
            }
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      },
    };
  }

  private sendToLoggingService(logData: LogMetadata): void {
    // TODO: Integrate with your logging service
    // Examples:
    // - Sentry: Sentry.captureMessage(logData.message, { level, extra: logData });
    // - Datadog: logger.log(logData);
    // - CloudWatch: cloudwatchClient.putLogEvents({ logEvents: [logData] });
    // - PostHog: posthog.capture('log', { properties: logData });

    // For now, this is a no-op in production
    // Logs are still output as JSON to stdout for container logging
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log informational messages
   */
  info(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log error messages with optional error object
   */
  error(message: string, error?: Error, meta?: LogMetadata): void {
    const combinedMeta = {
      ...(error ? this.serializeError(error) : {}),
      ...(meta ?? {}),
    };
    this.log(LogLevel.ERROR, message, combinedMeta);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper to measure execution time
 * 
 * Usage:
 *   const end = measureTime('database-query');
 *   await db.query();
 *   end(); // Logs execution time
 */
export function measureTime(label: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    logger.debug(`${label} took ${duration.toFixed(2)}ms`);
  };
}

/**
 * Async wrapper with timing and error logging
 * 
 * Usage:
 *   const result = await withLogging('fetch-user', async () => {
 *     return await fetchUser(userId);
 *   });
 */
export async function withLogging<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = measureTime(label);
  try {
    const result = await fn();
    end();
    return result;
  } catch (error) {
    end();
    logger.error(`${label} failed`, error as Error);
    throw error;
  }
}
