import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { DataTable, type Column } from "@/components/ui-kit/Table";
import { getAuth } from "@/lib/auth";
import { userApi, ApiResponseError, type UserStore } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Store Rating Platform" },
      { name: "description", content: "Browse stores and submit your ratings." },
    ],
  }),
  component: UserDashboard,
});

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

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

// ─── Rating buttons ────────────────────────────────────────────────────────────
// Reused inline from the existing design: 5 numbered buttons, active one
// highlighted in primary colour.  A "submitting" state disables all buttons
// for that row while the request is in flight.

interface RatingButtonsProps {
  storeId: string;
  currentRating: number | null;
  onRate: (storeId: string, value: number) => Promise<void>;
  submitting: boolean;
}

function RatingButtons({ storeId, currentRating, onRate, submitting }: RatingButtonsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={submitting}
          onClick={(e) => {
            e.stopPropagation();
            void onRate(storeId, n);
          }}
          className={
            "h-8 w-8 rounded-md border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 " +
            (currentRating === n
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
}

// ─── User Dashboard ────────────────────────────────────────────────────────────

function UserDashboard() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth || auth.user.role !== "user") navigate({ to: "/" });
  }, [auth, navigate]);

  // ── Store list state ───────────────────────────────────────────────────────
  const [stores, setStores] = useState<UserStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Search state (debounced 400 ms — same pattern as admin page) ──────────
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // ── Per-row rating submission state ───────────────────────────────────────
  // Maps storeId → true while that row's rating POST is in flight
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  // Per-row rating error (shown below the buttons)
  const [ratingError, setRatingError] = useState<Record<string, string>>({});

  // ── Load / search stores ───────────────────────────────────────────────────
  const loadStores = useCallback((search: string) => {
    setLoading(true);
    setListError(null);
    userApi
      .getStores(search || undefined)
      .then((res) => setStores(res.stores))
      .catch((err) => {
        if (err instanceof ApiResponseError) {
          setListError(err.body.message ?? "Failed to load stores.");
        } else {
          setListError("Network error — please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStores(qDebounced);
  }, [qDebounced, loadStores]);

  // ── Submit / update rating ─────────────────────────────────────────────────
  // Optimistic UI: update the local list immediately, roll back on error.
  const handleRate = useCallback(
    async (storeId: string, value: number) => {
      // Clear any previous error for this store
      setRatingError((prev) => ({ ...prev, [storeId]: "" }));
      // Mark this row as submitting
      setSubmitting((prev) => ({ ...prev, [storeId]: true }));

      // Optimistic update
      setStores((prev) =>
        prev.map((s) => {
          if (s.id !== storeId) return s;
          const prevMine = s.myRating;
          const prevOverall = s.overallRating;
          // Recalculate overall optimistically.
          // We don't know the total count, so use a simple approach:
          // if prevMine is null this is a new rating; if not, it's an update.
          // The backend will return the real value on refetch.
          // For immediate feedback we update myRating and keep overallRating as-is
          // (the backend refetch below will correct it).
          return { ...s, myRating: value, _prev: { mine: prevMine, overall: prevOverall } };
        }),
      );

      try {
        await userApi.submitRating(storeId, value);
        // Refetch this store's live data by reloading the full list.
        // This is the simplest way to keep overallRating accurate without
        // duplicating average-calculation logic in the frontend.
        loadStores(qDebounced);
      } catch (err) {
        // Roll back the optimistic update
        setStores((prev) =>
          prev.map((s: UserStore & { _prev?: { mine: number | null; overall: number | null } }) => {
            if (s.id !== storeId) return s;
            const rolled = { ...s, myRating: s._prev?.mine ?? null, overallRating: s._prev?.overall ?? null };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (rolled as any)._prev;
            return rolled;
          }),
        );
        // Show the backend error message exactly
        let msg = "Failed to submit rating.";
        if (err instanceof ApiResponseError) {
          msg = err.body.message ?? msg;
        }
        setRatingError((prev) => ({ ...prev, [storeId]: msg }));
      } finally {
        setSubmitting((prev) => ({ ...prev, [storeId]: false }));
      }
    },
    [qDebounced, loadStores],
  );

  // ── Table columns ──────────────────────────────────────────────────────────
  // Follows the exact same column pattern as the original mock implementation.
  const cols: Column<UserStore>[] = [
    { key: "name", header: "Store name", sortable: true },
    { key: "address", header: "Address", sortable: true },
    {
      key: "overall",
      header: "Overall rating",
      sortable: true,
      sortValue: (s) => s.overallRating ?? -1,
      render: (s) =>
        s.overallRating == null ? (
          <span className="text-muted-foreground">No ratings yet</span>
        ) : (
          s.overallRating.toFixed(2)
        ),
    },
    {
      key: "mine",
      header: "My rating",
      sortable: true,
      sortValue: (s) => s.myRating ?? -1,
      render: (s) =>
        s.myRating == null ? (
          <span className="text-muted-foreground">Not rated</span>
        ) : (
          String(s.myRating)
        ),
    },
    {
      key: "action",
      header: "Submit / edit",
      render: (s) => (
        <div>
          <RatingButtons
            storeId={s.id}
            currentRating={s.myRating}
            onRate={handleRate}
            submitting={!!submitting[s.id]}
          />
          {ratingError[s.id] && (
            <p className="mt-1 text-xs text-destructive">{ratingError[s.id]}</p>
          )}
        </div>
      ),
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

        {listError && (
          <div className="mb-4">
            <ErrorBanner message={listError} />
          </div>
        )}

        {loading ? (
          <TableSkeleton cols={5} />
        ) : (
          <DataTable
            columns={cols}
            data={stores}
            emptyText={
              q.trim()
                ? `No stores found matching "${q.trim()}".`
                : "No stores available yet."
            }
          />
        )}
      </Card>
    </PageShell>
  );
}
