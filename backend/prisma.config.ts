import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DATABASE_URL must be set in .env (copy .env.example → .env and fill in your value)
    url: process.env.DATABASE_URL ?? '',
  },
});
