interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if an action is allowed for a given key (e.g., email, IP)
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return true;
    }

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      return false;
    }

    // Check if window has expired
    if (now - record.firstAttempt > this.config.windowMs) {
      this.attempts.delete(key);
      return true;
    }

    // Check if under limit
    return record.count < this.config.maxAttempts;
  }

  /**
   * Record an attempt for a given key
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return;
    }

    // Reset if window expired
    if (now - record.firstAttempt > this.config.windowMs) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return;
    }

    // Increment count
    record.count++;

    // Block if limit exceeded
    if (record.count >= this.config.maxAttempts) {
      record.blockedUntil = now + this.config.blockDurationMs;
    }
  }

  /**
   * Get remaining attempts for a key
   */
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) {
      return this.config.maxAttempts;
    }

    const now = Date.now();
    if (now - record.firstAttempt > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - record.count);
  }

  /**
   * Get time until unblocked (in seconds)
   */
  getBlockedTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record || !record.blockedUntil) {
      return 0;
    }

    const now = Date.now();
    if (now >= record.blockedUntil) {
      return 0;
    }

    return Math.ceil((record.blockedUntil - now) / 1000);
  }

  /**
   * Clear attempts for a key (e.g., after successful login)
   */
  clearAttempts(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clean up expired records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (
        now - record.firstAttempt > this.config.windowMs &&
        (!record.blockedUntil || now >= record.blockedUntil)
      ) {
        this.attempts.delete(key);
      }
    }
  }
}

// Create rate limiters for different actions
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
});

export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
});

export const registrationRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours block
});

// Cleanup expired records every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
    passwordResetRateLimiter.cleanup();
    registrationRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}