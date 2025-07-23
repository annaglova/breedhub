import { useState, useCallback } from 'react';
import { loginRateLimiter, passwordResetRateLimiter, registrationRateLimiter } from '@shared/utils/rateLimiter';
import { secureErrorMessages } from '@shared/utils/securityUtils';

type RateLimiterType = 'login' | 'passwordReset' | 'registration';

interface UseRateLimiterReturn {
  checkRateLimit: (key: string) => { allowed: boolean; message?: string; remainingAttempts?: number; blockedTime?: number };
  recordAttempt: (key: string) => void;
  clearAttempts: (key: string) => void;
  isBlocked: boolean;
  remainingAttempts: number;
  blockedTime: number;
}

export function useRateLimiter(type: RateLimiterType): UseRateLimiterReturn {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const [blockedTime, setBlockedTime] = useState(0);

  const getRateLimiter = () => {
    switch (type) {
      case 'login':
        return loginRateLimiter;
      case 'passwordReset':
        return passwordResetRateLimiter;
      case 'registration':
        return registrationRateLimiter;
    }
  };

  const checkRateLimit = useCallback((key: string) => {
    const limiter = getRateLimiter();
    const allowed = limiter.isAllowed(key);
    const remaining = limiter.getRemainingAttempts(key);
    const blocked = limiter.getBlockedTime(key);

    setIsBlocked(!allowed);
    setRemainingAttempts(remaining);
    setBlockedTime(blocked);

    if (!allowed) {
      const minutes = Math.ceil(blocked / 60);
      const message = minutes > 1 
        ? `Too many attempts. Please try again in ${minutes} minutes.`
        : `Too many attempts. Please try again in ${blocked} seconds.`;
      
      return {
        allowed: false,
        message,
        remainingAttempts: 0,
        blockedTime: blocked,
      };
    }

    if (remaining <= 2) {
      return {
        allowed: true,
        message: `${remaining} attempt${remaining === 1 ? '' : 's'} remaining`,
        remainingAttempts: remaining,
        blockedTime: 0,
      };
    }

    return {
      allowed: true,
      remainingAttempts: remaining,
      blockedTime: 0,
    };
  }, [type]);

  const recordAttempt = useCallback((key: string) => {
    const limiter = getRateLimiter();
    limiter.recordAttempt(key);
    
    // Update state
    const remaining = limiter.getRemainingAttempts(key);
    const blocked = limiter.getBlockedTime(key);
    
    setRemainingAttempts(remaining);
    setBlockedTime(blocked);
    setIsBlocked(blocked > 0);
  }, [type]);

  const clearAttempts = useCallback((key: string) => {
    const limiter = getRateLimiter();
    limiter.clearAttempts(key);
    
    setIsBlocked(false);
    setRemainingAttempts(limiter.getRemainingAttempts(key));
    setBlockedTime(0);
  }, [type]);

  return {
    checkRateLimit,
    recordAttempt,
    clearAttempts,
    isBlocked,
    remainingAttempts,
    blockedTime,
  };
}