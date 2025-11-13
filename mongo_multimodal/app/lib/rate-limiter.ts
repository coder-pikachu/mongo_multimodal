/**
 * Rate limiting utility for voice sessions
 * Prevents abuse and controls API costs
 */

interface RateLimitConfig {
  /**
   * Time window in milliseconds (default: 60000 = 1 minute)
   */
  windowMs: number;
  /**
   * Maximum requests allowed per window
   */
  maxRequests: number;
  /**
   * Optional cleanup interval in milliseconds
   */
  cleanupIntervalMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  timestamps: number[];
}

/**
 * In-memory rate limiter using sliding window algorithm
 * For production with multiple servers, use Redis instead
 */
export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      maxRequests: config.maxRequests || 10,
      cleanupIntervalMs: config.cleanupIntervalMs || 300000, // 5 minutes
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request should be rate limited
   * Returns rate limit info regardless of whether limit is exceeded
   *
   * @param key - Unique identifier (userId, IP address, etc.)
   * @returns Rate limit information
   */
  async check(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    // No previous requests - allow
    if (!entry) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.config.windowMs,
        timestamps: [now],
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Clean up old timestamps (sliding window)
    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < this.config.windowMs
    );

    // Check if limit exceeded
    if (validTimestamps.length >= this.config.maxRequests) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfter = Math.ceil(
        (oldestTimestamp + this.config.windowMs - now) / 1000
      );

      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestTimestamp + this.config.windowMs,
        retryAfter,
      };
    }

    // Add new timestamp
    validTimestamps.push(now);
    this.store.set(key, {
      count: validTimestamps.length,
      resetAt: validTimestamps[0] + this.config.windowMs,
      timestamps: validTimestamps,
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - validTimestamps.length,
      resetAt: validTimestamps[0] + this.config.windowMs,
    };
  }

  /**
   * Check rate limit and throw error if exceeded
   * Convenience method for simpler error handling
   *
   * @param key - Unique identifier
   * @throws Error if rate limit exceeded
   */
  async checkOrThrow(key: string): Promise<void> {
    const result = await this.check(key);

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        result.retryAfter || 0,
        result.resetAt
      );
    }
  }

  /**
   * Reset rate limit for a specific key
   * Useful for testing or manual overrides
   *
   * @param key - Unique identifier to reset
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current rate limit status without incrementing
   *
   * @param key - Unique identifier
   * @returns Current rate limit info
   */
  getStatus(key: string): {
    requests: number;
    remaining: number;
    resetAt: number | null;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      return {
        requests: 0,
        remaining: this.config.maxRequests,
        resetAt: null,
      };
    }

    // Count valid timestamps
    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < this.config.windowMs
    );

    return {
      requests: validTimestamps.length,
      remaining: Math.max(0, this.config.maxRequests - validTimestamps.length),
      resetAt: validTimestamps.length > 0
        ? validTimestamps[0] + this.config.windowMs
        : null,
    };
  }

  /**
   * Start periodic cleanup of expired entries
   * Prevents memory leaks from storing old data
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.store.entries()) {
        // Remove entries where all timestamps are expired
        const validTimestamps = entry.timestamps.filter(
          (ts) => now - ts < this.config.windowMs
        );

        if (validTimestamps.length === 0) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.store.delete(key));

      if (keysToDelete.length > 0) {
        console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop cleanup interval
   * Call when shutting down application
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Custom error class for rate limit exceptions
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public resetAt: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Singleton instance for voice session rate limiting
 * 10 sessions per minute per user
 */
export const voiceSessionLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 50,
  cleanupIntervalMs: 300000, // 5 minutes
});

/**
 * Singleton instance for voice streaming rate limiting
 * 100 audio chunks per minute per session (prevents audio spam)
 */
export const voiceStreamLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  cleanupIntervalMs: 300000, // 5 minutes
});
