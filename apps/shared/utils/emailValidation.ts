// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
  'getnada.com',
  'trashmail.com',
  'disposablemail.com'
];

// Common typos in popular email domains
const DOMAIN_SUGGESTIONS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'yahou.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaboo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlool.com': 'outlook.com',
};

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  isDisposable?: boolean;
}

/**
 * Validates an email address with various checks
 */
export function validateEmail(email: string): EmailValidationResult {
  // Trim whitespace
  const trimmedEmail = email.trim().toLowerCase();

  // Check if empty
  if (!trimmedEmail) {
    return { isValid: false, error: "Email is required" };
  }

  // Check basic format
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    // Check for common mistakes
    if (!trimmedEmail.includes('@')) {
      return { isValid: false, error: "Email must contain @ symbol" };
    }
    
    const parts = trimmedEmail.split('@');
    if (parts.length > 2) {
      return { isValid: false, error: "Email can only contain one @ symbol" };
    }
    
    if (parts[0].length === 0) {
      return { isValid: false, error: "Email must have characters before @" };
    }
    
    if (parts.length === 2 && parts[1].length === 0) {
      return { isValid: false, error: "Email must have domain after @" };
    }
    
    if (parts.length === 2 && !parts[1].includes('.')) {
      return { isValid: false, error: "Email domain must contain a dot" };
    }

    return { isValid: false, error: "Invalid email format" };
  }

  const [, domain] = trimmedEmail.split('@');

  // Check for disposable email
  const isDisposable = DISPOSABLE_DOMAINS.some(disposable => 
    domain.endsWith(disposable)
  );

  // Check for domain typos
  const suggestion = DOMAIN_SUGGESTIONS[domain];

  // Check domain length
  if (domain.length > 253) {
    return { isValid: false, error: "Domain name is too long" };
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return { isValid: false, error: "Email cannot contain consecutive dots" };
  }

  // Check if starts or ends with dot
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { isValid: false, error: "Email cannot start or end with a dot" };
  }

  return {
    isValid: true,
    suggestion,
    isDisposable,
  };
}

/**
 * Async email validation with additional checks
 * This could include API calls to verify email deliverability
 */
export async function validateEmailAsync(email: string): Promise<EmailValidationResult> {
  // First do basic validation
  const basicResult = validateEmail(email);
  
  if (!basicResult.isValid) {
    return basicResult;
  }

  // Simulate API call for email verification
  // In real app, this could check:
  // - MX records
  // - Email deliverability
  // - Known bounce lists
  await new Promise(resolve => setTimeout(resolve, 300));

  // For demo, we'll just return the basic result
  return basicResult;
}