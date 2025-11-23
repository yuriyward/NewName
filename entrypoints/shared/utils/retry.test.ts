import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  retryWithBackoff,
  retryWithExponentialBackoff,
  retryWithLinearBackoff,
} from './retry';

describe('retryWithBackoff', () => {
  afterEach(() => {});

  describe('success cases', () => {
    it('returns result immediately on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(0);
    });

    it('succeeds on second attempt after first failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('succeeds on last attempt', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('failure cases', () => {
    it('throws last error after all attempts fail', async () => {
      const lastError = new Error('final failure');
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockRejectedValueOnce(lastError);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 3,
          backoff: { type: 'linear', baseDelay: 1 },
          context: 'test',
        }),
      ).rejects.toThrow('final failure');

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('backoff strategies', () => {
    it('applies linear backoff delays correctly', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('failure');
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(((
        fn: () => void,
        delay: number,
      ) => {
        delays.push(delay);
        fn(); // Execute immediately for test speed
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 3,
          backoff: { type: 'linear', baseDelay: 100 },
          context: 'test',
        }),
      ).rejects.toThrow();

      expect(delays).toEqual([100, 200]);
    });

    it('applies exponential backoff delays correctly', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('failure');
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(((
        fn: () => void,
        delay: number,
      ) => {
        delays.push(delay);
        fn();
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 3,
          backoff: { type: 'exponential', delays: [100, 200, 400] },
          context: 'test',
        }),
      ).rejects.toThrow();

      expect(delays).toEqual([100, 200]);
    });

    it('uses last delay when attempts exceed delay array length', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('failure');
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(((
        fn: () => void,
        delay: number,
      ) => {
        delays.push(delay);
        fn();
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 5,
          backoff: { type: 'exponential', delays: [100, 200] },
          context: 'test',
        }),
      ).rejects.toThrow();

      expect(delays).toEqual([100, 200, 200, 200]);
    });

    it('applies fixed delay for all retries', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('failure');
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(((
        fn: () => void,
        delay: number,
      ) => {
        delays.push(delay);
        fn();
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 3,
          backoff: { type: 'fixed', delay: 500 },
          context: 'test',
        }),
      ).rejects.toThrow();

      expect(delays).toEqual([500, 500]);
    });
  });

  describe('shouldRetry callback', () => {
    it('stops retrying when shouldRetry returns false', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('network error'));
      const shouldRetry = vi
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 3,
          backoff: { type: 'linear', baseDelay: 1 },
          context: 'test',
          shouldRetry,
        }),
      ).rejects.toThrow('network error');

      expect(operation).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(2);
    });

    it('continues retrying when shouldRetry returns true', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient error'))
        .mockResolvedValueOnce('success');
      const shouldRetry = vi.fn().mockReturnValue(true);

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
        shouldRetry,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('onRetry callback', () => {
    it('calls onRetry before each retry', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');

      const onRetry = vi.fn();

      await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 0, 1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 2);
    });
  });

  describe('attempt parameter passed to operation', () => {
    it('passes correct attempt number to operation', async () => {
      const attempts: number[] = [];
      const operation = vi.fn().mockImplementation(async (attempt: number) => {
        attempts.push(attempt);
        if (attempt < 2) {
          throw new Error('retry');
        }
        return 'success';
      });

      await retryWithBackoff(operation, {
        maxAttempts: 3,
        backoff: { type: 'linear', baseDelay: 1 },
        context: 'test',
      });

      expect(attempts).toEqual([0, 1, 2]);
    });
  });
});

describe('retryWithLinearBackoff', () => {
  it('applies linear backoff correctly', async () => {
    const delays: number[] = [];
    const operation = vi.fn().mockImplementation(async () => {
      throw new Error('failure');
    });

    vi.spyOn(global, 'setTimeout').mockImplementation(((
      fn: () => void,
      delay: number,
    ) => {
      delays.push(delay);
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);

    await expect(
      retryWithLinearBackoff(operation, {
        maxAttempts: 3,
        baseDelay: 50,
        context: 'test',
      }),
    ).rejects.toThrow();

    expect(delays).toEqual([50, 100]);
  });
});

describe('retryWithExponentialBackoff', () => {
  it('applies exponential backoff correctly', async () => {
    const delays: number[] = [];
    const operation = vi.fn().mockImplementation(async () => {
      throw new Error('failure');
    });

    vi.spyOn(global, 'setTimeout').mockImplementation(((
      fn: () => void,
      delay: number,
    ) => {
      delays.push(delay);
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);

    await expect(
      retryWithExponentialBackoff(operation, {
        delays: [100, 200, 400],
        context: 'test',
      }),
    ).rejects.toThrow();

    expect(delays).toEqual([100, 200]);
  });

  it('succeeds on retry', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce('success');

    const result = await retryWithExponentialBackoff(operation, {
      delays: [1, 2, 4],
      context: 'test',
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
