import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField, SelectField, TextArea } from "@/components/ui-kit/Field";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { Modal } from "@/components/ui-kit/Modal";
import { getAuth } from "@/lib/auth";
import { avgRating, loadDB, saveDB, type MockStore, type MockUser } from "@/lib/mock";
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

function AdminPage() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "admin") navigate({ to: "/" });
  }, [auth, navigate]);

  const [db, setDB] = useState(() => loadDB());
  const refresh = () => setDB(loadDB());
  const persist = (next: ReturnType<typeof loadDB>) => {
    saveDB(next);
    setDB(next);
  };

  const totalRatings = db.ratings.length;
  const totalUsers = db.users.length;
  const totalStores = db.stores.length;

  // Store filters
  const [storeFilter, setStoreFilter] = useState({ name: "", email: "", address: "" });
  const storesView = useMemo(
    () =>
      db.stores
        .filter((s) => s.name.toLowerCase().includes(storeFilter.name.toLowerCase()))
        .filter((s) => s.email.toLowerCase().includes(storeFilter.email.toLowerCase()))
        .filter((s) => s.address.toLowerCase().includes(storeFilter.address.toLowerCase())),
    [db.stores, storeFilter],
  );

  // Users filter
  const [userFilter, setUserFilter] = useState({ name: "", email: "", address: "", role: "" });
  const usersView = useMemo(
    () =>
      db.users
        .filter((u) => u.name.toLowerCase().includes(userFilter.name.toLowerCase()))
        .filter((u) => u.email.toLowerCase().includes(userFilter.email.toLowerCase()))
        .filter((u) => u.address.toLowerCase().includes(userFilter.address.toLowerCase()))
        .filter((u) => (userFilter.role ? u.role === userFilter.role : true)),
    [db.users, userFilter],
  );

  const [openUser, setOpenUser] = useState(false);
  const [openStore, setOpenStore] = useState(false);
  const [detailUser, setDetailUser] = useState<MockUser | null>(null);

  const storeCols: Column<MockStore>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "address", header: "Address", sortable: true },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      sortValue: (s) => avgRating(s.id, db) ?? -1,
      render: (s) => {
        const r = avgRating(s.id, db);
        return r == null ? <span className="text-muted-foreground">—</span> : r.toFixed(2);
      },
    },
  ];

  const userCols: Column<MockUser>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "address", header: "Address", sortable: true },
    { key: "role", header: "Role", sortable: true, render: (u) => <RoleBadge role={u.role} /> },
  ];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage users, stores, and monitor ratings.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Total stores" value={totalStores} />
        <StatCard label="Total ratings submitted" value={totalRatings} />
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
            placeholder="Filter by name"
            value={storeFilter.name}
            onChange={(e) => setStoreFilter({ ...storeFilter, name: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Filter by email"
            value={storeFilter.email}
            onChange={(e) => setStoreFilter({ ...storeFilter, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Filter by address"
            value={storeFilter.address}
            onChange={(e) => setStoreFilter({ ...storeFilter, address: e.target.value })}
          />
        </div>
        <DataTable columns={storeCols} data={storesView} />
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
            placeholder="Filter by name"
            value={userFilter.name}
            onChange={(e) => setUserFilter({ ...userFilter, name: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Filter by email"
            value={userFilter.email}
            onChange={(e) => setUserFilter({ ...userFilter, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Filter by address"
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
        <DataTable columns={userCols} data={usersView} onRowClick={(u) => setDetailUser(u)} />
      </Card>

      <AddUserModal
        open={openUser}
        onClose={() => setOpenUser(false)}
        stores={db.stores}
        onCreate={(u) => {
          const next = loadDB();
          next.users.push(u);
          // if store owner assigned to a store, set store.ownerId
          if (u.role === "owner" && u.storeId) {
            const s = next.stores.find((x) => x.id === u.storeId);
            if (s) s.ownerId = u.id;
          }
          persist(next);
          setOpenUser(false);
        }}
      />

      <AddStoreModal
        open={openStore}
        onClose={() => setOpenStore(false)}
        owners={db.users.filter((u) => u.role === "owner")}
        onCreate={(s) => {
          const next = loadDB();
          next.stores.push(s);
          if (s.ownerId) {
            const o = next.users.find((u) => u.id === s.ownerId);
            if (o) o.storeId = s.id;
          }
          persist(next);
          setOpenStore(false);
        }}
      />

      <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} db={db} />
    </PageShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    owner: "bg-amber-100 text-amber-800",
    user: "bg-muted text-foreground",
  };
  const label = role === "user" ? "Normal user" : role === "owner" ? "Store owner" : "Admin";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[role] ?? ""}`}>{label}</span>;
}

function AddUserModal({
  open,
  onClose,
  stores,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  stores: MockStore[];
  onCreate: (u: MockUser) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
    role: "user" as MockUser["role"],
    storeId: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      address: validateAddress(form.address),
      password: validatePassword(form.password),
    };
    setErrors(errs);
    if (Object.values(errs).some((v) => v)) return;
    onCreate({
      id: "u_" + Math.random().toString(36).slice(2, 8),
      name: form.name,
      email: form.email,
      address: form.address,
      password: form.password,
      role: form.role,
      storeId: form.role === "owner" && form.storeId ? form.storeId : undefined,
    });
    setForm({ name: "", email: "", address: "", password: "", role: "user", storeId: "" });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add new user">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} hint="20–60 characters" />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <TextArea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} />
        <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="8–16 chars, uppercase + special" />
        <SelectField label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as MockUser["role"] })}>
          <option value="admin">Admin</option>
          <option value="user">Normal user</option>
          <option value="owner">Store owner</option>
        </SelectField>
        {form.role === "owner" && (
          <SelectField label="Assign store" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} hint="Optional — you can assign later.">
            <option value="">Unassigned</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}
        <div className="flex justify-end gap-2 pt-3">
          <Btn type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit">Create user</Btn>
        </div>
      </form>
    </Modal>
  );
}

function AddStoreModal({
  open,
  onClose,
  owners,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  owners: MockUser[];
  onCreate: (s: MockStore) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", address: "", ownerId: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = {
      name: form.name.trim() ? null : "Store name is required.",
      email: validateEmail(form.email),
      address: validateAddress(form.address),
    };
    setErrors(errs);
    if (Object.values(errs).some((v) => v)) return;
    onCreate({
      id: "s_" + Math.random().toString(36).slice(2, 8),
      name: form.name,
      email: form.email,
      address: form.address,
      ownerId: form.ownerId || undefined,
    });
    setForm({ name: "", email: "", address: "", ownerId: "" });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add new store">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <TextField label="Store name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <TextArea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} />
        <SelectField label="Store owner" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} hint="Pick an existing store owner (optional).">
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} — {o.email}
            </option>
          ))}
        </SelectField>
        <div className="flex justify-end gap-2 pt-3">
          <Btn type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit">Create store</Btn>
        </div>
      </form>
    </Modal>
  );
}

function UserDetailModal({
  user,
  onClose,
  db,
}: {
  user: MockUser | null;
  onClose: () => void;
  db: ReturnType<typeof loadDB>;
}) {
  const rating = user?.role === "owner" && user.storeId ? avgRating(user.storeId, db) : null;
  const store = user?.storeId ? db.stores.find((s) => s.id === user.storeId) : null;
  return (
    <Modal open={!!user} onClose={onClose} title="User details">
      {user && (
        <div className="space-y-3 text-sm">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Address" value={user.address} />
          <Row label="Role" value={<RoleBadge role={user.role} />} />
          {user.role === "owner" && (
            <>
              <Row label="Store" value={store ? store.name : <span className="text-muted-foreground">Unassigned</span>} />
              <Row label="Store rating" value={rating == null ? <span className="text-muted-foreground">—</span> : rating.toFixed(2)} />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 text-foreground">{value}</div>
    </div>
  );
}
