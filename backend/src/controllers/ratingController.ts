import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// ─── POST /api/ratings ────────────────────────────────────────────────────────

export async function submitRating(req: Request, res: Response): Promise<void> {
  const { storeId, value } = req.body as { storeId?: unknown; value?: unknown };
  const userId = req.user!.userId;

  // Validate value: must be an integer between 1 and 5
  const numValue = Number(value);
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(numValue) ||
    numValue < 1 ||
    numValue > 5
  ) {
    res.status(400).json({
      success: false,
      message: 'value must be an integer between 1 and 5.',
    });
    return;
  }

  // Validate storeId is a non-empty string
  if (!storeId || typeof storeId !== 'string' || storeId.trim().length === 0) {
    res.status(400).json({ success: false, message: 'storeId is required.' });
    return;
  }

  // Verify store exists
  const store = await prisma.store.findUnique({ where: { id: storeId.trim() } });
  if (!store) {
    res.status(404).json({ success: false, message: 'Store not found.' });
    return;
  }

  // Upsert by unique key (userId, storeId)
  const rating = await prisma.rating.upsert({
    where: {
      userId_storeId: { userId, storeId: storeId.trim() },
    },
    update: { value: numValue },
    create: { userId, storeId: storeId.trim(), value: numValue },
  });

  res.status(201).json({
    success: true,
    rating: {
      id: rating.id,
      userId: rating.userId,
      storeId: rating.storeId,
      value: rating.value,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    },
  });
}
