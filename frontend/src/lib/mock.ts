// Placeholder in-memory mock store. Real integration would hit /api/... endpoints.
import type { Role } from "./auth";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  address: string;
  role: Role;
  password: string;
  storeId?: string;
}

export interface MockStore {
  id: string;
  name: string;
  email: string;
  address: string;
  ownerId?: string;
}

export interface MockRating {
  id: string;
  userId: string;
  storeId: string;
  value: number;
}

const LS_KEY = "srp_mock_db";

interface DB {
  users: MockUser[];
  stores: MockStore[];
  ratings: MockRating[];
}

function seed(): DB {
  return {
    users: [
      {
        id: "u_admin",
        name: "System Administrator Account",
        email: "admin@example.com",
        address: "1 Admin Way",
        role: "admin",
        password: "Admin@123",
      },
      {
        id: "u_owner1",
        name: "Olivia Owner Example Account",
        email: "owner@example.com",
        address: "22 Market Street",
        role: "owner",
        password: "Owner@123",
        storeId: "s1",
      },
      {
        id: "u_user1",
        name: "Nathan Normal User Account Name",
        email: "user@example.com",
        address: "88 Residential Road",
        role: "user",
        password: "User@1234",
      },
    ],
    stores: [
      { id: "s1", name: "Corner Coffee House", email: "hello@corner.com", address: "22 Market Street", ownerId: "u_owner1" },
      { id: "s2", name: "Green Grocer Market", email: "info@greengrocer.com", address: "40 Elm Avenue" },
      { id: "s3", name: "Downtown Bookshop", email: "books@downtown.com", address: "5 Library Lane" },
    ],
    ratings: [
      { id: "r1", userId: "u_user1", storeId: "s1", value: 4 },
      { id: "r2", userId: "u_user1", storeId: "s2", value: 5 },
    ],
  };
}

export function loadDB(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

export function avgRating(storeId: string, db = loadDB()): number | null {
  const rs = db.ratings.filter((r) => r.storeId === storeId);
  if (rs.length === 0) return null;
  return rs.reduce((a, b) => a + b.value, 0) / rs.length;
}

export function myRating(userId: string, storeId: string, db = loadDB()): number | null {
  return db.ratings.find((r) => r.userId === userId && r.storeId === storeId)?.value ?? null;
}
