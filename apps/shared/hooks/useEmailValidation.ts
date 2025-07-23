import { useCallback, useState } from "react";

export function useEmailValidation() {
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateEmail = useCallback(async (email: string): Promise<boolean> => {
    setIsValidating(true);
    setError("");

    // Basic validation
    if (!email) {
      setError("Email is required");
      setIsValidating(false);
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setIsValidating(false);
      return false;
    }

    // Advanced validation (check for common typos)
    const commonDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
    const domain = email.split("@")[1];
    const suggestedDomain = commonDomains.find(d => {
      const distance = levenshteinDistance(domain, d);
      return distance > 0 && distance <= 2;
    });

    if (suggestedDomain && domain !== suggestedDomain) {
      setError(`Did you mean ${email.split("@")[0]}@${suggestedDomain}?`);
    }

    setIsValidating(false);
    return error === "";
  }, []);

  return { validateEmail, error, isValidating };
}

// Helper function for typo detection
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}