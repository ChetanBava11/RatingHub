import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { getAuth } from "@/lib/auth";
import { avgRating, loadDB } from "@/lib/mock";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Store owner — Store Rating Platform" },
      { name: "description", content: "View ratings your store has received." },
    ],
  }),
  component: OwnerDashboard,
});

interface Row {
  name: string;
  email: string;
  value: number;
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "owner") navigate({ to: "/" });
  }, [auth, navigate]);

  const db = useMemo(() => loadDB(), []);
  const [store] = useState(() => {
    if (!auth) return null;
    return db.stores.find((s) => s.ownerId === auth.user.id) ?? (auth.user.storeId ? db.stores.find((s) => s.id === auth.user.storeId) : null) ?? null;
  });

  const avg = store ? avgRating(store.id, db) : null;

  const rows: Row[] = useMemo(() => {
    if (!store) return [];
    return db.ratings
      .filter((r) => r.storeId === store.id)
      .map((r) => {
        const u = db.users.find((x) => x.id === r.userId);
        return { name: u?.name ?? "Unknown", email: u?.email ?? "—", value: r.value };
      });
  }, [store, db]);

  const cols: Column<Row>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "value", header: "Rating given", sortable: true },
  ];

  return (
    <PageShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Store owner dashboard</h1>
          <p className="text-sm text-muted-foreground">{store ? store.name : "No store assigned yet."}</p>
        </div>
        <Btn variant="secondary" onClick={() => navigate({ to: "/update-password" })}>
          Update password
        </Btn>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-muted-foreground">Average rating</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {avg == null ? "—" : avg.toFixed(2)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Total ratings</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{rows.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted-foreground">Store address</div>
          <div className="mt-2 text-sm text-foreground">{store?.address ?? "—"}</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Users who rated your store</h2>
        <DataTable columns={cols} data={rows} emptyText="No ratings submitted yet." />
      </Card>
    </PageShell>
  );
}
