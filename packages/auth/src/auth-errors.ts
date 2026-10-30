/**
 * Clerk's refusals in our words. Each call of Clerk's custom flows
 * (`signIn.password`, `signUp.verifications.verifyEmailCode`, a user's
 * `updatePassword`) answers with an error that holds Clerk's code; the
 * screens show `authErrorMessage` of it at the field it is about. A code
 * not listed here shows Clerk's own sentence. Browser-safe.
 */

/** The first refusal of an answer: Clerk's code, its sentence, and what came with it (a lockout's wait). */
export type AuthError = {
  code: string;
  message: string;
  meta: Record<string, unknown>;
};

type ClerkErrorShape = {
  code?: unknown;
  message?: unknown;
  longMessage?: unknown;
  meta?: unknown;
  errors?: unknown;
};

/**
 * The first refusal in whatever Clerk answered: an API error, which holds
 * a list, one of its entries, or a network failure. Null for no error.
 */
export function authErrorOf(error: unknown): AuthError | null {
  if (!error || typeof error !== "object") return null;
  const outer = error as ClerkErrorShape;
  const first = (
    Array.isArray(outer.errors) && outer.errors.length > 0
      ? outer.errors[0]
      : outer
  ) as ClerkErrorShape;
  const text = (value: unknown) =>
    typeof value === "string" && value ? value : null;
  const name = (error as { name?: unknown }).name;
  return {
    code:
      text(first.code) ??
      (name === "ClerkOfflineError" || isNetworkFailure(error)
        ? "network"
        : "unknown"),
    message:
      text(first.longMessage) ??
      text(first.message) ??
      text(outer.message) ??
      "That didn't work. Try again.",
    meta:
      first.meta && typeof first.meta === "object"
        ? (first.meta as Record<string, unknown>)
        : {},
  };
}

function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error as { code?: unknown }).code === "network_error"
  );
}

/** Minutes, rounded up, from a lockout's seconds. */
function minutesOf(seconds: unknown) {
  const value = typeof seconds === "number" ? seconds : 0;
  const minutes = Math.max(1, Math.ceil(value / 60));
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

/** The sentence a screen shows for a refusal. */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "form_password_incorrect":
      return "That password isn't right. Try again, or use “Forgot password?”.";
    case "form_password_pwned":
    case "form_password_compromised":
      return "This password has turned up in a data leak on another site, so it can't be used here any more. Set a new one.";
    case "form_password_length_too_short":
      return "Use at least 8 characters.";
    case "form_password_size_in_bytes_exceeded":
      return "That password is too long.";
    case "form_password_not_strong_enough":
    case "form_password_validation_failed":
      return "Choose a stronger password: longer, and not a common word.";
    case "form_code_incorrect":
      return "That code isn't right. Check it, or send a new one.";
    case "verification_expired":
      return "That code has expired. Send a new one.";
    case "verification_failed":
    case "too_many_attempts":
      return "Too many wrong codes. Send a new one.";
    case "user_locked":
      return `Too many tries. The account is locked for ${minutesOf(
        error.meta.lockout_expires_in_seconds,
      )}; try again then.`;
    case "too_many_requests":
      return "Too many tries in a short time. Wait a minute, then try again.";
    case "form_identifier_exists":
    case "form_email_address_exists":
      return "There's already an account with this email.";
    case "form_param_format_invalid":
    case "form_email_address_invalid":
      return "Enter a valid email address.";
    case "captcha_invalid":
    case "captcha_missing_token":
    case "captcha_unavailable":
      return "We couldn't check that you're not a bot. Reload the page and try again.";
    case "network":
      return "We couldn't reach the server. Check your connection and try again.";
    default:
      return error.message;
  }
}

/** Whether the refusal is about the password the person typed, so it shows at that field. */
export function isPasswordError(error: AuthError) {
  return error.code.startsWith("form_password");
}

/** Whether the refusal is about a code, so it shows at the code's field. */
export function isCodeError(error: AuthError) {
  return [
    "form_code_incorrect",
    "verification_expired",
    "verification_failed",
    "too_many_attempts",
  ].includes(error.code);
}

/** Whether the password was refused for a leak, which only a reset gets past. */
export function isLeakedPassword(error: AuthError) {
  return (
    error.code === "form_password_pwned" ||
    error.code === "form_password_compromised"
  );
}
