/**
 * Comprehensive Error Handling and Fallback System
 * 
 * Provides robust error handling, retry mechanisms, circuit breakers,
 * and graceful degradation for the entire application.
 */

import { logger } from './logger';

// ============================================================================
// Error Types and Classes
// ============================================================================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  AI_SERVICE = 'ai_service',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  INTERNAL = 'internal',
  UNKNOWN = 'unknown',
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    public readonly isOperational: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      true,
      context
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      true,
      context
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'DATABASE_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      true,
      context
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    public readonly serviceName: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.MEDIUM,
      true,
      { ...context, serviceName }
    );
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'AI_SERVICE_ERROR',
      ErrorCategory.AI_SERVICE,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, unknown>) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.LOW,
      true,
      context
    );
  }
}

// ============================================================================
// Retry Mechanism
// ============================================================================

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff?: boolean;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  exponentialBackoff: true,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error instanceof ExternalServiceError) return true;
    if (error instanceof AIServiceError) return true;
    if (error instanceof DatabaseError) return false; // Don't retry DB errors
    if (error instanceof ValidationError) return false; // Don't retry validation errors
    return true;
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry = opts.shouldRetry?.(lastError) ?? true;
      const isLastAttempt = attempt === opts.maxAttempts;

      if (!shouldRetry || isLastAttempt) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      let delay = opts.delayMs;
      if (opts.exponentialBackoff) {
        delay = opts.delayMs * opts.backoffMultiplier! ** (attempt - 1);
        delay = Math.min(delay, opts.maxDelayMs!);
      }

      // Add jitter (randomness) to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      delay = delay + jitter;

      logger.warn(`Operation failed (attempt ${attempt}/${opts.maxAttempts}), retrying in ${delay}ms`, {
        error: lastError.message,
        attempt,
        delay,
      });

      opts.onRetry?.(attempt, lastError);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// Circuit Breaker Pattern
// ============================================================================

export enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;     // Number of failures before opening circuit
  successThreshold: number;     // Number of successes to close from half-open
  timeout: number;              // Time in ms before trying again (half-open)
  monitoringPeriod: number;     // Time window for failure tracking
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private nextAttempt: number = Date.now();
  private failureTimestamps: number[] = [];

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) { }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new AppError(
          `Circuit breaker '${this.name}' is OPEN`,
          'CIRCUIT_BREAKER_OPEN',
          ErrorCategory.INTERNAL,
          ErrorSeverity.MEDIUM,
          true,
          { circuitName: this.name, nextAttempt: new Date(this.nextAttempt) }
        );
      }
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.failureTimestamps = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successes = 0;
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures++;
    this.successes = 0;
    this.failureTimestamps.push(now);

    // Remove old timestamps outside monitoring period
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => now - timestamp < this.options.monitoringPeriod
    );

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureTimestamps.length >= this.options.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
      this.nextAttempt = now + this.options.timeout;
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      logger.info(`Circuit breaker '${this.name}' state transition: ${this.state} -> ${newState}`);
      this.state = newState;
      this.options.onStateChange?.(newState);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: new Date(this.nextAttempt),
      recentFailures: this.failureTimestamps.length,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    logger.info(`Circuit breaker '${this.name}' manually reset`);
  }
}

// ============================================================================
// Fallback Handler
// ============================================================================

export interface FallbackOptions<T> {
  fallbackValue?: T;
  fallbackFn?: () => Promise<T> | T;
  shouldFallback?: (error: Error) => boolean;
  onFallback?: (error: Error) => void;
}

export async function withFallback<T>(
  operation: () => Promise<T>,
  options: FallbackOptions<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    const shouldFallback = options.shouldFallback?.(err) ?? true;

    if (!shouldFallback) {
      throw err;
    }

    logger.warn('Operation failed, using fallback', {
      error: err.message,
      hasFallbackValue: options.fallbackValue !== undefined,
      hasFallbackFn: options.fallbackFn !== undefined,
    });

    options.onFallback?.(err);

    if (options.fallbackFn) {
      return await Promise.resolve(options.fallbackFn());
    }

    if (options.fallbackValue !== undefined) {
      return options.fallbackValue;
    }

    throw new AppError(
      'Operation failed and no fallback provided',
      'NO_FALLBACK',
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      true,
      { originalError: err.message }
    );
  }
}

