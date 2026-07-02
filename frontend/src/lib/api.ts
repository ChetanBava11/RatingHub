/**
 * Thin API client — no Axios dependency needed.
 *
 * Reads VITE_API_URL from the environment (set in .env).
 * Automatically attaches `Authorization: Bearer <token>` for authenticated requests.
 */

import { getAuth } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "";

interface ApiError {
  /** Top-level error message from the backend */
  message?: string;
  /** Field-level validation errors from the backend */
  errors?: Record<string, string>;
}

export class ApiResponseError extends Error {
  public readonly status: number;
  public readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.message ?? "Request failed");
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authenticated) {
    const auth = getAuth();
    if (auth?.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse JSON regardless of status so we can read error messages
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new ApiResponseError(res.status, data as ApiError);
  }

  return data as T;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export interface SignupPayload {
  name: string;
  email: string;
  address: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "owner";
    storeId?: string;
  };
}

export interface PasswordUpdateResponse {
  message: string;
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    request<AuthResponse>("POST", "/api/auth/signup", payload),

  login: (payload: LoginPayload) =>
    request<AuthResponse>("POST", "/api/auth/login", payload),

  changePassword: (payload: { current: string; next: string }) =>
    request<PasswordUpdateResponse>("PUT", "/api/auth/password", payload, true),
};
