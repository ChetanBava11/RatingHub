import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/Navbar";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField } from "@/components/ui-kit/Field";
import { getAuth, roleHome } from "@/lib/auth";
import { loadDB, saveDB } from "@/lib/mock";
import { validatePassword } from "@/lib/validation";

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!auth) return;
    const db = loadDB();
    const u = db.users.find((x) => x.id === auth.user.id);
    const errs: Record<string, string | null> = {
      current: u && u.password === current ? null : "Current password is incorrect.",
      next: validatePassword(next),
      confirm: next === confirm ? null : "Passwords do not match.",
    };
    setErrors(errs);
    if (Object.values(errs).some((v) => v)) return;
    if (u) {
      u.password = next;
      saveDB(db);
      setMessage("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
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
          <Btn type="submit">Update password</Btn>
        </form>
      </Card>
    </PageShell>
  );
}
