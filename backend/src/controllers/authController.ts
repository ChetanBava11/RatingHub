import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/bcrypt';
import { signToken } from '../lib/jwt';
import { mapRole } from '../lib/roleMapper';
import { validateSignupBody, validatePassword } from '../lib/validation';

// ─── POST /api/auth/signup ─────────────────────────────────────────────────────
export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, address, password } = req.body as {
    name?: string;
    email?: string;
    address?: string;
    password?: string;
  };

  // Field-level validation
  const errors = validateSignupBody({ name, email, address, password });
  if (errors) {
    res.status(400).json({ success: false, errors });
    return;
  }

  // Normalize email
  const normalizedEmail = email!.trim().toLowerCase();

  // Duplicate email check
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    res.status(400).json({
      success: false,
      message: 'An account with that email already exists.',
    });
    return;
  }

  // Always force role = USER — never trust client-supplied role
  const hashedPw = await hashPassword(password!);
  const user = await prisma.user.create({
    data: {
      name: name!.trim(),
      email: normalizedEmail,
      address: address!.trim(),
      password: hashedPw,
      role: Role.USER,
    },
  });

  const token = signToken({ userId: user.id, role: mapRole(user.role), email: user.email });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: mapRole(user.role), // always "user"
    },
  });
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Use a constant-time comparison even on "not found" to prevent timing attacks
  const passwordMatch = user
    ? await comparePassword(password, user.password)
    : false;

  if (!user || !passwordMatch) {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  const roleStr = mapRole(user.role);
  const token = signToken({ userId: user.id, role: roleStr, email: user.email });

  // Include storeId only when the user is an OWNER and has one assigned
  const responseUser: Record<string, unknown> = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleStr,
  };
  if (user.role === Role.OWNER && user.storeId) {
    responseUser.storeId = user.storeId;
  }

  res.json({ success: true, token, user: responseUser });
}

// ─── PUT /api/auth/password (protected) ───────────────────────────────────────
export async function changePassword(req: Request, res: Response): Promise<void> {
  // req.user is set by verifyToken middleware
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }

  const { current, next } = req.body as { current?: string; next?: string };

  if (!current || !next) {
    res.status(400).json({ success: false, message: 'Both current and next passwords are required.' });
    return;
  }

  // Validate new password against rules
  const passwordErr = validatePassword(next);
  if (passwordErr) {
    res.status(400).json({ success: false, errors: { next: passwordErr } });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const currentMatch = await comparePassword(current, user.password);
  if (!currentMatch) {
    res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    return;
  }

  const newHash = await hashPassword(next);
  await prisma.user.update({
    where: { id: userId },
    data: { password: newHash },
  });

  res.json({ success: true, message: 'Password updated successfully.' });
}
