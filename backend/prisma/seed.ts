import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';

  // Idempotent: only create if no ADMIN user exists
  const existing = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (existing) {
    console.log(`[seed] Admin already exists: ${existing.email} — skipping.`);
    return;
  }

  const hashedPassword = await hashPassword('Admin@123');

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator Account', // 28 chars — satisfies 20-60 rule
      email: adminEmail,
      password: hashedPassword,
      address: '1 Admin Way',
      role: Role.ADMIN,
    },
  });

  console.log(`[seed] Created admin user: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
