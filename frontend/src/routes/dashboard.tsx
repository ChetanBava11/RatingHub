import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { getAuth } from "@/lib/auth";
import { avgRating, loadDB, myRating, saveDB, type MockStore } from "@/lib/mock";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Store Rating Platform" },
      { name: "description", content: "Browse stores and submit your ratings." },
    ],
  }),
  component: UserDashboard,
});

function UserDashboard() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "user") navigate({ to: "/" });
  }, [auth, navigate]);

  const [db, setDB] = useState(() => loadDB());
  const [q, setQ] = useState("");

  const stores = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return db.stores;
    return db.stores.filter(
      (s) => s.name.toLowerCase().includes(term) || s.address.toLowerCase().includes(term),
    );
  }, [db.stores, q]);

  const rate = (storeId: string, value: number) => {
    if (!auth) return;
    const next = loadDB();
    const existing = next.ratings.find((r) => r.userId === auth.user.id && r.storeId === storeId);
    if (existing) existing.value = value;
    else next.ratings.push({ id: "r_" + Math.random().toString(36).slice(2, 8), userId: auth.user.id, storeId, value });
    saveDB(next);
    setDB(next);
  };

  const cols: Column<MockStore>[] = [
    { key: "name", header: "Store name", sortable: true },
    { key: "address", header: "Address", sortable: true },
    {
      key: "overall",
      header: "Overall rating",
      sortable: true,
      sortValue: (s) => avgRating(s.id, db) ?? -1,
      render: (s) => {
        const r = avgRating(s.id, db);
        return r == null ? <span className="text-muted-foreground">—</span> : r.toFixed(2);
      },
    },
    {
      key: "mine",
      header: "My rating",
      sortable: true,
      sortValue: (s) => (auth ? myRating(auth.user.id, s.id, db) ?? -1 : -1),
      render: (s) => {
        const mine = auth ? myRating(auth.user.id, s.id, db) : null;
        return mine == null ? <span className="text-muted-foreground">Not rated</span> : String(mine);
      },
    },
    {
      key: "action",
      header: "Submit / edit",
      render: (s) => {
        const mine = auth ? myRating(auth.user.id, s.id, db) : null;
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={(e) => {
                  e.stopPropagation();
                  rate(s.id, n);
                }}
                className={
                  "h-8 w-8 rounded-md border text-sm font-medium " +
                  (mine === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-muted")
                }
                aria-label={`Rate ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <PageShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Browse stores</h1>
          <p className="text-sm text-muted-foreground">Search stores and submit or edit your rating.</p>
        </div>
        <Btn variant="secondary" onClick={() => navigate({ to: "/update-password" })}>
          Update password
        </Btn>
      </div>

      <Card>
        <div className="mb-4">
          <input
            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Search by store name or address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <DataTable columns={cols} data={stores} />
      </Card>
    </PageShell>
  );
}
