import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { mapRole } from '../lib/roleMapper';
import { hashPassword } from '../lib/bcrypt';
import {
  validateName,
  validateEmail,
  validateAddress,
  validatePassword,
} from '../lib/validation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map lowercase role string from request body → Prisma Role enum */
const STRING_TO_ROLE: Record<string, Role> = {
  admin: Role.ADMIN,
  user: Role.USER,
  owner: Role.OWNER,
};

/** Compute average rating from an array of values, rounded to 2dp. Returns null if empty. */
function avgRating(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

// ─── 1. GET /api/admin/stats ──────────────────────────────────────────────────

export async function getStats(_req: Request, res: Response): Promise<void> {
  const [totalUsers, totalStores, totalRatings] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.rating.count(),
  ]);

  res.json({ success: true, totalUsers, totalStores, totalRatings });
}

// ─── 2. GET /api/admin/stores ─────────────────────────────────────────────────

const STORE_SORT_FIELDS = ['name', 'email', 'address', 'createdAt'] as const;
type StoreSortField = (typeof STORE_SORT_FIELDS)[number];

export async function getStores(req: Request, res: Response): Promise<void> {
  const { name, email, address, sortBy, order } = req.query as Record<string, string | undefined>;

  const sortField: StoreSortField = STORE_SORT_FIELDS.includes(sortBy as StoreSortField)
    ? (sortBy as StoreSortField)
    : 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  const stores = await prisma.store.findMany({
    where: {
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
      ...(address && { address: { contains: address, mode: 'insensitive' } }),
    },
    orderBy: { [sortField]: sortOrder },
    include: {
      ratings: { select: { value: true } },
    },
  });

  const result = stores.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    address: s.address,
    rating: avgRating(s.ratings.map((r) => r.value)),
  }));

  res.json({ success: true, stores: result });
}

// ─── 3. GET /api/admin/users ──────────────────────────────────────────────────

const USER_SORT_FIELDS = ['name', 'email', 'address', 'role', 'createdAt'] as const;
type UserSortField = (typeof USER_SORT_FIELDS)[number];

export async function getUsers(req: Request, res: Response): Promise<void> {
  const { name, email, address, role, sortBy, order } = req.query as Record<string, string | undefined>;

  const sortField: UserSortField = USER_SORT_FIELDS.includes(sortBy as UserSortField)
    ? (sortBy as UserSortField)
    : 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  // Map the optional role filter string to Prisma enum (ignore invalid values)
  const roleFilter: Role | undefined =
    role && STRING_TO_ROLE[role.toLowerCase()] ? STRING_TO_ROLE[role.toLowerCase()] : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
      ...(address && { address: { contains: address, mode: 'insensitive' } }),
      ...(roleFilter !== undefined && { role: roleFilter }),
    },
    orderBy: { [sortField]: sortOrder },
    // Never select password
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      role: true,
    },
  });

  const result = users.map((u) => ({ ...u, role: mapRole(u.role) }));
  res.json({ success: true, users: result });
}

// ─── 4. GET /api/admin/users/:id ─────────────────────────────────────────────

export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      role: true,
      storeId: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  let storeName: string | null = null;
  let rating: number | null = null;

  // Fetch store details only when the user is an OWNER with a storeId
  if (user.role === Role.OWNER && user.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      include: { ratings: { select: { value: true } } },
    });
    if (store) {
      storeName = store.name;
      rating = avgRating(store.ratings.map((r) => r.value));
    }
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      role: mapRole(user.role),
      storeId: user.storeId ?? null,
      storeName,
      rating,
    },
  });
}

// ─── 5. POST /api/admin/users ─────────────────────────────────────────────────

export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, address, password, role: roleInput, storeId } = req.body as {
    name?: string;
    email?: string;
    address?: string;
    password?: string;
    role?: string;
    storeId?: string;
  };

  // Collect field-level validation errors using existing validators
  const errors: Record<string, string> = {};

  const nameErr = validateName(String(name ?? ''));
  if (nameErr) errors.name = nameErr;

  const emailErr = validateEmail(String(email ?? ''));
  if (emailErr) errors.email = emailErr;

  const addressErr = validateAddress(String(address ?? ''));
  if (addressErr) errors.address = addressErr;

  const passwordErr = validatePassword(String(password ?? ''));
  if (passwordErr) errors.password = passwordErr;

  // Role must be one of the accepted lowercase strings — never trust raw input
  const normalizedRole = roleInput?.toLowerCase();
  if (!normalizedRole || !STRING_TO_ROLE[normalizedRole]) {
    errors.role = 'Role must be one of: admin, user, owner.';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ success: false, errors });
    return;
  }

  const prismaRole = STRING_TO_ROLE[normalizedRole!];
  const normalizedEmail = email!.trim().toLowerCase();

  // Duplicate email check
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    res.status(400).json({ success: false, message: 'An account with that email already exists.' });
    return;
  }

  const hashedPw = await hashPassword(password!);

  // If creating an owner with a storeId, link them atomically
  if (prismaRole === Role.OWNER && storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(400).json({ success: false, message: 'Store not found.' });
      return;
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name!.trim(),
          email: normalizedEmail,
          address: address!.trim(),
          password: hashedPw,
          role: prismaRole,
          storeId,
        },
      });
      // Sync store.ownerId to point at the new user
      await tx.store.update({ where: { id: storeId }, data: { ownerId: newUser.id } });
      return newUser;
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: mapRole(user.role),
        storeId: user.storeId ?? null,
      },
    });
    return;
  }

  // Standard create (no store linking)
  const user = await prisma.user.create({
    data: {
      name: name!.trim(),
      email: normalizedEmail,
      address: address!.trim(),
      password: hashedPw,
      role: prismaRole,
    },
  });

  res.status(201).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      role: mapRole(user.role),
      storeId: user.storeId ?? null,
    },
  });
}

// ─── 6. POST /api/admin/stores ────────────────────────────────────────────────

export async function createStore(req: Request, res: Response): Promise<void> {
  const { name, email, address, ownerId } = req.body as {
    name?: string;
    email?: string;
    address?: string;
    ownerId?: string;
  };

  const errors: Record<string, string> = {};

  if (!name || name.trim().length === 0) {
    errors.name = 'Store name is required.';
  }

  const emailErr = validateEmail(String(email ?? ''));
  if (emailErr) errors.email = emailErr;

  const addressErr = validateAddress(String(address ?? ''));
  if (addressErr) errors.address = addressErr;

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ success: false, errors });
    return;
  }

  // If ownerId supplied, link atomically so both records stay consistent
  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      res.status(400).json({ success: false, message: 'Owner user not found.' });
      return;
    }

    const store = await prisma.$transaction(async (tx) => {
      const newStore = await tx.store.create({
        data: {
          name: name!.trim(),
          email: email!.trim().toLowerCase(),
          address: address!.trim(),
          ownerId,
        },
      });
      // Sync user.storeId so the owner's storeId is always populated
      await tx.user.update({ where: { id: ownerId }, data: { storeId: newStore.id } });
      return newStore;
    });

    res.status(201).json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        ownerId: store.ownerId ?? null,
      },
    });
    return;
  }

  const store = await prisma.store.create({
    data: {
      name: name!.trim(),
      email: email!.trim().toLowerCase(),
      address: address!.trim(),
    },
  });

  res.status(201).json({
    success: true,
    store: {
      id: store.id,
      name: store.name,
      email: store.email,
      address: store.address,
      ownerId: store.ownerId ?? null,
    },
  });
}
