import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Average of an array of numbers, rounded to 2dp. Returns null if empty. */
function avgRating(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

// ─── GET /api/owner/store ─────────────────────────────────────────────────────

export async function getOwnerStore(req: Request, res: Response): Promise<void> {
  const ownerId = req.user!.userId;

  const store = await prisma.store.findFirst({
    where: { ownerId },
    include: {
      ratings: { select: { value: true } },
    },
  });

  if (!store) {
    res.json({ success: true, store: null, averageRating: null, totalRatings: null });
    return;
  }

  const values = store.ratings.map((r) => r.value);

  res.json({
    success: true,
    store: {
      id: store.id,
      name: store.name,
      address: store.address,
    },
    averageRating: avgRating(values),
    totalRatings: values.length,
  });
}

// ─── GET /api/owner/ratings ───────────────────────────────────────────────────

export async function getOwnerRatings(req: Request, res: Response): Promise<void> {
  const ownerId = req.user!.userId;

  // Find this owner's store
  const store = await prisma.store.findFirst({ where: { ownerId } });

  if (!store) {
    res.json({ success: true, ratings: [] });
    return;
  }

  const ratings = await prisma.rating.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  const result = ratings.map((r) => ({
    name: r.user.name,
    email: r.user.email,
    value: r.value,
  }));

  res.json({ success: true, ratings: result });
}