// ============================================================================
// Timeout Handler
// ============================================================================

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(
          new AppError(
            errorMessage,
            'TIMEOUT_ERROR',
            ErrorCategory.INTERNAL,
            ErrorSeverity.MEDIUM,
            true,
            { timeoutMs }
          )
        ),
        timeoutMs
      )
    ),
  ]);
}

// ============================================================================
// Global Error Handler
// ============================================================================

export class ErrorHandler {
  static handle(error: Error, context?: Record<string, unknown>): void {
    if (error instanceof AppError) {
      ErrorHandler.handleAppError(error, context);
    } else {
      ErrorHandler.handleUnknownError(error, context);
    }
  }

  private static handleAppError(error: AppError, context?: Record<string, unknown>): void {
    const logContext = {
      ...error.context,
      ...context,
      code: error.code,
      category: error.category,
      severity: error.severity,
      isOperational: error.isOperational,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(error.message, error, logContext);
        // Send to error monitoring service (e.g., Sentry)
        break;
      case ErrorSeverity.HIGH:
        logger.error(error.message, error, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logContext);
        break;
      case ErrorSeverity.LOW:
        logger.info(error.message, logContext);
        break;
    }
  }

  private static handleUnknownError(error: Error, context?: Record<string, unknown>): void {
    logger.error('Unhandled error', error, context);
    // Send to error monitoring service
  }

  static toUserMessage(error: Error): string {
    if (error instanceof ValidationError) {
      return error.message;
    }
    if (error instanceof AuthenticationError) {
      return 'Please sign in to continue';
    }
    if (error instanceof AuthorizationError) {
      return 'You do not have permission to perform this action';
    }
    if (error instanceof RateLimitError) {
      return 'Too many requests. Please try again later';
    }
    if (error instanceof AIServiceError) {
      return 'AI service is temporarily unavailable. Please try again';
    }
    if (error instanceof DatabaseError) {
      return 'A database error occurred. Please try again';
    }
    if (error instanceof ExternalServiceError) {
      return 'An external service is temporarily unavailable. Please try again';
    }

    // Generic message for unknown errors
    return 'An unexpected error occurred. Please try again';
  }
}

// ============================================================================
// Pre-configured Circuit Breakers and Utilities
// ============================================================================

// Circuit breaker for Ollama AI service
export const ollamaCircuitBreaker = new CircuitBreaker('ollama-service', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 120000, // 2 minutes
  onStateChange: (state) => {
    logger.warn(`Ollama service circuit breaker state changed to: ${state}`);
  },
});

// Circuit breaker for database operations
export const databaseCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitoringPeriod: 60000, // 1 minute
  onStateChange: (state) => {
    logger.error(`Database circuit breaker state changed to: ${state}`);
  },
});

// Circuit breaker for external APIs
export const externalApiCircuitBreaker = new CircuitBreaker('external-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 120000, // 2 minutes
  onStateChange: (state) => {
    logger.warn(`External API circuit breaker state changed to: ${state}`);
  },
});

// ============================================================================
// Graceful Degradation Helpers
// ============================================================================

export async function gracefulDegradation<T>(
  operations: Array<() => Promise<T>>,
  fallbackValue: T
): Promise<T> {
  for (const operation of operations) {
    try {
      return await operation();
    } catch (error) {
      logger.warn('Operation failed, trying next fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.warn('All operations failed, using fallback value');
  return fallbackValue;
}

// ============================================================================
// Health Check Utilities
// ============================================================================

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  timestamp: Date;
}

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();

  async checkHealth(name: string, healthCheckFn: () => Promise<boolean>): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const isHealthy = await withTimeout(() => healthCheckFn(), 5000, `Health check '${name}' timed out`);
      const latencyMs = Date.now() - startTime;

      const check: HealthCheck = {
        name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        latencyMs,
        timestamp: new Date(),
      };

      this.checks.set(name, check);
      return check;
    } catch (error) {
      const check: HealthCheck = {
        name,
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };

      this.checks.set(name, check);
      return check;
    }
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
  } {
    const checks = Array.from(this.checks.values());
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();
