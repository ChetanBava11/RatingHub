import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField, SelectField, TextArea } from "@/components/ui-kit/Field";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { Modal } from "@/components/ui-kit/Modal";
import { getAuth } from "@/lib/auth";
import {
  adminApi,
  ApiResponseError,
  type AdminUser,
  type AdminUserDetail,
  type AdminStore,
} from "@/lib/api";
import { validateAddress, validateEmail, validateName, validatePassword } from "@/lib/validation";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Store Rating Platform" },
      { name: "description", content: "Administer users, stores, and ratings." },
    ],
  }),
  component: AdminPage,
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card>
      <div className="text-sm text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-20" />
      ) : (
        <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
      )}
    </Card>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    owner: "bg-amber-100 text-amber-800",
    user: "bg-muted text-foreground",
  };
  const label = role === "user" ? "Normal user" : role === "owner" ? "Store owner" : "Admin";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[role] ?? ""}`}>{label}</span>;
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 text-foreground">{value}</div>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

// ─── Table skeleton rows ──────────────────────────────────────────────────────

function TableSkeleton({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({
  open,
  onClose,
  stores,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  stores: AdminStore[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
    role: "user",
    storeId: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm({ name: "", email: "", address: "", password: "", role: "user", storeId: "" });
    setFieldErrors({});
    setServerError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Frontend validation (mirrors backend rules — gives instant feedback)
    const errs: Record<string, string | null> = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      address: validateAddress(form.address),
      password: validatePassword(form.password),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some((v) => v)) return;

    setLoading(true);
    try {
      await adminApi.createUser({
        name: form.name,
        email: form.email,
        address: form.address,
        password: form.password,
        role: form.role,
        storeId: form.role === "owner" && form.storeId ? form.storeId : undefined,
      });
      reset();
      onCreated();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.body.errors) {
          // Field-level errors from backend — display them exactly
          setFieldErrors(err.body.errors as Record<string, string>);
        } else {
          setServerError(err.body.message ?? "Failed to create user.");
        }
      } else {
        setServerError("Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add new user">
      <form onSubmit={submit} className="space-y-3" noValidate>
        {serverError && <ErrorBanner message={serverError} />}
        <TextField
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={fieldErrors.name}
          hint="20–60 characters"
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErrors.email}
        />
        <TextArea
          label="Address"
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          error={fieldErrors.address}
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={fieldErrors.password}
          hint="8–16 chars, uppercase + special"
        />
        <SelectField
          label="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          error={fieldErrors.role}
        >
          <option value="admin">Admin</option>
          <option value="user">Normal user</option>
          <option value="owner">Store owner</option>
        </SelectField>
        {form.role === "owner" && (
          <SelectField
            label="Assign store"
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
            hint="Optional — you can assign later."
          >
            <option value="">Unassigned</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}
        <div className="flex justify-end gap-2 pt-3">
          <Btn type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create user"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Store Modal ──────────────────────────────────────────────────────────

function AddStoreModal({
  open,
  onClose,
  owners,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  owners: AdminUser[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", address: "", ownerId: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm({ name: "", email: "", address: "", ownerId: "" });
    setFieldErrors({});
    setServerError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errs: Record<string, string | null> = {
      name: form.name.trim() ? null : "Store name is required.",
      email: validateEmail(form.email),
      address: validateAddress(form.address),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some((v) => v)) return;

    setLoading(true);
    try {
      await adminApi.createStore({
        name: form.name,
        email: form.email,
        address: form.address,
        ownerId: form.ownerId || undefined,
      });
      reset();
      onCreated();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.body.errors) {
          setFieldErrors(err.body.errors as Record<string, string>);
        } else {
          setServerError(err.body.message ?? "Failed to create store.");
        }
      } else {
        setServerError("Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add new store">
      <form onSubmit={submit} className="space-y-3" noValidate>
        {serverError && <ErrorBanner message={serverError} />}
        <TextField
          label="Store name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={fieldErrors.name}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErrors.email}
        />
        <TextArea
          label="Address"
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          error={fieldErrors.address}
        />
        <SelectField
          label="Store owner"
          value={form.ownerId}
          onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
          hint="Pick an existing store owner (optional)."
        >
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} — {o.email}
            </option>
          ))}
        </SelectField>
        <div className="flex justify-end gap-2 pt-3">
          <Btn type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create store"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .getUserById(userId)
      .then((res) => setUser(res.user))
      .catch((err) => {
        if (err instanceof ApiResponseError && err.status === 404) {
          setError("User not found.");
        } else if (err instanceof ApiResponseError) {
          setError(err.body.message ?? "Failed to load user.");
        } else {
          setError("Network error — please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Modal open={!!userId} onClose={onClose} title="User details">
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <Skeleton className="h-4 w-full" />
              <div className="col-span-2">
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && error && <ErrorBanner message={error} />}
      {!loading && user && (
        <div className="space-y-3 text-sm">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Address" value={user.address} />
          <Row label="Role" value={<RoleBadge role={user.role} />} />
          {user.role === "owner" && (
            <>
              <Row
                label="Store"
                value={
                  user.storeName ?? (
                    <span className="text-muted-foreground">Unassigned</span>
                  )
                }
              />
              <Row
                label="Store rating"
                value={
                  user.rating == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    user.rating.toFixed(2)
                  )
                }
              />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

function AdminPage() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "admin") navigate({ to: "/" });
  }, [auth, navigate]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    setStatsError(null);
    adminApi
      .getStats()
      .then((res) =>
        setStats({
          totalUsers: res.totalUsers,
          totalStores: res.totalStores,
          totalRatings: res.totalRatings,
        }),
      )
      .catch((err) => {
        if (err instanceof ApiResponseError) {
          setStatsError(err.body.message ?? "Failed to load stats.");
        } else {
          setStatsError("Network error — please try again.");
        }
      })
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState({ name: "", email: "", address: "", role: "" });

  // Debounce: send request 400ms after the user stops typing
  const [userFilterDebounced, setUserFilterDebounced] = useState(userFilter);
  useEffect(() => {
    const t = setTimeout(() => setUserFilterDebounced(userFilter), 400);
    return () => clearTimeout(t);
  }, [userFilter]);

  const loadUsers = useCallback((query: typeof userFilterDebounced) => {
    setUsersLoading(true);
    setUsersError(null);
    adminApi
      .getUsers({
        name: query.name || undefined,
        email: query.email || undefined,
        address: query.address || undefined,
        role: query.role || undefined,
      })
      .then((res) => setUsers(res.users))
      .catch((err) => {
        if (err instanceof ApiResponseError) {
          setUsersError(err.body.message ?? "Failed to load users.");
        } else {
          setUsersError("Network error — please try again.");
        }
      })
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    loadUsers(userFilterDebounced);
  }, [userFilterDebounced, loadUsers]);

  // ── Stores ─────────────────────────────────────────────────────────────────
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState({ name: "", email: "", address: "" });

  const [storeFilterDebounced, setStoreFilterDebounced] = useState(storeFilter);
  useEffect(() => {
    const t = setTimeout(() => setStoreFilterDebounced(storeFilter), 400);
    return () => clearTimeout(t);
  }, [storeFilter]);

  const loadStores = useCallback((query: typeof storeFilterDebounced) => {
    setStoresLoading(true);
    setStoresError(null);
    adminApi
      .getStores({
        name: query.name || undefined,
        email: query.email || undefined,
        address: query.address || undefined,
      })
      .then((res) => setStores(res.stores))
      .catch((err) => {
        if (err instanceof ApiResponseError) {
          setStoresError(err.body.message ?? "Failed to load stores.");
        } else {
          setStoresError("Network error — please try again.");
        }
      })
      .finally(() => setStoresLoading(false));
  }, []);

  useEffect(() => {
    loadStores(storeFilterDebounced);
  }, [storeFilterDebounced, loadStores]);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [openUser, setOpenUser] = useState(false);
  const [openStore, setOpenStore] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Owners list for AddStoreModal (filter from already-loaded users)
  const ownerUsers = users.filter((u) => u.role === "owner");

  // ── Table columns ──────────────────────────────────────────────────────────
  const storeCols: Column<AdminStore>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "address", header: "Address", sortable: true },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      sortValue: (s) => s.rating ?? -1,
      render: (s) =>
        s.rating == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          s.rating.toFixed(2)
        ),
    },
  ];

  const userCols: Column<AdminUser>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "address", header: "Address", sortable: true },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
  ];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage users, stores, and monitor ratings.</p>
      </div>

      {/* Stats */}
      {statsError && (
        <div className="mb-6">
          <ErrorBanner message={statsError} />
        </div>
      )}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={stats.totalUsers} loading={statsLoading} />
        <StatCard label="Total stores" value={stats.totalStores} loading={statsLoading} />
        <StatCard label="Total ratings submitted" value={stats.totalRatings} loading={statsLoading} />
      </div>

      {/* Stores */}
      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Stores</h2>
          <Btn onClick={() => setOpenStore(true)}>Add new store</Btn>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by name"
            value={storeFilter.name}
            onChange={(e) => setStoreFilter({ ...storeFilter, name: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by email"
            value={storeFilter.email}
            onChange={(e) => setStoreFilter({ ...storeFilter, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by address"
            value={storeFilter.address}
            onChange={(e) => setStoreFilter({ ...storeFilter, address: e.target.value })}
          />
        </div>
        {storesError && (
          <div className="mb-3">
            <ErrorBanner message={storesError} />
          </div>
        )}
        {storesLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <DataTable
            columns={storeCols}
            data={stores}
            emptyText="No stores found. Add one to get started."
          />
        )}
      </Card>

      {/* Users */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          <Btn onClick={() => setOpenUser(true)}>Add new user</Btn>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by name"
            value={userFilter.name}
            onChange={(e) => setUserFilter({ ...userFilter, name: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by email"
            value={userFilter.email}
            onChange={(e) => setUserFilter({ ...userFilter, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by address"
            value={userFilter.address}
            onChange={(e) => setUserFilter({ ...userFilter, address: e.target.value })}
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={userFilter.role}
            onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">Normal user</option>
            <option value="owner">Store owner</option>
          </select>
        </div>
        {usersError && (
          <div className="mb-3">
            <ErrorBanner message={usersError} />
          </div>
        )}
        {usersLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <DataTable
            columns={userCols}
            data={users}
            onRowClick={(u) => setDetailUserId(u.id)}
            emptyText="No users found."
          />
        )}
      </Card>

      {/* Modals */}
      <AddUserModal
        open={openUser}
        onClose={() => setOpenUser(false)}
        stores={stores}
        onCreated={() => {
          setOpenUser(false);
          loadStats();
          loadUsers(userFilterDebounced);
        }}
      />

      <AddStoreModal
        open={openStore}
        onClose={() => setOpenStore(false)}
        owners={ownerUsers}
        onCreated={() => {
          setOpenStore(false);
          loadStats();
          loadStores(storeFilterDebounced);
        }}
      />

      <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
    </PageShell>
  );
}
