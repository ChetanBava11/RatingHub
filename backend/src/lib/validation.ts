/**
 * Server-side validation rules — mirror the frontend validation exactly.
 * Each validator returns null on success, or an error message string on failure.
 */

/** Name: 20–60 characters */
export function validateName(value: string): string | null {
  if (!value || value.trim().length < 20 || value.trim().length > 60) {
    return 'Name must be between 20 and 60 characters.';
  }
  return null;
}

/** Email: standard format */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(value: string): string | null {
  if (!value || !EMAIL_REGEX.test(value.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

/** Address: 1–400 characters */
export function validateAddress(value: string): string | null {
  if (!value || value.trim().length < 1 || value.trim().length > 400) {
    return 'Address must be between 1 and 400 characters.';
  }
  return null;
}

/**
 * Password: 8–16 chars, at least one uppercase letter,
 * at least one special character from: !@#$%^&*(),.?":{}|<>_-\/[]~`+=;'
 */
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>_\-\/\[\]~`+=;']/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;

export function validatePassword(value: string): string | null {
  if (!value || value.length < 8 || value.length > 16) {
    return 'Password must be between 8 and 16 characters.';
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(value)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!PASSWORD_SPECIAL_REGEX.test(value)) {
    return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>_-\\/[]~`+=;\'​).';
  }
  return null;
}

/** Collect field-level errors for signup body */
export interface SignupValidationErrors {
  name?: string;
  email?: string;
  address?: string;
  password?: string;
}

export function validateSignupBody(body: {
  name?: unknown;
  email?: unknown;
  address?: unknown;
  password?: unknown;
}): SignupValidationErrors | null {
  const errors: SignupValidationErrors = {};

  const nameErr = validateName(String(body.name ?? ''));
  if (nameErr) errors.name = nameErr;

  const emailErr = validateEmail(String(body.email ?? ''));
  if (emailErr) errors.email = emailErr;

  const addressErr = validateAddress(String(body.address ?? ''));
  if (addressErr) errors.address = addressErr;

  const passwordErr = validatePassword(String(body.password ?? ''));
  if (passwordErr) errors.password = passwordErr;

  return Object.keys(errors).length > 0 ? errors : null;
}
