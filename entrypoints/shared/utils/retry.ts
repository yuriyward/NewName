import { debugLogger } from '../debug/logger';

/**
 * Backoff strategy types for retry logic
 */
export type BackoffStrategy =
  | { type: 'linear'; baseDelay: number } // delay = baseDelay * (attempt + 1)
  | { type: 'exponential'; delays: readonly number[] } // Use predefined delays array
  | { type: 'fixed'; delay: number }; // Same delay for all attempts

/**
 * Options for retry with backoff
 */
export interface RetryWithBackoffOptions {
  /** Maximum number of retry attempts (including the initial attempt) */
  maxAttempts: number;
  /** Backoff strategy configuration */
  backoff: BackoffStrategy;
  /** Context name for logging */
  context: string;
  /** Optional condition to determine if an error should trigger a retry */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Optional callback invoked before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Calculate delay based on backoff strategy
 */
function calculateDelay(strategy: BackoffStrategy, attempt: number): number {
  switch (strategy.type) {
    case 'linear':
      return strategy.baseDelay * (attempt + 1);
    case 'exponential':
      return strategy.delays[attempt] ?? strategy.delays.at(-1) ?? 1000;
    case 'fixed':
      return strategy.delay;
  }
}

/**
 * Retries an async operation with configurable backoff strategy.
 *
 * @example
 * ```ts
 * // Linear backoff (100ms, 200ms, 300ms)
 * const result = await retryWithBackoff(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 3,
 *     backoff: { type: 'linear', baseDelay: 100 },
 *     context: 'fetchData',
 *   }
 * );
 *
 * // Exponential backoff (100ms, 200ms, 400ms)
 * const result = await retryWithBackoff(
 *   () => importModule(),
 *   {
 *     maxAttempts: 3,
 *     backoff: { type: 'exponential', delays: [100, 200, 400] },
 *     context: 'importModule',
 *   }
 * );
 *
 * // Fixed delay
 * const result = await retryWithBackoff(
 *   () => checkStatus(),
 *   {
 *     maxAttempts: 5,
 *     backoff: { type: 'fixed', delay: 500 },
 *     context: 'checkStatus',
 *   }
 * );
 * ```
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration
 * @returns The result of the successful operation
 * @throws The last error if all retry attempts fail
 */
export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryWithBackoffOptions,
): Promise<T> {
  const { maxAttempts, backoff, context, shouldRetry, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await operation(attempt);

      // Log success if this was a retry
      if (attempt > 0) {
        debugLogger.log(
          `[Retry] ${context} succeeded on attempt ${attempt + 1}`,
          {
            attempt: attempt + 1,
            totalAttempts: maxAttempts,
          },
        );
      }

      return result;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts - 1;

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error, attempt)) {
        debugLogger.warn(`[Retry] ${context} failed with non-retryable error`, {
          attempt: attempt + 1,
          error,
        });
        throw error;
      }

      // If this was the last attempt, throw
      if (isLastAttempt) {
        debugLogger.error(
          `[Retry] ${context} failed after all retry attempts`,
          {
            attempt: attempt + 1,
            totalAttempts: maxAttempts,
            error,
          },
        );
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(backoff, attempt);

      debugLogger.log(`[Retry] ${context} failed, retrying...`, {
        attempt: attempt + 1,
        nextDelay: delay,
        error,
      });

      // Call optional onRetry callback
      onRetry?.(error, attempt, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to loop logic, but TypeScript needs it
  throw lastError ?? new Error('Retry loop completed without success or error');
}

/**
 * Retries an operation with simple linear backoff.
 * Convenience wrapper around retryWithBackoff for common cases.
 *
 * @example
 * ```ts
 * const data = await retryWithLinearBackoff(
 *   () => api.getData(),
 *   { maxAttempts: 3, baseDelay: 100, context: 'getData' }
 * );
 * ```
 */
export async function retryWithLinearBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    maxAttempts: number;
    baseDelay: number;
    context: string;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  },
): Promise<T> {
  return retryWithBackoff(operation, {
    ...options,
    backoff: { type: 'linear', baseDelay: options.baseDelay },
  });
}

/**
 * Retries an operation with exponential backoff using predefined delays.
 * Convenience wrapper around retryWithBackoff for common cases.
 *
 * @example
 * ```ts
 * const module = await retryWithExponentialBackoff(
 *   () => import('./module'),
 *   { delays: [100, 200, 400], context: 'importModule' }
 * );
 * ```
 */
export async function retryWithExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    delays: readonly number[];
    context: string;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  },
): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts: options.delays.length,
    context: options.context,
    backoff: { type: 'exponential', delays: options.delays },
    shouldRetry: options.shouldRetry,
  });
}
