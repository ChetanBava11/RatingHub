import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { getAuth } from "@/lib/auth";
import { ownerApi, ApiResponseError, type OwnerRatingRow } from "@/lib/api";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Store owner — Store Rating Platform" },
      { name: "description", content: "View ratings your store has received." },
    ],
  }),
  component: OwnerDashboard,
});

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
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

// ─── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

// ─── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  loading: boolean;
}) {
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

// ─── Owner Dashboard ───────────────────────────────────────────────────────────

function OwnerDashboard() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "owner") navigate({ to: "/" });
  }, [auth, navigate]);

  // ── Dashboard data state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store + aggregate fields
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeAddress, setStoreAddress] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number | null>(null);

  // Ratings table rows
  const [ratings, setRatings] = useState<OwnerRatingRow[]>([]);

  // ── Load both endpoints in parallel ───────────────────────────────────────
  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([ownerApi.getStore(), ownerApi.getRatings()])
      .then(([storeRes, ratingsRes]) => {
        // Store details
        if (storeRes.store) {
          setStoreName(storeRes.store.name);
          setStoreAddress(storeRes.store.address);
        } else {
          setStoreName(null);
          setStoreAddress(null);
        }
        setAverageRating(storeRes.averageRating);
        setTotalRatings(storeRes.totalRatings);

        // Ratings rows (already ordered newest-first by backend)
        setRatings(ratingsRes.ratings);
      })
      .catch((err) => {
        if (err instanceof ApiResponseError) {
          setError(err.body.message ?? "Failed to load dashboard.");
        } else {
          setError("Network error — please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Table columns — identical structure to original mock implementation ────
  const cols: Column<OwnerRatingRow>[] = [
    { key: "name", header: "Customer name", sortable: true },
    { key: "email", header: "Customer email", sortable: true },
    { key: "value", header: "Rating given", sortable: true },
  ];

  // ── Derived display values ────────────────────────────────────────────────
  const hasStore = storeName !== null;
  const subtitle = loading
    ? "Loading…"
    : hasStore
      ? storeName!
      : "No store has been assigned to your account.";

  return (
    <PageShell>
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Store owner dashboard</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Btn variant="secondary" onClick={() => navigate({ to: "/update-password" })}>
          Update password
        </Btn>
      </div>

      {/* Top-level error (network / auth failure) */}
      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* "No store assigned" banner — shown only when fully loaded and no store */}
      {!loading && !error && !hasStore && (
        <div className="mb-6 rounded-md border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
          No store has been assigned to your account. Please contact an administrator.
        </div>
      )}

      {/* Summary cards — same 3-column grid as original */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Average rating"
          loading={loading}
          value={averageRating == null ? "—" : averageRating.toFixed(2)}
        />
        <StatCard
          label="Total ratings"
          loading={loading}
          value={totalRatings ?? "—"}
        />
        <Card>
          <div className="text-sm text-muted-foreground">Store address</div>
          {loading ? (
            <Skeleton className="mt-2 h-5 w-3/4" />
          ) : (
            <div className="mt-2 text-sm text-foreground">{storeAddress ?? "—"}</div>
          )}
        </Card>
      </div>

      {/* Ratings table */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Users who rated your store
        </h2>
        {loading ? (
          <TableSkeleton cols={3} />
        ) : (
          <DataTable
            columns={cols}
            data={ratings}
            emptyText={
              hasStore
                ? "No ratings have been submitted yet."
                : "No ratings — your store has not been assigned yet."
            }
          />
        )}
      </Card>
    </PageShell>
  );
}
