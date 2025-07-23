/**
 * Security utilities for auth pages
 */

// Generic error messages that don't reveal sensitive information
export const secureErrorMessages = {
  // Login errors
  invalidCredentials: "Invalid email or password. Please try again.",
  accountLocked: "Account temporarily locked. Please try again later.",
  accountDisabled: "This account has been disabled. Please contact support.",
  
  // Registration errors
  emailTaken: "An account with this email may already exist.",
  registrationFailed: "Unable to create account. Please try again.",
  
  // Password reset errors
  resetFailed: "If an account exists with this email, you will receive reset instructions.",
  invalidResetToken: "This password reset link is invalid or has expired.",
  
  // General errors
  networkError: "Network error. Please check your connection and try again.",
  serverError: "Something went wrong. Please try again later.",
  tooManyAttempts: "Too many attempts. Please try again later.",
  
  // Validation errors (these can be specific)
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  passwordRequired: "Password is required",
  passwordTooShort: "Password must be at least 8 characters",
  passwordMismatch: "Passwords do not match",
  termsRequired: "You must agree to the terms of service",
};

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    // Check for common sensitive patterns
    if (error.toLowerCase().includes('user not found')) {
      return secureErrorMessages.invalidCredentials;
    }
    if (error.toLowerCase().includes('duplicate') || error.toLowerCase().includes('already exists')) {
      return secureErrorMessages.emailTaken;
    }
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
      return secureErrorMessages.networkError;
    }
  }
  
  // Default to generic error
  return secureErrorMessages.serverError;
}

/**
 * Log security events (in production, this would send to a security monitoring service)
 */
export function logSecurityEvent(event: {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_reset' | 'registration' | 'rate_limit';
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}) {
  // In development, just console log
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security Event]', event);
  }
  
  // In production, this would send to a security monitoring service
  // Example: sendToSecurityMonitoring(event);
}

/**
 * Hash sensitive data for logging (using a simple hash for demo)
 */
export function hashForLogging(data: string): string {
  // In production, use a proper hashing function
  return `${data.charAt(0)}***${data.charAt(data.length - 1)}`;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain an uppercase letter");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a lowercase letter");
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number");
  } else {
    score += 1;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain a special character");
  } else {
    score += 1;
  }

  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /^12345678/,
    /^111111/,
    /^123123/,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push("Password is too common");
    score = Math.max(0, score - 2);
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(5, score),
  };
}

/**
 * Generate a secure random string (for CSRF tokens, etc.)
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

/**
 * Time-constant string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}