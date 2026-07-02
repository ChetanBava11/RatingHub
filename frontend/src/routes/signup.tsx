import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card } from "@/components/ui-kit/Btn";
import { TextField, TextArea } from "@/components/ui-kit/Field";
import { validateAddress, validateEmail, validateName, validatePassword } from "@/lib/validation";
import { loadDB, saveDB } from "@/lib/mock";
import { setAuth, roleHome } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Store Rating Platform" },
      { name: "description", content: "Register as a normal user to rate stores on the platform." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", address: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      address: validateAddress(form.address),
      password: validatePassword(form.password),
    };
    setErrors(e);
    return Object.values(e).every((v) => v == null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      // await fetch("/api/auth/signup", { method: "POST", body: JSON.stringify(form) });
      const db = loadDB();
      if (db.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
        setSubmitError("An account with that email already exists.");
        return;
      }
      const id = "u_" + Math.random().toString(36).slice(2, 8);
      db.users.push({ id, ...form, role: "user" });
      saveDB(db);
      const token = "mock." + btoa(id + ":user");
      setAuth(token, { id, name: form.name, email: form.email, role: "user" });
      navigate({ to: roleHome("user") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Normal user registration.</p>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <TextField
            label="Full name"
            value={form.name}
            onChange={set("name")}
            error={errors.name}
            hint="20–60 characters"
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
          />
          <TextArea
            label="Address"
            value={form.address}
            onChange={set("address")}
            rows={3}
            error={errors.address}
            hint="Max 400 characters"
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            hint="8–16 chars, at least one uppercase and one special character"
          />
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <Btn type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Btn>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
