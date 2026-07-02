import { Role } from '@prisma/client';

/**
 * Lowercase role strings expected by the frontend.
 * Maps the Prisma enum (ADMIN | USER | OWNER) → lowercase equivalents.
 */
export type RoleString = 'admin' | 'user' | 'owner';

const ROLE_MAP: Record<Role, RoleString> = {
  [Role.ADMIN]: 'admin',
  [Role.USER]: 'user',
  [Role.OWNER]: 'owner',
};

/**
 * Convert a Prisma Role enum value to the lowercase string
 * expected by every API JSON response.
 *
 * Usage:
 *   const serialized = mapRole(user.role); // "admin" | "user" | "owner"
 */
export function mapRole(role: Role): RoleString {
  return ROLE_MAP[role];
}
