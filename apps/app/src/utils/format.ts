/**
 * Shared formatting utilities used across tab components.
 */

/**
 * Format date to locale string.
 * Default: "January 1, 2026" (month: "long")
 * With short: "Jan 1, 2026" (month: "short")
 */
export function formatDate(dateString?: string, monthFormat: "long" | "short" = "long"): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: monthFormat,
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Classify a communication value by its pattern.
 */
export function classifyCommunication(value: string): "email" | "phone" | "facebook" | "instagram" | null {
  if (/@.+\./.test(value)) return "email";
  if (/^\+?\d[\d\s\-().]{5,}$/.test(value)) return "phone";
  if (/facebook\.com/i.test(value)) return "facebook";
  if (/instagram\.com/i.test(value)) return "instagram";
  return null;
}

/**
 * Extract display name from social URL.
 */
export function extractSocialHandle(url: string, platform: "facebook" | "instagram"): string {
  try {
    const cleaned = url.replace(/\/+$/, "");
    const parts = cleaned.split("/");
    const handle = parts[parts.length - 1] || url;
    return platform === "instagram" ? `@${handle}` : handle;
  } catch {
    return url;
  }
}
