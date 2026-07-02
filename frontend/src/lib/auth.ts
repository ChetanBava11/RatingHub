export type Role = "admin" | "user" | "owner";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId?: string;
}

const KEY = "srp_auth";

export function getAuth(): { token: string; user: AuthUser } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(KEY, JSON.stringify({ token, user }));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function roleHome(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "owner") return "/owner";
  return "/dashboard";
}
