# Clear Ratings Hub — Backend

Express + TypeScript REST API powering the Clear Ratings Hub platform. Stores, users, and ratings are persisted in PostgreSQL via Prisma ORM.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| PostgreSQL | ≥ 14 (or a [Neon](https://neon.tech) serverless database) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running the project.

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (supports Neon pooler URLs) | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret used to sign and verify JWTs — keep this long and random | `change-me-to-a-long-random-string` |
| `PORT` | Port the HTTP server listens on | `3000` |
| `FRONTEND_URL` | Allowed CORS origin (your frontend URL) | `http://localhost:5173` |

---

## Install

```bash
npm install
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Generate the Prisma Client from schema.prisma
npx prisma generate

# 3. Run all pending migrations against the database
npx prisma migrate dev

# 4. Seed the database (creates the initial admin user)
npx prisma db seed

# 5. Start the development server (hot-reload via ts-node-dev)
npm run dev
```

The server starts on `http://localhost:3000` by default.

---

## Production Build

```bash
# Compile TypeScript to JavaScript
npm run build

# Start the compiled server
npm start
```

---

## Database

### Migrations

Prisma tracks every schema change as a migration file inside `prisma/migrations/`.

```bash
# Apply pending migrations (creates new migration if schema changed)
npx prisma migrate dev

# Apply migrations in CI / production (no interactive prompt)
npx prisma migrate deploy
```

### Prisma Studio

A browser-based GUI for inspecting and editing data.

```bash
npx prisma studio
```

### Seed

The seed script (`prisma/seed.ts`) creates the initial admin user if one does not already exist.

Default credentials:
- **Email**: `admin@example.com`
- **Password**: `Admin@123`

> ⚠️ Change the admin password immediately after first login in any non-local environment.

```bash
npx prisma db seed
```

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema (User, Store, Rating, Role enum)
│   ├── migrations/        # Auto-generated migration history
│   └── seed.ts            # Initial admin user seed script
└── src/
    ├── index.ts           # App entry point — CORS, body parsers, route mounting
    ├── controllers/
    │   ├── authController.ts    # signup, login, changePassword
    │   ├── adminController.ts   # stats, stores, users CRUD (admin only)
    │   ├── storeController.ts   # getStores (authenticated)
    │   ├── ratingController.ts  # submitRating (user only)
    │   └── ownerController.ts   # getOwnerStore, getOwnerRatings (owner only)
    ├── middleware/
    │   ├── auth.ts              # authenticate + requireRole() factory
    │   ├── verifyToken.ts       # verifyTokenMiddleware (Bearer JWT check)
    │   └── errorHandler.ts      # Centralized Express error handler
    ├── routes/
    │   ├── auth.ts              # /api/auth/*
    │   ├── admin.ts             # /api/admin/*
    │   ├── stores.ts            # /api/stores
    │   ├── ratings.ts           # /api/ratings
    │   └── owner.ts             # /api/owner/*
    └── lib/
        ├── prisma.ts            # Singleton PrismaClient
        ├── jwt.ts               # signToken / verifyToken
        ├── bcrypt.ts            # hashPassword / comparePassword
        ├── roleMapper.ts        # mapRole() — Prisma enum → lowercase string
        └── validation.ts        # validateName/Email/Address/Password
```

---

## API Reference

All authenticated endpoints require:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/auth/login`.

---

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register a new user (role always `user`) |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |
| `PUT` | `/api/auth/password` | Authenticated | Change own password |

#### POST /api/auth/signup

```json
// Request body
{
  "name": "Jane Elizabeth Doe Smith",
  "email": "jane@example.com",
  "address": "123 Main Street, Springfield",
  "password": "Secret1!"
}

// Response 201
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "user" }
}
```

#### POST /api/auth/login

```json
// Request body
{ "email": "jane@example.com", "password": "Secret1!" }

// Response 200
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "user" }
}
```

#### PUT /api/auth/password

```json
// Request body
{ "current": "Secret1!", "next": "NewPass2@" }

// Response 200
{ "success": true, "message": "Password updated successfully." }
```

---

### Admin Endpoints

All require a valid JWT with role `admin`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Platform totals: users, stores, ratings |
| `GET` | `/api/admin/users` | List all users (filterable, sortable) |
| `GET` | `/api/admin/users/:id` | Get a single user with store/rating detail |
| `POST` | `/api/admin/users` | Create a new user (any role) |
| `GET` | `/api/admin/stores` | List all stores (filterable, sortable) |
| `POST` | `/api/admin/stores` | Create a new store |

#### GET /api/admin/stats

```json
// Response 200
{ "success": true, "totalUsers": 42, "totalStores": 8, "totalRatings": 127 }
```

#### GET /api/admin/users

Query params: `name`, `email`, `address`, `role` (partial match), `sortBy` (`name|email|address|role|createdAt`), `order` (`asc|desc`).

```json
// Response 200
{
  "success": true,
  "users": [
    { "id": "...", "name": "...", "email": "...", "address": "...", "role": "user" }
  ]
}
```

#### GET /api/admin/users/:id

```json
// Response 200
{
  "success": true,
  "user": {
    "id": "...", "name": "...", "email": "...", "address": "...",
    "role": "owner", "storeId": "...", "storeName": "Pizza Palace", "rating": 4.25
  }
}
```

#### POST /api/admin/users

```json
// Request body
{
  "name": "Alice Wonderland Johnson Smith",
  "email": "alice@example.com",
  "address": "789 Oak Blvd, Shelbyville",
  "password": "Secure1!",
  "role": "owner",
  "storeId": "clx1abc123"   // optional — links owner to store atomically
}

// Response 201
{
  "success": true,
  "user": { "id": "...", "name": "...", "email": "...", "address": "...", "role": "owner", "storeId": "..." }
}
```

#### GET /api/admin/stores

Query params: `name`, `email`, `address` (partial match), `sortBy` (`name|email|address|createdAt`), `order` (`asc|desc`).

```json
// Response 200
{
  "success": true,
  "stores": [
    { "id": "...", "name": "...", "email": "...", "address": "...", "rating": 4.25 }
  ]
}
```

#### POST /api/admin/stores

```json
// Request body
{
  "name": "The Coffee Corner",
  "email": "hello@coffeecorner.com",
  "address": "500 Brew Street",
  "ownerId": "clxabc123"   // optional
}

// Response 201
{
  "success": true,
  "store": { "id": "...", "name": "...", "email": "...", "address": "...", "ownerId": "..." }
}
```

---

### User Endpoints

#### GET /api/stores

Any authenticated user. Optional `search` query param (matches name or address).

```json
// Response 200
{
  "success": true,
  "stores": [
    {
      "id": "...", "name": "...", "address": "...",
      "overallRating": 4.25,
      "myRating": 5
    }
  ]
}
```

#### POST /api/ratings

Role `user` only.

```json
// Request body
{ "storeId": "clx1abc123", "value": 4 }

// Response 201
{
  "success": true,
  "rating": {
    "id": "...", "userId": "...", "storeId": "...",
    "value": 4,
    "createdAt": "...", "updatedAt": "..."
  }
}
```

---

### Owner Endpoints

Both require a valid JWT with role `owner`.

#### GET /api/owner/store

```json
// Response 200 — store assigned
{
  "success": true,
  "store": { "id": "...", "name": "...", "address": "..." },
  "averageRating": 4.25,
  "totalRatings": 8
}

// Response 200 — no store assigned
{ "success": true, "store": null, "averageRating": null, "totalRatings": null }
```

#### GET /api/owner/ratings

```json
// Response 200
{
  "success": true,
  "ratings": [
    { "name": "Jane Doe Smith Alice", "email": "jane@example.com", "value": 5 }
  ]
}
```

---

### Health

```
GET /api/health
```

No authentication required.

```json
{ "status": "ok" }
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 20–60 characters |
| `email` | Standard email format |
| `address` | 1–400 characters |
| `password` | 8–16 chars, ≥ 1 uppercase letter, ≥ 1 special character |
| `rating value` | Integer between 1 and 5 |

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Missing or invalid JWT |
| `403` | Valid JWT, insufficient role |
| `404` | Resource not found |
| `500` | Internal server error |
