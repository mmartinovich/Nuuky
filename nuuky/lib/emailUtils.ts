/**
 * Email validation and formatting utilities
 */

/**
 * Validates an email address format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Masks an email address for display (e.g., "john@gmail.com" → "j***n@gmail.com")
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  if (!domain) return email;

  let maskedLocal: string;
  if (localPart.length <= 2) {
    maskedLocal = localPart;
  } else {
    maskedLocal = `${localPart[0]}${"*".repeat(Math.min(localPart.length - 2, 3))}${localPart.slice(-1)}`;
  }

  return `${maskedLocal}@${domain}`;
};

/**
 * Error messages for OTP-related errors
 */
export const OTP_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "Code expired. Please request a new one.",
  otp_invalid: "Invalid code. Please check and try again.",
  too_many_requests: "Too many attempts. Please wait a few minutes before trying again.",
  email_not_confirmed: "Email verification failed. Please try again.",
  email_send_failed: "Failed to send email. Please check your email address.",
  invalid_email: "Please enter a valid email address.",
  user_already_registered: "This email is already registered. Please sign in.",
  over_email_send_rate_limit: "Too many emails sent. Please wait a few minutes before requesting a new code.",
  email_rate_limit_exceeded: "Email rate limit reached. Please try again in a few minutes.",
};

/**
 * Gets a user-friendly error message from a Supabase error
 */
export const getOTPErrorMessage = (error: any): string => {
  const code = error?.code || error?.message;
  const message = error?.message || "";
  
  // Check for rate limit errors
  if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many")) {
    return "Too many login attempts. Please wait 5-10 minutes before trying again.";
  }
  
  return OTP_ERROR_MESSAGES[code] || message || "An error occurred. Please try again.";
};
