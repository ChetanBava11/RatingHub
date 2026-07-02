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

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalStores: number;
  totalRatings: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  address: string;
  role: "admin" | "user" | "owner";
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  address: string;
  role: "admin" | "user" | "owner";
  storeId: string | null;
  storeName: string | null;
  rating: number | null;
}

export interface AdminStore {
  id: string;
  name: string;
  email: string;
  address: string;
  rating: number | null;
}

export interface AdminUsersQuery {
  name?: string;
  email?: string;
  address?: string;
  role?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface AdminStoresQuery {
  name?: string;
  email?: string;
  address?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface CreateUserPayload {
  name: string;
  email: string;
  address: string;
  password: string;
  role: string;
  storeId?: string;
}

export interface CreateStorePayload {
  name: string;
  email: string;
  address: string;
  ownerId?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

export const adminApi = {
  getStats: () =>
    request<{ success: true } & AdminStats>("GET", "/api/admin/stats", undefined, true),

  getUsers: (query: AdminUsersQuery = {}) =>
    request<{ success: true; users: AdminUser[] }>(
      "GET",
      `/api/admin/users${buildQuery(query as Record<string, string | undefined>)}`,
      undefined,
      true,
    ),

  getUserById: (id: string) =>
    request<{ success: true; user: AdminUserDetail }>(
      "GET",
      `/api/admin/users/${encodeURIComponent(id)}`,
      undefined,
      true,
    ),

  createUser: (payload: CreateUserPayload) =>
    request<{ success: true; user: AdminUser }>(
      "POST",
      "/api/admin/users",
      payload,
      true,
    ),

  getStores: (query: AdminStoresQuery = {}) =>
    request<{ success: true; stores: AdminStore[] }>(
      "GET",
      `/api/admin/stores${buildQuery(query as Record<string, string | undefined>)}`,
      undefined,
      true,
    ),

  createStore: (payload: CreateStorePayload) =>
    request<{ success: true; store: AdminStore }>(
      "POST",
      "/api/admin/stores",
      payload,
      true,
    ),
};

// ─── User (normal user) endpoints ─────────────────────────────────────────────

/** A store row as returned by GET /api/stores */
export interface UserStore {
  id: string;
  name: string;
  address: string;
  /** Overall average rating across all users. null when no ratings exist. */
  overallRating: number | null;
  /** The authenticated user's own rating for this store. null if not yet rated. */
  myRating: number | null;
}

export interface RatingResponse {
  id: string;
  userId: string;
  storeId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export const userApi = {
  /** GET /api/stores — optionally filter by ?search= (name OR address, server-side) */
  getStores: (search?: string) =>
    request<{ success: true; stores: UserStore[] }>(
      "GET",
      `/api/stores${buildQuery({ search })}`,
      undefined,
      true,
    ),

  /** POST /api/ratings — upsert rating for a store (value must be 1–5) */
  submitRating: (storeId: string, value: number) =>
    request<{ success: true; rating: RatingResponse }>(
      "POST",
      "/api/ratings",
      { storeId, value },
      true,
    ),
};

// ─── Owner endpoints ───────────────────────────────────────────────────────────

/** Store details returned by GET /api/owner/store */
export interface OwnerStore {
  id: string;
  name: string;
  address: string;
}

/** A single rating row returned by GET /api/owner/ratings */
export interface OwnerRatingRow {
  name: string;
  email: string;
  value: number;
}

export const ownerApi = {
  /** GET /api/owner/store — returns store info + aggregates for the authenticated owner */
  getStore: () =>
    request<{
      success: true;
      store: OwnerStore | null;
      averageRating: number | null;
      totalRatings: number | null;
    }>("GET", "/api/owner/store", undefined, true),

  /** GET /api/owner/ratings — returns all ratings for the owner's store, newest first */
  getRatings: () =>
    request<{ success: true; ratings: OwnerRatingRow[] }>(
      "GET",
      "/api/owner/ratings",
      undefined,
      true,
    ),
};
