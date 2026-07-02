import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField } from "@/components/ui-kit/Field";
import { getAuth, roleHome } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";
import { authApi, ApiResponseError } from "@/lib/api";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [{ title: "Update password — Store Rating Platform" }],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    if (!auth) navigate({ to: "/" });
  }, [auth, navigate]);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!auth) return;

    // Client-side checks first
    const errs: Record<string, string | null> = {
      next: validatePassword(next),
      confirm: next === confirm ? null : "Passwords do not match.",
    };
    setErrors(errs);
    if (Object.values(errs).some((v) => v)) return;

    setLoading(true);
    try {
      const res = await authApi.changePassword({ current, next });
      setMessage(res.message);
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
    } catch (err) {
      if (err instanceof ApiResponseError) {
        // Backend may return field-level errors or a top-level message
        if (err.body.errors) {
          setErrors((prev) => ({ ...prev, ...err.body.errors }));
        } else {
          // e.g. "Current password is incorrect."
          setErrors((prev) => ({ ...prev, current: err.body.message ?? null }));
        }
      } else {
        setErrors({ current: "Network error — please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Update password</h1>
        {auth && (
          <Btn variant="secondary" onClick={() => navigate({ to: roleHome(auth.user.role) })}>
            Back to dashboard
          </Btn>
        )}
      </div>

      <Card className="max-w-md">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
          <TextField label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} hint="8–16 chars, uppercase + special" />
          <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          {message && <p className="text-sm text-primary">{message}</p>}
          <Btn type="submit" disabled={loading}>{loading ? "Updating…" : "Update password"}</Btn>
        </form>
      </Card>
    </PageShell>
  );
}
