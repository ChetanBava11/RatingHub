export function validateName(v: string): string | null {
  if (v.length < 20 || v.length > 60) return "Name must be 20–60 characters.";
  return null;
}
export function validateEmail(v: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  return null;
}
export function validateAddress(v: string): string | null {
  if (v.length === 0) return "Address is required.";
  if (v.length > 400) return "Address must be at most 400 characters.";
  return null;
}
export function validatePassword(v: string): string | null {
  if (v.length < 8 || v.length > 16) return "Password must be 8–16 characters.";
  if (!/[A-Z]/.test(v)) return "Password must include an uppercase letter.";
  if (!/[!@#$%^&*(),.?":{}|<>_\-\\/[\]~`+=;']/.test(v)) return "Password must include a special character.";
  return null;
}
