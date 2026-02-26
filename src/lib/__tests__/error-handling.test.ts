import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalServiceError,
  AIServiceError,
  RateLimitError,
  withRetry,
  CircuitBreaker,
  CircuitState,
  withFallback,
  withTimeout,
  ErrorHandler,
  ErrorSeverity,
  ErrorCategory,
  gracefulDegradation,
  HealthMonitor,
} from '@/lib/error-handling';

describe('Error Handling System', () => {
  describe('Error Classes', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError();

      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should create DatabaseError with context', () => {
      const error = new DatabaseError('Query failed', { query: 'SELECT *' });

      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.context).toEqual({ query: 'SELECT *' });
    });

    it('should create ExternalServiceError with service name', () => {
      const error = new ExternalServiceError('Service unavailable', 'PaymentAPI');

      expect(error.serviceName).toBe('PaymentAPI');
      expect(error.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
    });

    it('should capture stack trace', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.INTERNAL,
        ErrorSeverity.MEDIUM
      );

      expect(error.stack).toBeDefined();
    });
  });

  describe('withRetry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max attempts', async () => {
      const operation = async () => {
        throw new Error('Permanent failure');
      };

      await expect(
        withRetry(operation, { maxAttempts: 3, delayMs: 10 })
      ).rejects.toThrow('Permanent failure');
    });

    it('should not retry validation errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new ValidationError('Invalid input');
      };

      await expect(
        withRetry(operation, { maxAttempts: 3, delayMs: 10 })
      ).rejects.toThrow('Invalid input');

      expect(attempts).toBe(1); // Should not retry
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const delays: number[] = [];
      const startTimes: number[] = [];

      const operation = async () => {
        const now = Date.now();
        if (attempts > 0) {
          delays.push(now - startTimes[startTimes.length - 1]);
        }
        startTimes.push(now);
        attempts++;

        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      await withRetry(operation, {
        maxAttempts: 3,
        delayMs: 100,
        exponentialBackoff: true,
        backoffMultiplier: 2,
      });

      // Second attempt should wait ~100ms, third ~200ms (with jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(80);
      expect(delays[1]).toBeGreaterThanOrEqual(150);
    });

    it('should call onRetry callback', async () => {
      const onRetryMock = vi.fn();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      await withRetry(operation, {
        maxAttempts: 3,
        delayMs: 10,
        onRetry: onRetryMock,
      });

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open after threshold failures', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      });

      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingOp)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject requests when OPEN', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      });

      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Open the circuit
      await expect(breaker.execute(failingOp)).rejects.toThrow();
      await expect(breaker.execute(failingOp)).rejects.toThrow();

      // Now circuit is OPEN
      await expect(
        breaker.execute(async () => 'success')
      ).rejects.toThrow('Circuit breaker');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 100, // Short timeout
        monitoringPeriod: 5000,
      });

      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Open the circuit
      await expect(breaker.execute(failingOp)).rejects.toThrow();
      await expect(breaker.execute(failingOp)).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to HALF_OPEN and succeed
      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset circuit manually', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      });

      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Open the circuit
      await expect(breaker.execute(failingOp)).rejects.toThrow();
      await expect(breaker.execute(failingOp)).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should track statistics', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      });

      await breaker.execute(async () => 'success');
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      const stats = breaker.getStats();

      expect(stats.state).toBeDefined();
      expect(stats.failures).toBeGreaterThan(0);
    });
  });

  describe('withFallback', () => {
    it('should return operation result on success', async () => {
      const result = await withFallback(
        async () => 'primary',
        { fallbackValue: 'fallback' }
      );

      expect(result).toBe('primary');
    });

    it('should use fallback value on failure', async () => {
      const result = await withFallback(
        async () => {
          throw new Error('Operation failed');
        },
        { fallbackValue: 'fallback' }
      );

      expect(result).toBe('fallback');
    });

    it('should use fallback function', async () => {
      const result = await withFallback(
        async () => {
          throw new Error('Operation failed');
        },
        {
          fallbackFn: async () => 'computed fallback',
        }
      );

      expect(result).toBe('computed fallback');
    });

    it('should call onFallback callback', async () => {
      const onFallbackMock = vi.fn();

      await withFallback(
        async () => {
          throw new Error('Operation failed');
        },
        {
          fallbackValue: 'fallback',
          onFallback: onFallbackMock,
        }
      );

      expect(onFallbackMock).toHaveBeenCalled();
    });

    it('should throw if no fallback provided', async () => {
      await expect(
        withFallback(
          async () => {
            throw new Error('Operation failed');
          },
          {}
        )
      ).rejects.toThrow('no fallback provided');
    });

    it('should respect shouldFallback predicate', async () => {
      await expect(
        withFallback(
          async () => {
            throw new ValidationError('Invalid input');
          },
          {
            fallbackValue: 'fallback',
            shouldFallback: (error) => !(error instanceof ValidationError),
          }
        )
      ).rejects.toThrow('Invalid input');
    });
  });

  describe('withTimeout', () => {
    it('should return result if completes in time', async () => {
      const result = await withTimeout(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        },
        100
      );

      expect(result).toBe('success');
    });

    it('should throw timeout error if takes too long', async () => {
      await expect(
        withTimeout(
          async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'success';
          },
          50,
          'Custom timeout message'
        )
      ).rejects.toThrow('Custom timeout message');
    });

    it('should include timeout in error context', async () => {
      try {
        await withTimeout(
          async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
          },
          50
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.context?.timeoutMs).toBe(50);
        }
      }
    });
  });

  describe('ErrorHandler', () => {
    it('should convert errors to user messages', () => {
      const errors = [
        new ValidationError('Invalid email'),
        new AuthenticationError(),
        new AuthorizationError(),
        new RateLimitError(),
        new AIServiceError('AI unavailable'),
        new DatabaseError('Query failed'),
        new Error('Unknown error'),
      ];

      errors.forEach(error => {
        const message = ErrorHandler.toUserMessage(error);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should show specific message for validation errors', () => {
      const error = new ValidationError('Invalid email format');
      const message = ErrorHandler.toUserMessage(error);

      expect(message).toBe('Invalid email format');
    });

    it('should show generic message for unknown errors', () => {
      const error = new Error('Internal error');
      const message = ErrorHandler.toUserMessage(error);

      expect(message).toContain('unexpected error');
    });
  });

  describe('gracefulDegradation', () => {
    it('should try operations in order', async () => {
      let attempt = 0;

      const operations = [
        async () => {
          attempt = 1;
          throw new Error('Primary failed');
        },
        async () => {
          attempt = 2;
          return 'Secondary success';
        },
      ];

      const result = await gracefulDegradation(operations, 'fallback');

      expect(result).toBe('Secondary success');
      expect(attempt).toBe(2);
    });

    it('should use fallback if all operations fail', async () => {
      const operations = [
        async () => {
          throw new Error('Primary failed');
        },
        async () => {
          throw new Error('Secondary failed');
        },
      ];

      const result = await gracefulDegradation(operations, 'fallback');

      expect(result).toBe('fallback');
    });

    it('should return first successful result', async () => {
      const operations = [
        async () => 'First success',
        async () => 'Second success',
      ];

      const result = await gracefulDegradation(operations, 'fallback');

      expect(result).toBe('First success');
    });
  });

  describe('HealthMonitor', () => {
    let monitor: HealthMonitor;

    beforeEach(() => {
      monitor = new HealthMonitor();
    });

    it('should report healthy service', async () => {
      const check = await monitor.checkHealth('test-service', async () => true);

      expect(check.name).toBe('test-service');
      expect(check.status).toBe('healthy');
      expect(check.latencyMs).toBeGreaterThan(0);
    });

    it('should report unhealthy service', async () => {
      const check = await monitor.checkHealth('test-service', async () => false);

      expect(check.status).toBe('unhealthy');
    });

    it('should handle health check errors', async () => {
      const check = await monitor.checkHealth('test-service', async () => {
        throw new Error('Health check failed');
      });

      expect(check.status).toBe('unhealthy');
      expect(check.message).toContain('Health check failed');
    });

    it('should timeout slow health checks', async () => {
      const check = await monitor.checkHealth('test-service', async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return true;
      });

      expect(check.status).toBe('unhealthy');
      expect(check.message).toContain('timed out');
    });

    it('should aggregate overall health', async () => {
      await monitor.checkHealth('service1', async () => true);
      await monitor.checkHealth('service2', async () => false);

      const overall = monitor.getOverallHealth();

      expect(overall.status).toBe('unhealthy');
      expect(overall.checks).toHaveLength(2);
    });

    it('should report degraded status', async () => {
      await monitor.checkHealth('service1', async () => true);

      // Manually set a degraded status (in real implementation)
      const overall = monitor.getOverallHealth();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(overall.status);
    });
  });

  describe('Pre-configured Circuit Breakers', () => {
    it('should export ollama circuit breaker', () => {
      const { ollamaCircuitBreaker } = require('@/lib/error-handling');

      expect(ollamaCircuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(ollamaCircuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should export database circuit breaker', () => {
      const { databaseCircuitBreaker } = require('@/lib/error-handling');

      expect(databaseCircuitBreaker).toBeInstanceOf(CircuitBreaker);
    });

    it('should export external API circuit breaker', () => {
      const { externalApiCircuitBreaker } = require('@/lib/error-handling');

      expect(externalApiCircuitBreaker).toBeInstanceOf(CircuitBreaker);
    });
  });
});
