import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Average of an array of numbers, rounded to 2dp. Returns null if empty. */
function avgRating(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

// ─── GET /api/stores ──────────────────────────────────────────────────────────

export async function getStores(req: Request, res: Response): Promise<void> {
  const { search } = req.query as Record<string, string | undefined>;
  const userId = req.user!.userId;

  const stores = await prisma.store.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      ratings: {
        select: { value: true, userId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = stores.map((store) => {
    const allValues = store.ratings.map((r) => r.value);
    const myRatingRecord = store.ratings.find((r) => r.userId === userId);

    return {
      id: store.id,
      name: store.name,
      address: store.address,
      overallRating: avgRating(allValues),
      myRating: myRatingRecord ? myRatingRecord.value : null,
    };
  });

  res.json({ success: true, stores: result });
}
