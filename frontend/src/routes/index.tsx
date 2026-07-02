import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField } from "@/components/ui-kit/Field";
import { setAuth, roleHome, getAuth } from "@/lib/auth";
import { authApi, ApiResponseError } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Store Rating Platform" },
      { name: "description", content: "Sign in to the Store Rating Platform to rate stores or manage the platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const existing = typeof window !== "undefined" ? getAuth() : null;
  if (existing) {
    // Already signed in — go home for that role
    setTimeout(() => navigate({ to: roleHome(existing.user.role) }), 0);
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.token, res.user);
      navigate({ to: roleHome(res.user.role) });
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.body.message ?? "Login failed.");
      } else {
        setError("Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Store Rating Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Btn type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Btn>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New user?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Register here
          </Link>
        </p>
        <div className="mt-6 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Demo accounts</div>
          <div>Admin: admin@example.com / Admin@123</div>
          <div>Owner: owner@example.com / Owner@123</div>
          <div>User: user@example.com / User@1234</div>
        </div>
      </Card>
    </div>
  );
}
